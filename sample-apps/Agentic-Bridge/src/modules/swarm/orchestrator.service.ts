/**
 * The Master Orchestration Model.
 *
 * The seven personas each see one slice of the enterprise. This runs after them
 * and sees all of it — but rather than being handed the whole knowledge base as
 * a wall of context, it is given *tools* and made to go and find what it needs.
 *
 * That is the difference between a summarisation call and orchestration. The
 * orchestrator decides what to interrogate: it can search the knowledge graph,
 * walk the dependency surface of a file it finds suspicious, read the conflict
 * ledger, and open a source file to check a claim before repeating it. Every one
 * of those calls is recorded and surfaced in the swarm console, so what it
 * looked at is as inspectable as what it concluded.
 *
 * Its output is the executive briefing that opens CLAUDE.md — the part a human
 * would have written after reading everything, and the one section of the
 * manifest that is genuinely authored rather than assembled.
 */
import { Injectable } from '@nitrostack/core';
import * as path from 'path';
import { LlmService, describeFailure } from '../../shared/services/llm.service.js';
import type { AgenticResult, LlmFailure, ToolSpec } from '../../shared/services/llm.service.js';
import { KnowledgeSearchService } from '../../shared/services/knowledge-search.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { WorkspaceService } from '../../shared/services/workspace.service.js';
import { CodebaseService } from '../codebase/codebase.service.js';

/** Caps on what a single tool call may return, so the loop cannot blow context. */
const MAX_FILE_CHARS = 6000;
const MAX_RESULT_CHARS = 8000;

const ORCHESTRATOR_SYSTEM = `
You are the Master Orchestrator of a reconnaissance swarm that has just finished
mapping a legacy enterprise codebase. Seven specialist agents each examined one
domain — architecture, dependencies, testing, CI/CD, the sprint, the team's
spoken decisions, and the design system — and committed their findings to a
shared knowledge base.

Your job is editorial, not investigative-from-scratch: produce the briefing that
opens the CLAUDE.md manifest, which every AI coding assistant working in this
repository reads before it does anything.

You have tools. Use them. Do not write the briefing from the first search
result — interrogate the knowledge base the way a staff engineer would on their
first day:

- Search for the things that constrain work: what is frozen, what is mandatory,
  what was rejected, what is in flight.
- When a specific file keeps coming up, walk its change surface and find out
  what depends on it before you describe the risk.
- Check the conflict ledger. A human ruling there overrules everything else in
  the knowledge base, including anything a specialist agent concluded.
- If a claim is important and you can verify it by reading the file, read it.

Then write the briefing. Requirements:

- Markdown. Start directly with prose — no top-level heading, no preamble like
  "Here is the briefing". The document supplies its own heading.
- Lead with what would go wrong. The first paragraph should tell a competent
  engineer the single most important thing they would otherwise get wrong here.
- Follow with a short "Before you change anything" list of hard rules, each one
  specific enough to check against a diff.
- Where a rule comes from a human decision that contradicts the written record,
  say so and say which won. That contradiction is the most valuable thing in
  this document.
- Cite files inline as backticked paths when you name them.
- Be concise and readable. Aim for something a person actually reads before
  starting work — roughly 400 to 600 words. Do not pad it with a summary of the
  repository's directory structure; that is elsewhere in the document.
- Do not invent anything. Every claim must trace to something a tool returned.
`.trim();

export interface OrchestrationOutcome {
  ok: boolean;
  briefing?: string;
  calls: AgenticResult['calls'];
  usage?: AgenticResult['usage'];
  durationMs: number;
  model?: string;
  /** Present when the orchestrator could not run or produced nothing usable. */
  reason?: string;
}

@Injectable({ deps: [LlmService, KnowledgeSearchService, StoreService, WorkspaceService, CodebaseService] })
export class OrchestratorService {
  constructor(
    private llm: LlmService,
    private knowledge: KnowledgeSearchService,
    private store: StoreService,
    private workspace: WorkspaceService,
    private codebase: CodebaseService
  ) {}

  get available(): boolean {
    return this.llm.available;
  }

