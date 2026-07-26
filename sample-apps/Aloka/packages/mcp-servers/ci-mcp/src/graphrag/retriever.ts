/**
 * Subgraph retrieval — extract relevant CI failure context from the pipeline graph.
 *
 * TypeScript port of kassi/graphrag/retriever.py, adapted for CI pipelines.
 *
 * BFS from each failed-step node, collecting job → step → error facts.
 * Heuristic file suggestion mirrors kassi's _paths_match: extract module/package
 * names from error messages and match against changed file paths.
 */

import { CIPipelineGraph, PipelineContextData } from './builder.js';

// ─── Output types ─────────────────────────────────────────────────────────────

export interface RunMeta {
  run_id:     number;
  status:     string;
  conclusion: string;
  commit_sha: string;
  author:     string;
}

export interface FailedJob {
  id:         string;
  name:       string;
  conclusion: string;
}

export interface FailedStep {
  id:        string;
  name:      string;
  exit_code: number;
  log_tail:  string;
}

export interface ErrorNode {
  pattern:   string;
  message:   string;
  category:  string;
  step_name: string;
}

/** The full retrieved context — LLM-injectable via toText(). */
export interface CIRetrievedContext {
  runMeta:        RunMeta;
  failedJobs:     FailedJob[];
  failedSteps:    FailedStep[];
  errors:         ErrorNode[];
  changedFiles:   string[];
  suggestedFiles: string[];   // heuristic: errors ↔ files
  toText(): string;
}

// ─── CISubgraphRetriever ──────────────────────────────────────────────────────

export class CISubgraphRetriever {
  constructor(private readonly graph: CIPipelineGraph) {}

  /**
   * BFS from failed-step nodes, collecting all related context.
   * Mirrors SubgraphRetriever.for_endpoints() in kassi.
   */
  forRun(raw: PipelineContextData): CIRetrievedContext {
    const G = this.graph.graph;

    // ── Collect run metadata ─────────────────────────────────────────────────
    const runNodeId = `run:${raw.runMeta.run_id}`;
    const runNode   = G.getNode(runNodeId) ?? {};

    const runMeta: RunMeta = {
      run_id:     raw.runMeta.run_id,
      status:     String(runNode['status']     ?? raw.runMeta.status),
      conclusion: String(runNode['conclusion'] ?? raw.runMeta.conclusion ?? 'unknown'),
      commit_sha: String(runNode['commit_sha'] ?? raw.runMeta.commit_sha),
      author:     String(runNode['author']     ?? raw.runMeta.author),
    };

    // ── Collect failed jobs (BFS: run → jobs) ────────────────────────────────
    const failedJobs: FailedJob[] = [];
    const failedJobIds = new Set<string>();

    for (const { target: jobId, attrs } of G.edgesFrom(runNodeId)) {
      if (attrs['relation'] !== 'HAS_JOB') continue;
      const jobNode = G.getNode(jobId);
      if (!jobNode) continue;
      if (jobNode['conclusion'] === 'failure') {
        failedJobs.push({
          id:         jobId,
          name:       String(jobNode['name'] ?? jobId),
          conclusion: String(jobNode['conclusion']),
        });
        failedJobIds.add(jobId);
      }
    }

    // ── Collect failed steps + errors (BFS: job → steps → errors) ───────────
    const failedSteps: FailedStep[] = [];
    const errors: ErrorNode[]       = [];
    const seenErrors = new Set<string>();

    for (const jobId of failedJobIds) {
      for (const { target: stepId, attrs } of G.edgesFrom(jobId)) {
        if (attrs['relation'] !== 'HAS_STEP') continue;
        const stepNode = G.getNode(stepId);
        if (!stepNode) continue;

        const exitCode = Number(stepNode['exit_code'] ?? 0);
        const conclusion = String(stepNode['conclusion'] ?? 'unknown');

        if (conclusion !== 'failure' && exitCode === 0) continue;

        failedSteps.push({
          id:        stepId,
          name:      String(stepNode['name'] ?? stepId),
          exit_code: exitCode,
          log_tail:  String(stepNode['log_tail'] ?? ''),
        });

        // BFS: step → errors
        for (const { target: errId, attrs: errAttrs } of G.edgesFrom(stepId)) {
          if (errAttrs['relation'] !== 'EMITS_ERROR') continue;
          if (seenErrors.has(errId)) continue;
          seenErrors.add(errId);

          const errNode = G.getNode(errId);
          if (!errNode) continue;
          errors.push({
            pattern:   String(errNode['pattern']   ?? ''),
            message:   String(errNode['message']   ?? ''),
            category:  String(errNode['category']  ?? 'unknown'),
            step_name: String(errNode['step_name'] ?? ''),
          });
        }
      }
    }

    // ── Collect changed files ────────────────────────────────────────────────
    const changedFiles: string[] = [];
    for (const { target: fileId, attrs } of G.edgesFrom(runNodeId)) {
      if (attrs['relation'] !== 'TOUCHES_FILE') continue;
      const fileNode = G.getNode(fileId);
      if (fileNode) changedFiles.push(String(fileNode['path'] ?? fileId.replace('file:', '')));
    }

    // ── Heuristic file suggestion (port of kassi's _paths_match) ────────────
    const suggestedFiles = this.suggestFiles(errors, changedFiles);

    // ── Build and return the context object ───────────────────────────────────
    const ctx: CIRetrievedContext = {
      runMeta,
      failedJobs,
      failedSteps,
      errors,
      changedFiles,
      suggestedFiles,
      toText: () => buildContextText(ctx),
    };
    return ctx;
  }

