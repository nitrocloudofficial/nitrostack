/**
 * Build a directed graph from CI pipeline context data.
 *
 * TypeScript port of kassi/graphrag/builder.py, adapted for CI pipelines
 * instead of OpenAPI specs.
 *
 * Nodes: run, job, step, error, file.
 * Edges: HAS_JOB, HAS_STEP, EMITS_ERROR, TOUCHES_FILE.
 *
 * Error nodes are built by deterministic regex pattern-matching on step log
 * tails — same philosophy as kassi's _resolve_ref (no LLM involved).
 */

import { DiGraph } from './digraph.js';

// ─── Input types (raw data from ci-mcp GitHub service methods) ───────────────

export interface GitHubStep {
  name:        string;
  conclusion:  string | null;
  number:      number;
}

export interface GitHubJob {
  id:          number;
  name:        string;
  conclusion:  string | null;
  steps:       GitHubStep[];
}

export interface StepLogSlice {
  job_id:    number;
  step_name: string;
  exit_code: number;
  log_tail:  string;
}

export interface GitHubRunMeta {
  run_id:     number;
  commit_sha: string;
  author:     string;
  status:     string;
  conclusion: string | null;
}

export interface PipelineContextData {
  runMeta:      GitHubRunMeta;
  jobs:         GitHubJob[];
  stepDetails:  StepLogSlice[];
  changedFiles: string[];
}

// ─── Serialised form for to/from dict ────────────────────────────────────────

export interface SerializedGraph {
  nodes: Array<{ id: string } & Record<string, unknown>>;
  edges: Array<{ source: string; target: string } & Record<string, unknown>>;
}

// ─── Error classification rules (port of kassi's _resolve_ref philosophy) ───

interface ErrorRule {
  patterns: RegExp[];
  category: string;
}

const ERROR_RULES: ErrorRule[] = [
  {
    patterns: [/ModuleNotFoundError/, /Cannot find module/, /ImportError/, /Module not found/i],
    category: 'dependency',
  },
  {
    patterns: [/AssertionError/, /\bFAILED\b/, /Test .+ (failed|FAILED)/, /\d+ failing/],
    category: 'test_failure',
  },
  {
    patterns: [/SyntaxError/, /TypeError/, /ReferenceError/, /Unexpected token/],
    category: 'code_error',
  },
  {
    patterns: [/Timeout/, /timed out/i, /ETIMEDOUT/, /ESOCKETTIMEDOUT/],
    category: 'timeout',
  },
  {
    patterns: [/Permission denied/, /EACCES/, /EPERM/],
    category: 'permission',
  },
];

/** Classify an error message into a category using deterministic regexes. */
function classifyError(message: string): string {
  for (const rule of ERROR_RULES) {
    if (rule.patterns.some(p => p.test(message))) return rule.category;
  }
  return 'exit_error';
}

/** Extract error messages from a step's log tail using pattern matching. */
function extractErrors(logTail: string): Array<{ message: string; pattern: string; category: string }> {
  const errors: Array<{ message: string; pattern: string; category: string }> = [];
  const seen = new Set<string>();

  // Match lines that look like errors — mirrors kassi's regex-only parsing
  const errorLineRe = /^.*?(Error|FAILED|error|Exception|exit code [1-9]\d*)[:\s].{3,}$/gm;
  let m: RegExpExecArray | null;
  while ((m = errorLineRe.exec(logTail)) !== null) {
    const message = m[0].trim().slice(0, 200); // cap message length
    if (seen.has(message)) continue;
    seen.add(message);
    const category = classifyError(message);
    const pattern  = m[1] ?? 'error';
    errors.push({ message, pattern, category });
    if (errors.length >= 5) break; // at most 5 errors per step
  }
  return errors;
}