  /**
   * Run the orchestration pass over the current knowledge base.
   *
   * Never throws: the manifest is generated deterministically with or without a
   * briefing, so a failure here degrades the document rather than blocking it.
   */
  async orchestrate(
    target: string,
    onProgress?: (note: string) => void
  ): Promise<OrchestrationOutcome> {
    const started = Date.now();

    if (!this.llm.available) {
      return {
        ok: false,
        calls: [],
        durationMs: 0,
        reason: describeFailure({ kind: 'disabled' }),
      };
    }

    const facts = this.store.all('knowledge');
    if (!facts.length) {
      return { ok: false, calls: [], durationMs: 0, reason: 'knowledge base is empty' };
    }

    const result = await this.llm.runAgentic({
      agent: 'orchestrator',
      system: ORCHESTRATOR_SYSTEM,
      task: this.openingTask(target, facts.length),
      tools: this.tools(),
      execute: (name, input) => this.execute(name, input, target),
      maxIterations: Number(process.env.BRIDGE_ORCHESTRATOR_MAX_STEPS ?? 14),
      maxTokens: 12000,
      onProgress,
    });

    if (!result.ok) {
      return {
        ok: false,
        calls: [],
        durationMs: Date.now() - started,
        reason: describeFailure(result.failure as LlmFailure),
      };
    }

    const briefing = result.data.text.trim();
    if (!briefing) {
      return {
        ok: false,
        calls: result.data.calls,
        usage: result.data.usage,
        durationMs: result.data.durationMs,
        model: result.data.model,
        reason: result.data.truncated
          ? 'orchestrator hit its step limit before writing the briefing'
          : 'orchestrator returned no text',
      };
    }

    return {
      ok: true,
      briefing,
      calls: result.data.calls,
      usage: result.data.usage,
      durationMs: result.data.durationMs,
      model: result.data.model,
    };
  }

  /* ------------------------------------------------------------------ *
   * Tool surface
   * ------------------------------------------------------------------ */

  private openingTask(target: string, factCount: number): string {
    const relative = this.workspace.rel(this.workspace.projectRoot, target) || target;
    const agents = [...new Set(this.store.all('knowledge').map((fact) => fact.agent))];
    return (
      `The swarm has finished. Target repository: \`${relative}\`. ` +
      `${factCount} facts are in the knowledge base, contributed by: ${agents.join(', ')}.\n\n` +
      `Interrogate it and write the opening briefing for CLAUDE.md.`
    );
  }