  /**
   * Heuristic: match error module/package names against changed file paths.
   * Port of kassi's _paths_match + _match_endpoints_in_text logic.
   *
   * Examples:
   *   "Cannot find module 'payment/service'"  → suggests src/payment/service.ts
   *   "ModuleNotFoundError: No module named 'utils'" → suggests utils.py / utils/index.ts
   */
  private suggestFiles(errors: ErrorNode[], changedFiles: string[]): string[] {
    if (!errors.length || !changedFiles.length) return changedFiles.slice(0, 3);

    const candidates = new Set<string>();

    for (const err of errors) {
      // Extract module/package tokens from error messages
      const moduleTokens = extractModuleTokens(err.message);

      for (const token of moduleTokens) {
        for (const filePath of changedFiles) {
          if (fileMatchesToken(filePath, token)) {
            candidates.add(filePath);
          }
        }
      }
    }

    // Fallback: if heuristic matched nothing, return the first 3 changed files
    if (candidates.size === 0) return changedFiles.slice(0, 3);

    // Sort: prefer files that matched more error tokens (implicit via insertion order isn't enough)
    return Array.from(candidates).slice(0, 5);
  }
}

// ─── File suggestion helpers (port of kassi's _paths_match) ──────────────────

/**
 * Extract candidate module/package names from an error message.
 * Handles: "Cannot find module 'foo'", "ModuleNotFoundError: No module named 'bar'"
 */
function extractModuleTokens(message: string): string[] {
  const tokens: string[] = [];

  // JS/TS style: Cannot find module 'foo/bar' or require('foo')
  const jsModuleRe = /(?:Cannot find module|require)\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = jsModuleRe.exec(message)) !== null) {
    tokens.push(...m[1].split('/').filter(t => t && !t.startsWith('@')));
    tokens.push(m[1]); // also try the full path
  }

  // Python style: No module named 'foo.bar'
  const pyModuleRe = /No module named '([^']+)'/g;
  while ((m = pyModuleRe.exec(message)) !== null) {
    tokens.push(...m[1].split('.').filter(Boolean));
  }

  // Generic word extraction from typical error lines (last resort)
  if (!tokens.length) {
    const wordRe = /\b([a-zA-Z][a-zA-Z0-9_-]{2,})\b/g;
    const words: string[] = [];
    while ((m = wordRe.exec(message)) !== null) words.push(m[1]);
    // Only take meaningful words (not common English stop words)
    const stop = new Set(['Error', 'error', 'failed', 'Cannot', 'find', 'expected', 'actual', 'line', 'file']);
    tokens.push(...words.filter(w => !stop.has(w)).slice(0, 3));
  }

  return [...new Set(tokens)];
}

/**
 * Check whether a file path is related to a token.
 * Mirrors kassi's _paths_match segment-by-segment comparison.
 */
function fileMatchesToken(filePath: string, token: string): boolean {
  const lower = filePath.toLowerCase();
  const tok   = token.toLowerCase();

  // Direct substring match (handles 'payment/service' → 'src/payment/service.ts')
  if (lower.includes(tok)) return true;

  // Match just the filename stem (without extension)
  const stem = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  if (stem.toLowerCase() === tok) return true;

  // Match any path segment
  const segments = filePath.split('/').map(s => s.toLowerCase());
  return segments.some(seg => seg === tok || seg.startsWith(tok + '.'));
}

// ─── toText() serialisation (port of RetrievedContext.to_text()) ──────────────

function buildContextText(ctx: CIRetrievedContext): string {
  const lines: string[] = [];

  // Header — mirrors kassi's "## METHOD /path" header
  lines.push(
    `## Run ${ctx.runMeta.run_id} — ${ctx.runMeta.conclusion.toUpperCase()} ` +
    `(${ctx.runMeta.status}, commit ${ctx.runMeta.commit_sha.slice(0, 8)}, ` +
    `author: ${ctx.runMeta.author})`
  );

  // Failed jobs
  if (ctx.failedJobs.length) {
    lines.push('\n### Failed Jobs');
    for (const job of ctx.failedJobs) {
      lines.push(`- ${job.name} (conclusion: ${job.conclusion})`);
    }
  }

  // Failed steps with errors — mirrors kassi's Parameters / Schemas sections
  if (ctx.failedSteps.length) {
    lines.push('\n### Failed Steps');
    for (const step of ctx.failedSteps) {
      lines.push(`  Step: ${step.name} (exit ${step.exit_code})`);
      const stepErrors = ctx.errors.filter(e => e.step_name === step.name);
      for (const err of stepErrors) {
        lines.push(`    Error [${err.category}]: ${err.message.slice(0, 150)}`);
      }
      if (step.log_tail) {
        lines.push(`    Log tail: ${step.log_tail.split('\n').slice(-3).join(' | ').slice(0, 200)}`);
      }
    }
  }

  // Changed files
  if (ctx.changedFiles.length) {
    lines.push('\n### Changed Files');
    for (const f of ctx.changedFiles) lines.push(`  - ${f}`);
  }

  // Suggested files (heuristic graph match)
  if (ctx.suggestedFiles.length) {
    lines.push('\n### Suggested Files to Fix (graph heuristic)');
    for (const f of ctx.suggestedFiles) lines.push(`  - ${f}`);
  }

  return lines.join('\n');
}
