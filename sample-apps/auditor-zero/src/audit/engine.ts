import crypto from "node:crypto";
import * as store from "../store.js";
import { completeJSON } from "../llm.js";
import { logDecision } from "./blackbox.js";
import { Audit, Confidence, DetectionMethod, Doc, Finding, Severity } from "./types.js";

const uuid = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Document / audit accessors
// ---------------------------------------------------------------------------

export function ingestDocument(
  doc: Omit<Doc, "id" | "createdAt" | "seq" | "previousDocumentId"> & { previousDocumentId?: string | null }
): Doc {
  const record: Doc = {
    ...doc,
    id: uuid(),
    createdAt: new Date().toISOString(),
    seq: store.nextDocSeq(),
    previousDocumentId: doc.previousDocumentId ?? null,
  };
  store.insertDoc(record);
  return record;
}

export const getDoc = (id: string) => store.getDocById(id);
export const listDocs = () => store.allDocs();
export const getAudit = (id: string) => store.getAuditById(id);
export const listAudits = () => store.allAudits();
export const getFindingsForAudit = (auditId: string) => store.findingsByAudit(auditId);
export const getFinding = (id: string) => store.getFindingById(id);

// ---------------------------------------------------------------------------
// Concurrency + progress helpers
// ---------------------------------------------------------------------------

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Clause extraction (cheap pre-filter — NOT the judgment itself)
// ---------------------------------------------------------------------------

const OBLIGATION_KEYWORDS = /\b(must|shall|required|allowed|permitted|prohibited|not\s+permitted)\b/i;

function extractCandidateClauses(doc: Doc): string[] {
  return doc.content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && OBLIGATION_KEYWORDS.test(s));
}

// ---------------------------------------------------------------------------
// Deterministic numeric-value conflict detection (independent of the LLM)
// ---------------------------------------------------------------------------

type Unit = "usd" | "percent" | "day" | "hour" | "week" | "month" | "year";
interface NumericFact {
  unit: Unit;
  value: number;
  raw: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "for", "in", "on", "at", "by", "with", "is", "are",
  "be", "must", "shall", "not", "no", "any", "all", "this", "that", "which", "within", "per",
  "used", "using", "may", "can", "will", "each", "every", "than", "least", "most", "up", "as",
]);

function extractNumericFacts(clause: string): NumericFact[] {
  const facts: NumericFact[] = [];
  for (const m of clause.matchAll(/\$\s?([\d,]+(?:\.\d+)?)/g)) facts.push({ unit: "usd", value: parseFloat(m[1].replace(/,/g, "")), raw: m[0] });
  for (const m of clause.matchAll(/(\d+(?:\.\d+)?)\s?%/g)) facts.push({ unit: "percent", value: parseFloat(m[1]), raw: m[0] });
  for (const m of clause.matchAll(/(\d+(?:\.\d+)?)\s?(day|hour|week|month|year)s?\b/gi)) {
    facts.push({ unit: m[2].toLowerCase() as Unit, value: parseFloat(m[1]), raw: m[0] });
  }
  return facts;
}