  private tools(): ToolSpec[] {
    return [
      {
        name: 'query_knowledge',
        description:
          'Semantic search across everything the swarm learned — architecture, dependencies, ' +
          'testing rules, CI/CD gates, sprint state, spoken team decisions and design tokens. ' +
          'Call this whenever you need to know what the swarm found about a topic. Results are ' +
          'ranked by relevance and marked as extracted (from a parser) or reasoned (inferred by ' +
          'a specialist agent).',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'What you want to know, in plain language.' },
            limit: { type: 'integer', description: 'How many facts to return. Defaults to 8.' },
            category: {
              type: 'string',
              enum: [
                'architecture',
                'dependency',
                'testing',
                'cicd',
                'agile',
                'consensus',
                'design-system',
                'manual',
              ],
              description: 'Optional. Restrict to one domain.',
            },
          },
        },
      },
      {
        name: 'find_change_surface',
        description:
          'Given a file, return everything that transitively imports it — the set a change would ' +
          'force someone to review. Call this before describing any file as risky, so the claim ' +
          'is backed by the actual dependency graph rather than an impression.',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          required: ['file'],
          properties: {
            file: {
              type: 'string',
              description: 'A path fragment or filename, e.g. "aurora-orm" or "middleware/auth.js".',
            },
            max_depth: { type: 'integer', description: 'How far to walk. Defaults to 3.' },
          },
        },
      },
      {
        name: 'list_conflicts',
        description:
          'Return the conflict ledger: places where the written record and the team\'s spoken ' +
          'decisions disagree, and how an administrator ruled. A resolved conflict is the highest ' +
          'authority in the entire knowledge base and overrules anything that contradicts it.',
        input_schema: { type: 'object', additionalProperties: false, properties: {} },
      },
      {
        name: 'read_repo_file',
        description:
          'Read a file from the target repository to verify a claim before you repeat it. Returns ' +
          'the first few thousand characters. Use sparingly — the swarm has already parsed this ' +
          'repository, so reach for this only when a specific detail needs confirming.',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          required: ['path'],
          properties: {
            path: {
              type: 'string',
              description: 'Repo-relative path, e.g. "server/db/aurora-orm.js".',
            },
          },
        },
      },
    ];
  }

  /** Dispatch a tool call. Every branch returns text the model can read. */
  private async execute(
    name: string,
    input: Record<string, unknown>,
    target: string
  ): Promise<string> {
    switch (name) {
      case 'query_knowledge':
        return this.truncate(this.runQuery(input));
      case 'find_change_surface':
        return this.truncate(this.runChangeSurface(input, target));
      case 'list_conflicts':
        return this.truncate(this.runConflicts());
      case 'read_repo_file':
        return this.truncate(this.runReadFile(input, target));
      default:
        return `Unknown tool "${name}".`;
    }
  }

  private runQuery(input: Record<string, unknown>): string {
    const query = String(input.query ?? '').trim();
    if (!query) return 'No query supplied.';

    const limit = Math.min(Math.max(Number(input.limit ?? 8) || 8, 1), 20);
    const category = typeof input.category === 'string' ? input.category : undefined;
    const hits = this.knowledge.search(query, limit, category);

    if (!hits.length) return `No facts matched "${query}".`;

    return hits
      .map((hit) => {
        const provenance = hit.reasoned ? 'reasoned' : 'extracted';
        const evidence = hit.evidence.length ? `\n  evidence: ${hit.evidence.join(', ')}` : '';
        return (
          `[${hit.score.toFixed(2)} · ${hit.agent} · ${hit.category} · ${provenance}] ${hit.title}\n` +
          `  ${hit.detail.replace(/\n/g, '\n  ')}${evidence}`
        );
      })
      .join('\n\n');
  }

  private runChangeSurface(input: Record<string, unknown>, target: string): string {
    const file = String(input.file ?? '').trim();
    if (!file) return 'No file supplied.';

    try {
      const depth = Math.min(Math.max(Number(input.max_depth ?? 3) || 3, 1), 6);
      const map = this.codebase.buildMap(target);
      const surface = this.codebase.changeSurface(map, file, depth);
      if (!surface.seeds.length) {
        return `No file in the repository matched "${file}".`;
      }
      const impacted = surface.impacted.length
        ? surface.impacted.map((entry) => `  - ${entry.path} (depth ${entry.depth}, ${entry.layer})`).join('\n')
        : '  (nothing imports it)';
      return (
        `Matched: ${surface.seeds.join(', ')}\n` +
        `${surface.impacted.length} file(s) would need review:\n${impacted}`
      );
    } catch (error) {
      return `Could not walk the change surface: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private runConflicts(): string {
    const conflicts = this.store.all('conflicts');
    if (!conflicts.length) return 'No conflicts have been detected.';

    return conflicts
      .map((conflict) => {
        const header =
          `${conflict.id} — ${conflict.kind} on "${conflict.topic}" ` +
          `(alignment ${conflict.similarity.toFixed(2)}, divergence ${conflict.divergence.toFixed(2)}) [${conflict.status}]`;
        const sources =
          `  A (${conflict.sourceA.origin} ${conflict.sourceA.ref}): ${conflict.sourceA.text}\n` +
          `  B (${conflict.sourceB.origin} ${conflict.sourceB.ref}): ${conflict.sourceB.text}`;
        const ruling = conflict.resolution
          ? `  HUMAN RULING (${conflict.resolution.resolvedBy}, chose ${conflict.resolution.chosen}): ${conflict.resolution.directive}`
          : '  UNRESOLVED — no administrator ruling yet.';
        return `${header}\n${sources}\n${ruling}`;
      })
      .join('\n\n');
  }

  private runReadFile(input: Record<string, unknown>, target: string): string {
    const requested = String(input.path ?? '').trim();
    if (!requested) return 'No path supplied.';

    // Resolved against the target and re-checked through the workspace
    // allow-list: the model chooses this path, so it is untrusted input and a
    // `../` escape must fail here rather than deeper in the stack.
    const resolved = path.resolve(target, requested);
    const permitted = this.workspace.allowedRoots.some((root) => {
      const relative = path.relative(root, resolved);
      return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    });
    if (!permitted) {
      return `Refusing to read ${requested}: outside the allow-listed roots.`;
    }

    const contents = this.workspace.read(resolved);
    if (contents === null) return `Could not read ${requested} — it may not exist.`;

    const clipped = contents.slice(0, MAX_FILE_CHARS);
    const note =
      contents.length > MAX_FILE_CHARS
        ? `\n… (truncated, ${contents.length - MAX_FILE_CHARS} more characters)`
        : '';
    return `${requested}:\n${clipped}${note}`;
  }

  private truncate(text: string): string {
    return text.length > MAX_RESULT_CHARS
      ? `${text.slice(0, MAX_RESULT_CHARS)}\n… (result truncated)`
      : text;
  }
}
