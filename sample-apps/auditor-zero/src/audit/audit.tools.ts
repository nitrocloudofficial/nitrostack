import { ToolDecorator as Tool, Widget, ExecutionContext, z } from "@nitrostack/core";
import {
  beginAnalyzeDocuments,
  getAudit,
  getDoc,
  getFindingsForAudit,
  ingestDocument,
  listAudits,
  listDocs,
} from "./engine.js";
import { debugTamperRecord, getDecisionRecord, getLedger, verifyReplayChain } from "./blackbox.js";
import { seedDemoDocuments } from "./demo-docs.js";

/** The dev-only tamper tool must never be reachable in production. */
function tamperAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_TAMPER_DEMO === "true";
}

export class AuditTools {
  @Tool({
    name: "ingest_document",
    description:
      "Ingest a document into Auditor Zero for later analysis. Optionally link it to a previous version via previousDocumentId so it participates in cross-version comparison.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Human-readable document title"),
      docType: z.string().min(1).describe("Document family, e.g. 'policy' — versions of one family share this"),
      version: z.string().min(1).describe("Version label, e.g. 'v1'"),
      accessTier: z.string().min(1).describe("Access tier, e.g. 'tier-1'"),
      content: z.string().min(1).describe("Full document text"),
      previousDocumentId: z.string().uuid().nullish().describe("Id of the prior version, if any"),
    }),
  })
  @Widget('document-ingested')
  async ingestDocument(input: any, ctx: ExecutionContext) {
    if (input.previousDocumentId && !getDoc(input.previousDocumentId)) {
      throw new Error(`Unknown previousDocumentId: ${input.previousDocumentId}`);
    }
    const doc = ingestDocument(input);
    ctx.logger.info("Ingested document", { id: doc.id, title: doc.title });
    return { doc };
  }

  @Tool({
    name: "list_documents",
    description: "List all ingested documents, oldest first.",
    inputSchema: z.object({}),
  })
  @Widget('documents')
  async listDocuments() {
    return { docs: listDocs() };
  }

  @Tool({
    name: "seed_demo_documents",
    description:
      "Ingest the built-in demo document set (a v1/v2/v3 policy lineage plus a contradicting BYOD policy and an unrelated noise policy) and return their ids. One-click demo data.",
    inputSchema: z.object({}),
  })
  @Widget('documents')
  async seedDemoDocuments() {
    const { docs } = seedDemoDocuments();
    return { docs };
  }

  @Tool({
    name: "analyze_document",
    description:
      "Start the full audit pipeline (deterministic numeric + LLM semantic contradiction detection across and within documents, version-lineage disappearance detection, severity/confidence scoring, Black Box sealing). Pass specific document IDs, or omit docIds to audit ALL ingested documents. Returns IMMEDIATELY with the audit in status 'running' — the widget streams progress live, or poll get_audit_result until status is 'complete'.",
    inputSchema: z.object({
      docIds: z
        .array(z.string().uuid())
        .optional()
        .describe("Document ids to audit together. Omit (or leave empty) to audit ALL ingested documents."),
    }),
  })
  @Widget('audit-results')
  async analyzeDocument(input: any, ctx: ExecutionContext) {
    try {
      let autoSeeded = false;
      let ids: string[] = input.docIds?.length ? input.docIds : listDocs().map((d) => d.id);
      // Demo resilience: with no docIds given and an empty store, seed the demo set
      // automatically so a single tool call always produces a full audit.
      if (ids.length === 0) {
        const { docs } = seedDemoDocuments();
        ids = docs.map((d) => d.id);
        autoSeeded = true;
        ctx.logger.info("Store was empty — auto-seeded demo documents", { count: ids.length });
      }
      for (const id of ids) {
        if (!getDoc(id)) throw new Error(`Unknown docId: ${id}`);
      }
      ctx.logger.info("Starting audit", { docCount: ids.length });
      // Fire-and-return: MCP hosts and the widget RPC bridge time out long tool
      // calls, so the pipeline runs in the background while this returns the
      // running audit — the audit-results widget polls get_audit_result live.
      const { audit, done } = beginAnalyzeDocuments(ids);
      done.then(() => {
        const final = getAudit(audit.id);
        ctx.logger.info("Audit finished", { auditId: audit.id, status: final?.status, findings: final?.findingIds.length ?? 0 });
      });
      return { audit, findings: [], autoSeeded };
    } catch (err: any) {
      // Return the REAL reason in the payload (the widget displays it), instead of
      // letting the framework mask it as a generic "Tool execution failed".
      const message = String(err?.message ?? err);
      ctx.logger.error("Audit failed", { error: message });
      return { error: message };
    }
  }

  @Tool({
    name: "get_audit_result",
    description: "Fetch an audit by ID, including its findings and progress.",
    inputSchema: z.object({ auditId: z.string().uuid() }),
  })
  @Widget('audit-results')
  async getAuditResult(input: any) {
    const audit = getAudit(input.auditId);
    if (!audit) throw new Error(`Unknown auditId: ${input.auditId}`);
    return { audit, findings: getFindingsForAudit(audit.id) };
  }

  @Tool({
    name: "list_audits",
    description: "List all audits, most recent first.",
    inputSchema: z.object({}),
  })
  @Widget('audits')
  async listAudits() {
    return { audits: listAudits() };
  }

  @Tool({
    name: "get_decision_trail",
    description:
      "Return the Black Box decision ledger for an audit (optionally scoped to one finding) — every sealed agent step with its input, output, and hash, in chain order. Read-only: shows the receipts without recomputing them.",
    inputSchema: z.object({
      auditId: z.string().uuid(),
      findingId: z.string().uuid().optional(),
    }),
  })
  @Widget('decision-trail')
  async getDecisionTrail(input: any) {
    if (!getAudit(input.auditId)) throw new Error(`Unknown auditId: ${input.auditId}`);
    return { auditId: input.auditId, findingId: input.findingId ?? null, records: getLedger(input.auditId, input.findingId) };
  }

  @Tool({
    name: "verify_replay_chain",
    description:
      "Recompute the keyed HMAC-SHA256 hash chain for an audit (optionally scoped to one finding) from GENESIS forward and verify every stored DecisionRecord's hash matches. Returns verified=false and the breaking record id if any record was tampered with.",
    inputSchema: z.object({
      auditId: z.string().uuid(),
      findingId: z.string().uuid().optional(),
    }),
  })
  @Widget('replay-verify')
  async verifyReplayChain(input: any) {
    if (!getAudit(input.auditId)) throw new Error(`Unknown auditId: ${input.auditId}`);
    return verifyReplayChain(input.auditId, input.findingId);
  }

  @Tool({
    name: "debug_tamper_record",
    description:
      "DEMO ONLY: overwrite a stored decision record's output WITHOUT recomputing its hash, so verify_replay_chain can be shown catching the tamper. Disabled when NODE_ENV=production unless ALLOW_TAMPER_DEMO=true.",
    inputSchema: z.object({
      recordId: z.string().uuid(),
      newOutput: z.any(),
    }),
  })
  @Widget('tamper-debug')
  async debugTamperRecord(input: any) {
    if (!tamperAllowed()) throw new Error("Tamper demo is disabled");
    // Snapshot the record before overwriting so the widget can render a
    // before/after comparison of the tampered payload.
    const before = getDecisionRecord(input.recordId);
    if (!before) throw new Error(`Unknown recordId: ${input.recordId}`);
    const ok = debugTamperRecord(input.recordId, input.newOutput);
    if (!ok) throw new Error(`Unknown recordId: ${input.recordId}`);
    return {
      tampered: true,
      recordId: input.recordId,
      auditId: before.auditId,
      agentName: before.agentName,
      sealedHash: before.hash,
      before: { output: before.output },
      after: { output: input.newOutput },
    };
  }
}