function significantTokens(clause: string): Set<string> {
  return new Set(
    clause.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((t) => t.length > 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
  );
}

function topicOverlap(clauseA: string, clauseB: string): number {
  const a = significantTokens(clauseA);
  const b = significantTokens(clauseB);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

function sharedTopicKey(clauseA: string, clauseB: string): string {
  const b = significantTokens(clauseB);
  return [...significantTokens(clauseA)].filter((t) => b.has(t)).sort().slice(0, 4).join("-");
}

const SEMANTIC_TOPIC_THRESHOLD = 0.12;

interface NumericConflict {
  explanation: string;
  lo: number;
  hi: number;
}

function detectNumericConflict(clauseA: string, clauseB: string): NumericConflict | null {
  if (topicOverlap(clauseA, clauseB) < 0.12) return null;
  const factsA = extractNumericFacts(clauseA);
  const factsB = extractNumericFacts(clauseB);
  for (const fa of factsA) {
    for (const fb of factsB) {
      if (fa.unit === fb.unit && fa.value !== fb.value) {
        return {
          explanation: `Conflicting ${fa.unit} value on the same requirement: one clause states "${fa.raw}" while the other states "${fb.raw}".`,
          lo: Math.min(fa.value, fb.value),
          hi: Math.max(fa.value, fb.value),
        };
      }
    }
  }
  return null;
}

function numbersIn(text: string): number[] {
  return [...new Set((text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))];
}

// ---------------------------------------------------------------------------
// Deduplication registry (per-audit, synchronous reservation)
// ---------------------------------------------------------------------------

const auditSignatures = new Map<string, Set<string>>();

function reserveSignature(auditId: string, sig: string): boolean {
  let set = auditSignatures.get(auditId);
  if (!set) { set = new Set(); auditSignatures.set(auditId, set); }
  if (set.has(sig)) return false;
  set.add(sig);
  return true;
}

const normalizeText = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ---------------------------------------------------------------------------
// ReasoningAgent — severity/confidence scoring (LLM)
// ---------------------------------------------------------------------------

interface ScoreResult {
  severity: Severity;
  confidence: Confidence;
  justification: string;
}

async function scoreFinding(auditId: string, type: string, explanation: string): Promise<ScoreResult> {
  const input = { type, explanation };
  let result: ScoreResult;
  try {
    result = await completeJSON<ScoreResult>(
      `A document audit produced this ${type} finding:\n"${explanation}"\n\n` +
        `Assign a severity (low/medium/high) based on real-world impact if unresolved, and a confidence ` +
        `(low/medium/high) based on how clearly the evidence supports the finding. Return JSON exactly as: ` +
        `{"severity": "...", "confidence": "...", "justification": "one sentence"}`
    );
    // Defend against out-of-vocabulary values from the model.
    if (!["low", "medium", "high"].includes(result.severity)) result.severity = "medium";
    if (!["low", "medium", "high"].includes(result.confidence)) result.confidence = "low";
  } catch (err: any) {
    // Scoring must never sink a finding the detectors already made.
    result = {
      severity: "medium",
      confidence: "low",
      justification: `Automated severity scoring unavailable (${String(err?.message ?? err).slice(0, 80)}); defaulted to medium.`,
    };
  }
  logDecision({ auditId, agentName: "ReasoningAgent", input, output: result });
  return result;
}

interface CompareResult {
  verdict: "consistent" | "contradictory" | "unrelated";
  explanation: string;
}

async function compareClausesSemantic(clauseA: string, clauseB: string): Promise<CompareResult> {
  return completeJSON<CompareResult>(
    `Statement A: "${clauseA}"\nStatement B: "${clauseB}"\n\n` +
      `Are these two policy statements consistent, contradictory, or unrelated? ` +
      `Return JSON exactly as: {"verdict": "consistent"|"contradictory"|"unrelated", "explanation": "one sentence"}`
  );
}

async function persistContradiction(
  auditId: string,
  docIds: string[],
  explanation: string,
  detectionMethod: DetectionMethod,
  signature: string
): Promise<Finding | null> {
  if (!reserveSignature(auditId, signature)) return null;
  const score = await scoreFinding(auditId, "contradiction", explanation);
  const finding: Finding = {
    id: uuid(), auditId, type: "contradiction", docIds, explanation,
    severity: score.severity, confidence: score.confidence, severityJustification: score.justification,
    detectionMethod, createdAt: new Date().toISOString(),
  };
  store.insertFinding(finding);
  return finding;
}

// ---------------------------------------------------------------------------
// ContradictionAgent
// ---------------------------------------------------------------------------

interface ClausePair {
  docA: Doc;
  docB: Doc;
  clauseA: string;
  clauseB: string;
  sameLineage: boolean;
}

function buildContradictionPairs(docs: Doc[]): ClausePair[] {
  const pairs: ClausePair[] = [];
  const clauses = docs.map(extractCandidateClauses);
  for (let i = 0; i < docs.length; i++) {
    for (let j = i; j < docs.length; j++) {
      const sameLineage = i !== j && docs[i].docType === docs[j].docType;
      for (let a = 0; a < clauses[i].length; a++) {
        const startB = i === j ? a + 1 : 0;
        for (let b = startB; b < clauses[j].length; b++) {
          pairs.push({ docA: docs[i], docB: docs[j], clauseA: clauses[i][a], clauseB: clauses[j][b], sameLineage });
        }
      }
    }
  }
  return pairs;
}

async function findContradictions(auditId: string, pairs: ClausePair[]): Promise<Finding[]> {
  const results = await mapWithConcurrency(pairs, 5, async (pair): Promise<Finding | null> => {
    const { docA, docB, clauseA, clauseB, sameLineage } = pair;
    try {
      const numeric = detectNumericConflict(clauseA, clauseB);
      if (numeric) {
        logDecision({
          auditId, agentName: "ContradictionAgent",
          input: { docA: docA.id, docB: docB.id, clauseA, clauseB, detector: "numeric" },
          output: { verdict: "contradictory", explanation: numeric.explanation },
        });
        return await persistContradiction(auditId, [docA.id, docB.id], numeric.explanation, "numeric-value-conflict", `numv:${numeric.lo}:${numeric.hi}`);
      }
      if (sameLineage) return null;
      if (topicOverlap(clauseA, clauseB) < SEMANTIC_TOPIC_THRESHOLD) return null;

      const result = await compareClausesSemantic(clauseA, clauseB);
      logDecision({
        auditId, agentName: "ContradictionAgent",
        input: { docA: docA.id, docB: docB.id, clauseA, clauseB, detector: "semantic" },
        output: result,
      });
      if (result.verdict === "contradictory") {
        const sig = `sem:${[docA.docType, docB.docType].sort().join("|")}:${sharedTopicKey(clauseA, clauseB)}`;
        return await persistContradiction(auditId, [docA.id, docB.id], result.explanation, "semantic-llm", sig);
      }
      return null;
    } catch (err: any) {
      // One failed comparison must never sink the whole audit — skip the pair.
      console.error(`[audit ${auditId}] clause-pair comparison failed, skipping:`, String(err?.message ?? err).slice(0, 160));
      return null;
    } finally {
      store.bumpAuditProgress(auditId);
    }
  });
  return results.filter((f): f is Finding => f !== null);
}

// ---------------------------------------------------------------------------
// DisappearanceAgent — version-lineage diff
// ---------------------------------------------------------------------------

interface VersionDiffResult {
  removed: { obligation: string; explanation: string }[];
  changed: { obligation: string; oldTerm: string; newTerm: string; explanation: string }[];
}

function buildVersionChains(docs: Doc[]): Doc[][] {
  const byType = new Map<string, Doc[]>();
  for (const d of docs) {
    const list = byType.get(d.docType) ?? [];
    list.push(d);
    byType.set(d.docType, list);
  }
  const chains: Doc[][] = [];
  for (const [, versions] of byType) {
    if (versions.length < 2) continue;
    chains.push([...versions].sort((a, b) => a.seq - b.seq));
  }
  return chains;
}

interface VersionPair {
  oldDoc: Doc;
  newDoc: Doc;
}

function buildVersionPairs(docs: Doc[]): VersionPair[] {
  const pairs: VersionPair[] = [];
  for (const chain of buildVersionChains(docs)) {
    for (let k = 1; k < chain.length; k++) pairs.push({ oldDoc: chain[k - 1], newDoc: chain[k] });
  }
  return pairs;
}

async function findDisappearances(auditId: string, versionPairs: VersionPair[]): Promise<Finding[]> {
  const nested = await mapWithConcurrency(versionPairs, 3, async ({ oldDoc, newDoc }): Promise<Finding[]> => {
    const out: Finding[] = [];
    try {
      const input = { oldDoc: oldDoc.id, newDoc: newDoc.id };
      const result = await completeJSON<VersionDiffResult>(
        `OLD document version:\n"""${oldDoc.content}"""\n\nNEW document version:\n"""${newDoc.content}"""\n\n` +
          `Compare the two versions and classify each material difference into exactly one bucket:\n` +
          `- "removed": an obligation, risk factor, or commitment category present in OLD and ENTIRELY ABSENT from NEW (not merely reworded).\n` +
          `- "changed": an obligation still present in NEW but whose terms, thresholds, or strength materially changed. Include the OLD term and the NEW term.\n` +
          `Ignore pure copy-editing. Return JSON exactly as: ` +
          `{"removed": [{"obligation": "...", "explanation": "..."}], "changed": [{"obligation": "...", "oldTerm": "...", "newTerm": "...", "explanation": "..."}]}`
      );
      logDecision({ auditId, agentName: "DisappearanceAgent", input, output: result });

      for (const d of result.removed ?? []) {
        if (!reserveSignature(auditId, `rem:${normalizeText(d.obligation)}`)) continue;
        const score = await scoreFinding(auditId, "disappearance", d.explanation);
        const finding: Finding = {
          id: uuid(), auditId, type: "disappearance", docIds: [oldDoc.id, newDoc.id],
          explanation: `${d.obligation} — ${d.explanation}`,
          severity: score.severity, confidence: score.confidence, severityJustification: score.justification,
          detectionMethod: "category-removed", createdAt: new Date().toISOString(),
        };
        store.insertFinding(finding);
        out.push(finding);
      }

      for (const c of result.changed ?? []) {
        const nums = numbersIn(`${c.oldTerm} ${c.newTerm}`);
        const signature = nums.length >= 2 ? `numv:${Math.min(...nums)}:${Math.max(...nums)}` : `cvs:${normalizeText(c.obligation)}`;
        const explanation = `${c.obligation}: "${c.oldTerm}" → "${c.newTerm}" — ${c.explanation}`;
        const finding = await persistContradiction(auditId, [oldDoc.id, newDoc.id], explanation, "cross-version-semantic", signature);
        if (finding) out.push(finding);
      }
      return out;
    } catch (err: any) {
      // A failed version diff must never sink the whole audit — skip the pair.
      console.error(`[audit ${auditId}] version diff failed, skipping:`, String(err?.message ?? err).slice(0, 160));
      return out;
    } finally {
      store.bumpAuditProgress(auditId);
    }
  });
  return nested.flat();
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/** Runs the detection phases for an already-created audit. Never throws — a
 *  failure is recorded on the audit record (status "failed" + error). */
async function runAuditPipeline(auditId: string, docs: Doc[]): Promise<void> {
  try {
    const contradictionPairs = buildContradictionPairs(docs);
    const versionPairs = buildVersionPairs(docs);
    store.updateAudit(auditId, { progressTotal: contradictionPairs.length + versionPairs.length });

    const contradictions = await findContradictions(auditId, contradictionPairs);
    const disappearances = await findDisappearances(auditId, versionPairs);
    const allFindings = [...contradictions, ...disappearances];

    store.updateAudit(auditId, {
      status: "complete",
      findingIds: allFindings.map((f) => f.id),
      completedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    store.updateAudit(auditId, { status: "failed", error: String(err?.message ?? err) });
  } finally {
    auditSignatures.delete(auditId);
  }
}

/**
 * Creates the audit record and starts the pipeline WITHOUT awaiting it.
 * MCP hosts (and the widget RPC bridge) time out long tool calls, so
 * `analyze_document` returns this running audit immediately and clients poll
 * `get_audit_result` until status is "complete" or "failed".
 */
export function beginAnalyzeDocuments(docIds: string[]): { audit: Audit; done: Promise<void> } {
  const auditId = uuid();
  const audit: Audit = {
    id: auditId, docIds, status: "running", findingIds: [],
    createdAt: new Date().toISOString(), completedAt: null,
    progressDone: 0, progressTotal: 0, error: null,
  };
  store.insertAudit(audit);

  const docs = docIds.map(getDoc).filter((d): d is Doc => d !== null);
  logDecision({
    auditId, agentName: "IngestionAgent",
    input: { docIds },
    output: { ingestedCount: docs.length, titles: docs.map((d) => d.title) },
  });

  return { audit, done: runAuditPipeline(auditId, docs) };
}

/** Blocking variant — awaits the pipeline and returns the finished audit. */
export async function analyzeDocuments(docIds: string[]): Promise<Audit> {
  const { audit, done } = beginAnalyzeDocuments(docIds);
  await done;
  const final = getAudit(audit.id)!;
  if (final.status === "failed") throw new Error(final.error ?? "Audit failed");
  return final;
}