/** Stable hash for deduplicating error nodes across steps. */
function errorHash(message: string): string {
  let h = 0;
  for (let i = 0; i < message.length; i++) {
    h = ((h << 5) - h + message.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).slice(0, 8);
}

// ─── CIPipelineGraph ──────────────────────────────────────────────────────────

/**
 * Deterministic knowledge graph built from a CI pipeline context.
 *
 * Mirrors kassi's OpenAPIGraph but for CI data:
 *   - run nodes   ↔  endpoint nodes
 *   - job nodes   ↔  schema nodes
 *   - step nodes  ↔  property nodes
 *   - error nodes ↔  security/param nodes
 *   - file nodes  ↔  referenced schemas
 */
export class CIPipelineGraph {
  constructor(public readonly graph: DiGraph) {}

  static fromContext(data: PipelineContextData): CIPipelineGraph {
    const G = new DiGraph();

    const { runMeta, jobs, stepDetails, changedFiles } = data;
    const runId = `run:${runMeta.run_id}`;

    // ── Run node ──────────────────────────────────────────────────────────────
    G.addNode(runId, {
      type:       'run',
      status:     runMeta.status,
      conclusion: runMeta.conclusion ?? 'unknown',
      commit_sha: runMeta.commit_sha,
      author:     runMeta.author,
    });

    // ── Build a lookup from job_id → step log slices ─────────────────────────
    const logsByJob = new Map<number, StepLogSlice[]>();
    for (const slice of stepDetails) {
      const list = logsByJob.get(slice.job_id) ?? [];
      list.push(slice);
      logsByJob.set(slice.job_id, list);
    }

    // ── Job nodes + step nodes + error nodes ─────────────────────────────────
    for (const job of jobs) {
      const jobId = `job:${job.id}`;
      G.addNode(jobId, {
        type:       'job',
        name:       job.name,
        conclusion: job.conclusion ?? 'unknown',
      });
      G.addEdge(runId, jobId, { relation: 'HAS_JOB' });

      const jobLogs = logsByJob.get(job.id) ?? [];

      for (const step of job.steps) {
        const stepId = `step:${job.id}:${step.number}`;
        const logSlice = jobLogs.find(s => s.step_name === step.name);
        const exitCode = logSlice?.exit_code ?? (step.conclusion === 'failure' ? 1 : 0);
        const logTail  = logSlice?.log_tail ?? '';

        G.addNode(stepId, {
          type:       'step',
          name:       step.name,
          exit_code:  exitCode,
          conclusion: step.conclusion ?? 'unknown',
          log_tail:   logTail.slice(-500), // keep only last 500 chars for the node
        });
        G.addEdge(jobId, stepId, { relation: 'HAS_STEP' });

        // ── Error nodes (only for failed/errored steps) ─────────────────────
        if (step.conclusion === 'failure' || exitCode !== 0) {
          const extractedErrors = extractErrors(logTail);
          for (const err of extractedErrors) {
            const hash    = errorHash(err.message);
            const errorId = `error:${hash}`;
            G.addNode(errorId, {
              type:      'error',
              message:   err.message,
              pattern:   err.pattern,
              category:  err.category,
              step_name: step.name,
            });
            G.addEdge(stepId, errorId, { relation: 'EMITS_ERROR' });
          }
        }
      }
    }

    // ── File nodes ────────────────────────────────────────────────────────────
    for (const filePath of changedFiles) {
      const fileId = `file:${filePath}`;
      const ext    = filePath.includes('.') ? filePath.split('.').pop()! : '';
      G.addNode(fileId, {
        type:        'file',
        path:        filePath,
        extension:   ext,
        change_type: 'modified',
      });
      G.addEdge(runId, fileId, { relation: 'TOUCHES_FILE' });
    }

    return new CIPipelineGraph(G);
  }

  // ── Serialisation (mirrors OpenAPIGraph.to_dict / from_dict) ───────────────

  toDict(): SerializedGraph {
    const nodes = this.graph.nodesWithData().map(([id, attrs]) => ({ id, ...attrs }));
    const edges = this.graph.nodesWithData().flatMap(([source]) =>
      this.graph.edgesFrom(source).map(({ target, attrs }) => ({ source, target, ...attrs }))
    );
    return { nodes, edges };
  }

  static fromDict(data: SerializedGraph): CIPipelineGraph {
    const G = new DiGraph();
    for (const { id, ...attrs } of data.nodes) G.addNode(id, attrs);
    for (const { source, target, ...attrs } of data.edges) G.addEdge(source, target, attrs);
    return new CIPipelineGraph(G);
  }

  // ── Convenience accessors (mirrors OpenAPIGraph.endpoints / schemas) ────────

  failedStepIds(): string[] {
    return this.graph.nodesByType('step').filter(id => {
      const node = this.graph.getNode(id);
      return node?.['conclusion'] === 'failure' || (node?.['exit_code'] as number) !== 0;
    });
  }

  changedFileIds(): string[] {
    return this.graph.nodesByType('file');
  }

  errorIds(): string[] {
    return this.graph.nodesByType('error');
  }

  stats(): { jobs: number; steps: number; errors: number; files: number; nodes: number; edges: number } {
    return {
      jobs:  this.graph.nodesByType('job').length,
      steps: this.graph.nodesByType('step').length,
      errors: this.graph.nodesByType('error').length,
      files: this.graph.nodesByType('file').length,
      nodes: this.graph.numberOfNodes(),
      edges: this.graph.numberOfEdges(),
    };
  }
}
