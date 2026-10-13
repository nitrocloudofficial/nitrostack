/**
 * The swarm orchestrator.
 *
 * Runs all seven reconnaissance personas over a target, cross-references their
 * output for conflicts, and pauses for a human when the sources disagree.
 *
 * Durability is handled by StoreService rather than an external workflow engine:
 * every agent's result is committed to disk the moment it completes, so a crash
 * mid-run loses at most the agent that was in flight, and a run that pauses for
 * a human decision is still there after a restart. Progress and the pause are
 * expressed through MCP Tasks (`ctx.task`), which is the protocol-native way to
 * do exactly this — see `taskSupport: 'optional'` below.
 */
import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards } from '@nitrostack/core';
import { AdminGuard } from '../../shared/security/admin.guard.js';
import { CodebaseService } from '../codebase/codebase.service.js';
import { DocumentationService } from '../documentation/documentation.service.js';
import { QaService } from '../qa/qa.service.js';
import { DevOpsService } from '../devops/devops.service.js';
import { UiUxService } from '../uiux/uiux.service.js';
import { AgileService } from '../agile/agile.service.js';
import { ConflictService } from '../conflict/conflict.service.js';
import { ManifestService } from '../synthesis/manifest.service.js';
import {
  WorkspaceService,
  describeSource,
  type TargetHandle,
} from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { LlmService, describeFailure, ZERO_USAGE, addUsage } from '../../shared/services/llm.service.js';
import type { TokenUsage } from '../../shared/services/llm.service.js';
import { OrchestratorService } from './orchestrator.service.js';
import { PERSONA_BRIEFS, ANALYSIS_SCHEMA, validateAnalysis, analysisToFacts } from './personas.js';
import { SWARM_AGENTS, RunRefSchema, TargetSchema } from '../../shared/schemas/index.js';
import type { KnowledgeFact, SwarmRun } from '../../shared/schemas/index.js';

/**
 * Build stamp echoed in every `run_swarm` response. If Studio is showing
 * `{"error":"Tool execution failed"}`, this stamp is the fastest way to prove
 * whether the tsx worker is running current source or a stale process.
 */
const SWARM_TOOL_BUILD = '2026-07-26T04:05-swarm-budget+studio-timeout-fit';

interface PersonaResult {
  facts: KnowledgeFact[];
  summary: string;
  evidence: unknown;
}

interface AgentDefinition {
  agent: (typeof SWARM_AGENTS)[number];
  title: string;
  /**
   * Returns the facts this persona contributes, plus a one-line summary.
   *
   * Async because two of the seven personas now read a live enterprise API
   * rather than a file on disk. The filesystem personas stay synchronous
   * internally and simply resolve immediately.
   */
  run: (target: string) => PersonaResult | Promise<PersonaResult>;
}

@Injectable({
  deps: [
    CodebaseService,
    DocumentationService,
    QaService,
    DevOpsService,
    UiUxService,
    AgileService,
    ConflictService,
    ManifestService,
    WorkspaceService,
    StoreService,
    LlmService,
    OrchestratorService,
  ],
})
export class SwarmTools {
  constructor(
    private codebase: CodebaseService,
    private documentation: DocumentationService,
    private qa: QaService,
    private devops: DevOpsService,
    private uiux: UiUxService,
    private agile: AgileService,
    private conflicts: ConflictService,
    private manifest: ManifestService,
    private workspace: WorkspaceService,
    private store: StoreService,
    private llm: LlmService,
    private orchestrator: OrchestratorService
  ) {}

  @Tool({
    name: 'run_swarm',
    title: 'Run the reconnaissance swarm',
    description:
      'Runs all seven specialist agents over a legacy codebase in one pass: Structural ' +
      'Cartographer, Documentation Synthesizer, QA Analyst, DevOps Navigator, Product ' +
      'Synchronizer, Scrum Analyst and UI/UX Integrator. `target` may be a GitHub repository ' +
      'URL (shallow-cloned into a temp directory, traversed for real, then deleted) or an ' +
      'absolute path on the machine hosting this server. Each agent commits its findings to ' +
      'the durable knowledge base as it completes, then the orchestrator cross-references the ' +
      'live Jira sprint against the team chat record. If they contradict each other the run ' +
      "PAUSES in the `awaiting-resolution` state rather than guessing — resolve it and the run " +
      'resumes. Optionally synthesizes CLAUDE.md at the end. Reports progress via MCP tasks.',
    inputSchema: TargetSchema.extend({
      synthesize: z
        .boolean()
        .default(true)
        .describe('Write CLAUDE.md at the end, if no conflicts are blocking'),
      detect_conflicts: z.boolean().default(true).describe('Cross-reference the Jira sprint against the team chat record'),
    }),
    taskSupport: 'optional',
    // Kept deliberately complete. Studio renders `examples.response` in the widget
    // preview BEFORE the tool has ever been executed, so a sparse example is not a
    // documentation nicety — it is what a first-time viewer sees. Omitting `agents`
    // and `target` here rendered the console as "7/0 agents · target undefined".
    examples: {
      request: { synthesize: true },
      response: {
        runId: 'run-1',
        status: 'awaiting-resolution',
        target: 'fixtures/legacy-monolith',
        agentsCompleted: 7,
        agentsFailed: 0,
        factsGathered: 54,
        generatedSkills: 0,
        openConflicts: 1,
        manifestSkippedReason:
          '1 unresolved conflict(s). The run is paused rather than guessing which source is authoritative.',
        factsByCategory: {
          dependency: 13,
          consensus: 11,
          testing: 9,
          architecture: 8,
          'design-system': 5,
          cicd: 4,
          agile: 4,
        },
        agents: [
          { agent: 'structural-cartographer', status: 'done', factCount: 8, durationMs: 142, summary: '33 files, 11 layers, 5 hotspots' },
          { agent: 'documentation-synthesizer', status: 'done', factCount: 13, durationMs: 38, summary: '21 deps across 3 manifest(s), 8 aging signal(s)' },
          { agent: 'qa-analyst', status: 'done', factCount: 9, durationMs: 51, summary: '4 runner(s), 5 written policy(ies)' },
          { agent: 'devops-navigator', status: 'done', factCount: 4, durationMs: 44, summary: '2 pipeline(s), commit convention recovered' },
          { agent: 'product-synchronizer', status: 'done', factCount: 4, durationMs: 6, summary: 'sprint "Sprint 41 - Invoice Read Path", 3 open issue(s)' },
          { agent: 'scrum-analyst', status: 'done', factCount: 11, durationMs: 9, summary: '14 binding directive(s) extracted' },
          { agent: 'uiux-integrator', status: 'done', factCount: 5, durationMs: 63, summary: '23 token(s), 3 component(s), 0 ad-hoc colour(s)' },
        ],
        nextStep: 'Resolve the conflict(s), then the manifest will generate.',
      },
    },
  })
  @Widget('swarm-console')
  @UseGuards(AdminGuard)
  async runSwarm(
    input: { target?: string; synthesize?: boolean; detect_conflicts?: boolean },
    ctx: ExecutionContext
  ) {
    // Full-fat try/catch — everything past the tool boundary must return a
    // structured payload, including path-validation, DI resolution, and
    // store writes. Anything that leaks up becomes the framework's generic
    // `{"error":"Tool execution failed"}`, which is what a first-time viewer
    // sees when the swarm silently fails on a bad target path.
    let run: SwarmRun | undefined;
    const llmAvailable = this.llm.available;
    // Acquired outside the LLM budget below on purpose: a shallow clone of a
    // real repository can take seconds, and charging that to the reasoning
    // budget would silently starve the personas on a slow network.
    let handle: TargetHandle | undefined;

    try {
      handle = await this.workspace.acquireTarget(input.target);
      const target = handle.root;
      const definitions = this.definitions();

      run = {
        id: `run-${this.store.all('runs').length + 1}-${Date.now().toString(36)}`,
        target: handle.label,
        startedAt: new Date().toISOString(),
        status: 'running',
        agents: definitions.map((d) => ({
          agent: d.agent,
          status: 'pending' as const,
          factCount: 0,
          durationMs: 0,
          summary: '',
        })),
        conflictIds: [],
      };
      this.store.upsert('runs', run);

      ctx.logger.info('Swarm dispatched', {
        runId: run.id,
        target: handle.label,
        remote: handle.remote,
        agents: definitions.length,
        llm: llmAvailable ? this.llm.description : 'disabled',
      });

      return await this.executeSwarm(input, ctx, handle, definitions, llmAvailable, run);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Swarm run aborted', {
        runId: run?.id ?? 'pre-run',
        error: detail,
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (run) {
        run.status = 'failed';
        run.error = detail;
        run.finishedAt = new Date().toISOString();
        try {
          this.store.upsert('runs', run);
        } catch {
          /* store write may itself fail — the payload is still authoritative */
        }
      }
      return {
        runId: run?.id ?? null,
        status: 'failed',
        target: run?.target ?? input.target ?? null,
        error: detail,
        agents: run?.agents ?? [],
        agentsCompleted: run?.agents.filter((a) => a.status === 'done').length ?? 0,
        agentsFailed: run?.agents.filter((a) => a.status === 'failed').length ?? 0,
        factsGathered: this.safeCount('knowledge'),
        llm: { enabled: llmAvailable, description: this.llm.description },
        nextStep: this.diagnoseNextStep(detail),
        buildStamp: SWARM_TOOL_BUILD,
      };
    } finally {
      // The clone outlives neither the happy path nor the failure path.
      await handle?.cleanup();
    }
  }

  /** Counting the knowledge base must not itself throw during error reporting. */
  private safeCount(collection: 'knowledge'): number {
    try {
      return this.store.all(collection).length;
    } catch {
      return 0;
    }
  }

  /** Turn a raw error message into an actionable hint for the widget. */
  private diagnoseNextStep(detail: string): string {
    const lower = detail.toLowerCase();
    if (lower.includes('outside') && lower.includes('allow')) {
      return (
        'The target path is outside the workspace allow-list. Either omit `target` to use the bundled ' +
        'fixture, or add your project to BRIDGE_ALLOWED_ROOTS (see .env.example) and restart.'
      );
    }
    if (lower.includes('private or does not exist') || lower.includes('was not found on')) {
      return (
        'The repository could not be cloned. Check the URL, and set GITHUB_TOKEN with repo read ' +
        'access if it is private.'
      );
    }
    if (lower.includes('host allow-list')) {
      return 'That git host is not permitted. Add it to BRIDGE_ALLOWED_REPO_HOSTS and restart.';
    }
    if (lower.includes('git is not installed')) {
      return 'Install git on the host running this server, or pass a local absolute path as `target`.';
    }
    if (lower.includes('exceeded') && lower.includes('cloning')) {
      return 'The clone timed out. Raise BRIDGE_CLONE_TIMEOUT_MS, or analyse a smaller repository.';
    }
    if (lower.includes('rate limit') || lower.includes('429')) {
      return 'Rate limited by the LLM provider. Wait a minute or call configure_llm to switch models.';
    }
    if (lower.includes('deadline') || lower.includes('timeout')) {
      return 'LLM did not respond in time. Call configure_llm with a faster model or raise BRIDGE_LLM_TIMEOUT_MS.';
    }
    return 'Inspect the error, then re-run. Call configure_llm to change model or key.';
  }

  private async executeSwarm(
    input: { target?: string; synthesize?: boolean; detect_conflicts?: boolean },
    ctx: ExecutionContext,
    handle: TargetHandle,
    definitions: AgentDefinition[],
    llmAvailable: boolean,
    run: SwarmRun
  ) {
    const target = handle.root;
    let swarmUsage: TokenUsage = { ...ZERO_USAGE };
    const llmNotes: { agent: string; reasonedFacts: number; failure?: string }[] = [];
    // Rate-limit latch: once we've seen N consecutive 429s from the provider,
    // stop trying LLM for the rest of this run. Free tiers on OpenRouter
    // sometimes throttle a single model to a handful of requests per minute,
    // and burning 7 more rejections just delays the manifest.
    let consecutiveRateLimits = 0;
    let llmLatchedOff = false;
    const RATE_LIMIT_LATCH = 2;

    // Total wall-clock budget for the LLM portions of this run. Studio's
    // synchronous tool-call timeout is ~15s; anything above this and the
    // client gives up before the tool returns, showing its own
    // "Tool execution failed" message. Use the async-task button (or MCP
    // tasks in general) to escape this cap. Overridable for CLI callers.
    const totalBudgetMs = Number(process.env.BRIDGE_SWARM_BUDGET_MS ?? 12_000);
    const swarmDeadline = Date.now() + totalBudgetMs;
    const budgetRemaining = () => Math.max(0, swarmDeadline - Date.now());
    ctx.logger.info('LLM budget', { totalBudgetMs, model: this.llm.model });

    /* ------------------------- deterministic pass ------------------------- */
    // Parallel: parsers are pure, disk-cheap, and independent — running them
    // serially costs nothing but wall clock. Studio's client-side task
    // timeout is generous but not infinite, so shaving 200-400ms here is
    // worth the flat map.
    const parsed = await Promise.all(
      definitions.map(async (definition, index) => {
        const slot = run.agents[index];
        const started = Date.now();
        try {
          this.store.clearAgentFacts(definition.agent);
          const result = await definition.run(target);
          this.store.addFacts(result.facts);
          slot.summary = result.summary;
          slot.factCount = result.facts.length;
          return { index, definition, parseMs: Date.now() - started, ...result, error: null as string | null };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          slot.status = 'failed';
          slot.error = message;
          ctx.logger.error(`Parser failed: ${definition.agent}`, { error: message });
          return {
            index,
            definition,
            parseMs: Date.now() - started,
            facts: [] as KnowledgeFact[],
            summary: '',
            evidence: null,
            error: message,
          };
        }
      })
    );
    this.store.upsert('runs', run);
    ctx.task?.updateProgress(`Parsers done — ${parsed.filter((p) => !p.error).length}/${definitions.length} succeeded`);

    /* ------------------------- parallel LLM pass ------------------------- */
    // Personas are independent: parallelising cuts wall-clock from
    // sum-of-slowest to max-of-slowest, which is what keeps this within
    // Studio's client-side timeout on paid models and gives free-tier models
    // a fair shot before the tier limit bites.
    if (llmAvailable) {
      // Sub-budget each LLM call to a share of the swarm's remaining
      // wall-clock. If the model is slow the individual call fails cleanly
      // with a Deadline error rather than pinning the tool past Studio's
      // client-side timeout.
      const perCallBudget = Math.max(2000, budgetRemaining() - 1500);
      const previousTimeout = process.env.BRIDGE_LLM_TIMEOUT_MS;
      process.env.BRIDGE_LLM_TIMEOUT_MS = String(perCallBudget);
      ctx.task?.updateProgress(
        `Reasoning with ${this.llm.model} across ${parsed.length} personas in parallel (${perCallBudget}ms budget)`
      );

      type ReasoningOutcome =
        | { entry: (typeof parsed)[number]; kind: 'ok'; usage: TokenUsage; facts: KnowledgeFact[] }
        | { entry: (typeof parsed)[number]; kind: 'skipped'; detail: string };

      const reasoningResults: ReasoningOutcome[] = await Promise.all(
        parsed.map(async (entry): Promise<ReasoningOutcome> => {
          if (entry.error) return { entry, kind: 'skipped', detail: entry.error };
          const brief = PERSONA_BRIEFS[entry.definition.agent];
          if (!brief) return { entry, kind: 'skipped', detail: 'no persona brief registered' };

          try {
            const reasoning = await this.llm.reason({
              agent: entry.definition.agent,
              system: brief.system,
              evidence: this.renderEvidence(entry.evidence),
              task: brief.question,
              schema: ANALYSIS_SCHEMA,
              validate: validateAnalysis,
            });
            if (reasoning.ok) {
              return {
                entry,
                kind: 'ok',
                usage: reasoning.data.usage,
                facts: analysisToFacts(entry.definition.agent, reasoning.data.value),
              };
            }
            return { entry, kind: 'skipped', detail: describeFailure(reasoning.failure) };
          } catch (error) {
            // The LLM service normally returns discriminated failures, but any
            // sync throw (bug, uncaught SDK error) still lands here rather
            // than aborting the whole promise-all and losing the other six.
            return {
              entry,
              kind: 'skipped',
              detail: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      // Restore the previous per-call timeout so a subsequent tool invocation
      // starts from the operator-configured value, not our narrowed budget.
      if (previousTimeout === undefined) delete process.env.BRIDGE_LLM_TIMEOUT_MS;
      else process.env.BRIDGE_LLM_TIMEOUT_MS = previousTimeout;

      for (const outcome of reasoningResults) {
        const { entry } = outcome;
        const slot = run.agents[entry.index];
        let reasonedFacts = 0;
        let llmSummary = '';

        if (outcome.kind === 'ok') {
          consecutiveRateLimits = 0;
          this.store.addFacts(outcome.facts);
          reasonedFacts = outcome.facts.length;
          swarmUsage = addUsage(swarmUsage, outcome.usage);
          llmSummary = ` · ${reasonedFacts} reasoned fact(s), $${outcome.usage.costUsd.toFixed(4)}`;
          llmNotes.push({ agent: entry.definition.agent, reasonedFacts });
        } else {
          const detail = outcome.detail;
          if (detail.toLowerCase().includes('rate limit')) {
            consecutiveRateLimits += 1;
            if (consecutiveRateLimits >= RATE_LIMIT_LATCH && !llmLatchedOff) {
              llmLatchedOff = true;
              ctx.logger.warn(
                `LLM reasoning latched OFF for the rest of this run — ${consecutiveRateLimits} consecutive rate limits on ${this.llm.model}. ` +
                  `Switch to a paid or less-throttled model with configure_llm.`
              );
            }
          }
          ctx.logger.warn(`LLM reasoning skipped for ${entry.definition.agent}: ${detail}`);
          llmSummary = ` · llm ${detail}`;
          llmNotes.push({ agent: entry.definition.agent, reasonedFacts: 0, failure: detail });
        }

        // Only mark done if the parser succeeded — a parser failure was
        // already recorded and shouldn't be overwritten by LLM outcome.
        if (slot.status !== 'failed') {
          slot.status = 'done';
          slot.factCount = entry.facts.length + reasonedFacts;
          slot.summary = `${entry.summary}${llmSummary}`;
          slot.durationMs = entry.parseMs;
        }
      }
    } else {
      // No LLM: mark parser-succeeded slots done as-is.
      for (const entry of parsed) {
        const slot = run.agents[entry.index];
        if (slot.status !== 'failed') {
          slot.status = 'done';
          slot.durationMs = entry.parseMs;
        }
      }
    }

    this.store.upsert('runs', run);

    /* ------------------------- conflict cross-reference ------------------------- */
    let openConflicts = 0;
    let conflictSources: { jira: string; chat: string } | undefined;
    if (input.detect_conflicts !== false) {
      ctx.task?.updateProgress('Cross-referencing Jira against the team chat record');
      try {
        // Both were already fetched by their personas moments ago; re-reading
        // is one more round trip but keeps this independent of persona
        // ordering and of whether either persona failed.
        const [sprint, transcript] = await Promise.all([
          this.agile.loadSprint(),
          this.agile.loadTranscript(),
        ]);
        conflictSources = { jira: sprint.dataSource, chat: transcript.dataSource };

        // Cross-referencing two fixtures against a repository neither describes
        // would pause the run on a contradiction that has nothing to do with
        // the code being analysed.
        const bothFictional =
          sprint.dataSource === 'fixture' &&
          transcript.dataSource === 'fixture' &&
          !this.workspace.isBundledFixture(target);

        if (bothFictional) {
          ctx.logger.info('Conflict detection skipped — no live sources for this target');
        } else {
          const detected = this.conflicts.detect(sprint.value, transcript.value);
          run.conflictIds = detected.map((c) => c.id);
          openConflicts = detected.filter((c) => c.status === 'open').length;
        }
      } catch (error) {
        ctx.logger.warn('Conflict detection skipped', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    /* ------------------------------- synthesis ------------------------------- */
    let manifestPath: string | undefined;
    let manifestSkippedReason: string | undefined;
    let briefingSummary: string | undefined;
    let manifestContent: string | undefined;
    let manifestDestination: string | undefined;

    if (openConflicts > 0) {
      run.status = 'awaiting-resolution';
      manifestSkippedReason =
        `${openConflicts} unresolved conflict(s). The run is paused rather than guessing which ` +
        `source is authoritative. Resolve them in the conflict-resolver widget and the run resumes.`;
      ctx.task?.requestInput(
        `Swarm paused: ${openConflicts} context conflict(s) need an administrator decision.`
      );
    } else {
      // Master orchestrator: agentic tool-calling loop over the knowledge base,
      // producing the executive briefing that opens CLAUDE.md. Runs before
      // synthesis so the manifest can bake the briefing in. Skipped when the
      // rate-limit latch is set, because sending it into the same throttled
      // model would just delay the manifest.
      if (llmAvailable && !llmLatchedOff && budgetRemaining() > 3000) {
        // Orchestrator uses the swarm's remaining budget as its per-call cap
        // too, for the same reason as the persona pass.
        const orchestratorBudget = Math.max(2000, budgetRemaining() - 500);
        const previousTimeout = process.env.BRIDGE_LLM_TIMEOUT_MS;
        process.env.BRIDGE_LLM_TIMEOUT_MS = String(orchestratorBudget);
        ctx.task?.updateProgress(
          `Master orchestrator authoring executive briefing (${this.llm.model}, ${orchestratorBudget}ms budget)`
        );
        const outcome = await this.orchestrator.orchestrate(target, (note) => {
          try {
            ctx.task?.updateProgress(`orchestrator: ${note}`);
          } catch {
            /* task may already be closed; the LLM call itself is authoritative */
          }
        });
        if (outcome.ok && outcome.briefing) {
          swarmUsage = outcome.usage ? addUsage(swarmUsage, outcome.usage) : swarmUsage;
          this.store.addFacts([
            {
              id: 'llm:orchestrator:briefing',
              agent: 'orchestrator',
              category: 'architecture',
              title: 'Executive briefing',
              detail: outcome.briefing,
              evidence: outcome.calls.map((c) => `${c.name}(${JSON.stringify(c.input)})`),
              weight: 6,
              reasoned: true,
            },
          ]);
          briefingSummary = `${outcome.calls.length} tool call(s), $${outcome.usage?.costUsd.toFixed(4) ?? '0.0000'}`;
        } else if (outcome.reason) {
          ctx.logger.warn(`Orchestrator briefing skipped: ${outcome.reason}`);
          briefingSummary = `skipped: ${outcome.reason}`;
        }
        if (previousTimeout === undefined) delete process.env.BRIDGE_LLM_TIMEOUT_MS;
        else process.env.BRIDGE_LLM_TIMEOUT_MS = previousTimeout;
      } else if (llmLatchedOff) {
        briefingSummary = 'skipped: rate-limit latch tripped during persona pass';
      } else if (llmAvailable) {
        briefingSummary = 'skipped: swarm budget exhausted before orchestrator could run';
      }

      if (input.synthesize !== false) {
        ctx.task?.updateProgress('Synthesizing CLAUDE.md');
        try {
          const written = this.manifest.write(handle);
          manifestPath = written.path;
          manifestContent = written.content;
          manifestDestination = written.destination;
          run.manifestPath = manifestPath;
          run.status = 'completed';
        } catch (error) {
          run.status = 'failed';
          run.error = error instanceof Error ? error.message : String(error);
        }
      } else {
        run.status = 'completed';
      }
    }

    run.finishedAt = new Date().toISOString();
    this.store.upsert('runs', run);

    const facts = this.store.all('knowledge');
    ctx.logger.info('Swarm complete', {
      runId: run.id,
      status: run.status,
      facts: facts.length,
      openConflicts,
      llmCostUsd: swarmUsage.costUsd.toFixed(4),
    });

    return {
      runId: run.id,
      status: run.status,
      target: run.target,
      source: describeSource(handle),
      agentsCompleted: run.agents.filter((a) => a.status === 'done').length,
      agentsFailed: run.agents.filter((a) => a.status === 'failed').length,
      agents: run.agents,
      factsGathered: facts.length,
      factsByCategory: this.countBy(facts),
      openConflicts,
      conflictSources,
      integrations: this.agile.integrationStatus(),
      conflicts: this.store.all('conflicts'),
      generatedSkills: this.store.all('skills').length,
      manifestPath,
      manifestDestination,
      // For a remote target the clone is deleted the moment this tool returns,
      // so the manifest body travels back in the response. An agent that asked
      // the bridge to analyse a GitHub URL can write this straight into its own
      // checkout without a second call.
      manifestContent: handle.remote ? manifestContent : undefined,
      manifestSkippedReason,
      llm: {
        enabled: llmAvailable,
        description: this.llm.description,
        totalInputTokens: swarmUsage.input,
        totalOutputTokens: swarmUsage.output,
        cacheReadTokens: swarmUsage.cacheRead,
        cacheWriteTokens: swarmUsage.cacheWrite,
        totalCostUsd: Number(swarmUsage.costUsd.toFixed(6)),
        perAgent: llmNotes,
        briefing: briefingSummary,
      },
      nextStep:
        openConflicts > 0
          ? 'Resolve the conflict(s), then the manifest will generate.'
          : manifestPath
            ? handle.remote
              ? `Manifest generated for ${handle.label} and archived at ${manifestPath}. The clone has been ` +
                `deleted — write \`manifestContent\` to CLAUDE.md at the root of your checkout.`
              : `Manifest written to ${manifestPath}. Open it, or call query_knowledge to interrogate the graph.`
            : 'Call synthesize_claude_md to write the manifest.',
      buildStamp: SWARM_TOOL_BUILD,
    };
  }

  /**
   * Render a persona's deterministic evidence as text the model can reason over.
   *
   * The parsers return well-formed objects; JSON stringification with a small
   * amount of indentation preserves nesting without inflating tokens. A trailing
   * cap keeps a pathological input from blowing the cache breakpoint.
   */
  private renderEvidence(evidence: unknown): string {
    const MAX = 60_000;
    let text: string;
    try {
      text = typeof evidence === 'string' ? evidence : JSON.stringify(evidence, null, 2);
    } catch {
      text = String(evidence);
    }
    if (text.length <= MAX) return text;
    return `${text.slice(0, MAX)}\n… (evidence truncated at ${MAX} chars)`;
  }

  @Tool({
    name: 'get_swarm_run',
    title: 'Get swarm run status',
    description:
      'Returns the state of a swarm run — per-agent status, timings, fact counts and any ' +
      'conflicts blocking it. Because run state is persisted to disk on every agent ' +
      'completion, this is accurate even after a server restart mid-run.',
    inputSchema: RunRefSchema,
    examples: {
      request: {},
      response: { runId: 'run-1', status: 'completed', agentsCompleted: 7 },
    },
  })
  @Widget('swarm-console')
  async getSwarmRun(input: { run_id?: string }) {
    const run = this.store.requireRun(input.run_id);
    const facts = this.store.all('knowledge');
    const conflicts = this.store.all('conflicts');

    return {
      runId: run.id,
      status: run.status,
      target: run.target,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      agents: run.agents,
      agentsCompleted: run.agents.filter((a) => a.status === 'done').length,
      agentsFailed: run.agents.filter((a) => a.status === 'failed').length,
      factsGathered: facts.length,
      factsByCategory: this.countBy(facts),
      openConflicts: conflicts.filter((c) => c.status === 'open').length,
      conflicts,
      generatedSkills: this.store.all('skills').length,
      manifestPath: run.manifestPath,
      allRuns: this.store.all('runs').map((r) => ({ id: r.id, status: r.status, startedAt: r.startedAt })),
    };
  }

  /* --------------------------- persona definitions --------------------------- */

  private definitions(): AgentDefinition[] {
    return [
      {
        agent: 'structural-cartographer',
        title: 'Structural Cartographer — mapping the dependency graph',
        run: (target) => {
          const map = this.codebase.buildMap(target);
          const facts: KnowledgeFact[] = [
            {
              id: 'arch:topography',
              agent: 'structural-cartographer',
              category: 'architecture',
              title: 'Architectural topography',
              detail: Object.entries(map.layers)
                .sort((a, b) => b[1] - a[1])
                .map(([l, n]) => `${l}: ${n} file(s)`)
                .join(', '),
              evidence: Object.keys(map.layers),
              weight: 5,
            },
            {
              id: 'arch:tree',
              agent: 'structural-cartographer',
              category: 'architecture',
              title: 'Directory tree',
              detail: map.tree,
              evidence: [],
              weight: 4,
            },
            ...map.hotspots.slice(0, 5).map<KnowledgeFact>((h) => ({
              id: `arch:hotspot:${h.path}`,
              agent: 'structural-cartographer',
              category: 'architecture',
              title: `High-blast-radius file: ${h.path}`,
              detail: `${h.path} (${h.layer}) is imported by ${h.inbound} other file(s). Changing it requires reviewing every dependent.`,
              evidence: [h.path],
              weight: 4,
            })),
          ];
          if (map.cycles.length) {
            facts.push({
              id: 'arch:cycles',
              agent: 'structural-cartographer',
              category: 'architecture',
              title: 'Import cycles',
              detail: map.cycles.map((c) => c.join(' → ')).join('\n'),
              evidence: map.cycles.flat(),
              weight: 3,
            });
          }
          return {
            facts,
            summary: `${map.fileCount} files, ${Object.keys(map.layers).length} layers, ${map.hotspots.length} hotspots`,
            evidence: map,
          };
        },
      },
      {
        agent: 'documentation-synthesizer',
        title: 'Documentation Synthesizer — dependency inventory',
        run: (target) => {
          const report = this.documentation.analyse(target);
          const facts: KnowledgeFact[] = [
            {
              id: 'dep:inventory',
              agent: 'documentation-synthesizer',
              category: 'dependency',
              title: 'Dependency inventory',
              detail: Object.entries(report.byEcosystem).map(([e, n]) => `${e}: ${n} package(s)`).join(', '),
              evidence: report.manifests,
              weight: 3,
            },
            ...report.agingSignals.map<KnowledgeFact>((s) => ({
              id: `dep:aging:${s.name}`,
              agent: 'documentation-synthesizer',
              category: 'dependency',
              title: `Pinned old: ${s.name}@${s.version}`,
              detail: s.note,
              evidence: report.manifests,
              weight: 4,
            })),
            ...report.internalDocs.slice(0, 8).map<KnowledgeFact>((d) => ({
              id: `dep:doc:${d.path}`,
              agent: 'documentation-synthesizer',
              category: 'dependency',
              title: `Internal doc: ${d.title}`,
              detail: d.excerpt,
              evidence: [d.path],
              weight: 2,
            })),
          ];
          return {
            facts,
            summary: `${report.dependencies.length} deps across ${report.manifests.length} manifest(s), ${report.agingSignals.length} aging signal(s)`,
            evidence: report,
          };
        },
      },
      {
        agent: 'qa-analyst',
        title: 'Quality Assurance Analyst — testing contract',
        run: (target) => {
          const report = this.qa.analyse(target);
          const facts: KnowledgeFact[] = [];
          if (report.frameworks.length) {
            facts.push({
              id: 'qa:frameworks',
              agent: 'qa-analyst',
              category: 'testing',
              title: 'Test frameworks in force',
              detail: report.frameworks.map((f) => `${f.name} (${f.ecosystem}) — ${f.detail}`).join('\n'),
              evidence: report.frameworks.map((f) => f.configFile),
              weight: 5,
            });
          }
          if (Object.keys(report.coverageThresholds).length) {
            facts.push({
              id: 'qa:coverage-gate',
              agent: 'qa-analyst',
              category: 'testing',
              title: 'Coverage gate',
              detail:
                'The build FAILS below these thresholds: ' +
                Object.entries(report.coverageThresholds).map(([k, v]) => `${k} ${v}%`).join(', '),
              evidence: report.frameworks.map((f) => f.configFile),
              weight: 5,
            });
          }
          facts.push({
            id: 'qa:naming',
            agent: 'qa-analyst',
            category: 'testing',
            title: 'Spec naming and location',
            detail:
              `Convention: ${report.namingConvention}. ` +
              (report.specLocations.length
                ? `Specs live in: ${report.specLocations.map((s) => `${s.directory} (${s.count})`).join(', ')}.`
                : 'No spec files found on disk.'),
            evidence: report.specLocations.map((s) => s.examplePath),
            weight: 4,
          });
          for (const lint of report.lintRules) {
            facts.push({
              id: `qa:lint:${lint.file}`,
              agent: 'qa-analyst',
              category: 'testing',
              title: `Lint rules (${lint.file})`,
              detail:
                (lint.extends.length ? `extends ${lint.extends.join(', ')}. ` : '') +
                lint.rules.map((r) => `${r.rule}=${r.setting}`).join(', '),
              evidence: [lint.file],
              weight: 4,
            });
          }
          if (report.formatter) {
            facts.push({
              id: 'qa:formatter',
              agent: 'qa-analyst',
              category: 'testing',
              title: 'Formatter settings',
              detail: Object.entries(report.formatter.settings).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', '),
              evidence: [report.formatter.file],
              weight: 3,
            });
          }
          report.writtenPolicies.forEach((policy, i) => {
            facts.push({
              id: `qa:policy:${i}`,
              agent: 'qa-analyst',
              category: 'testing',
              title: 'Written engineering policy',
              detail: policy,
              evidence: [],
              weight: 4,
            });
          });
          return {
            facts,
            summary: `${report.frameworks.length} runner(s), ${report.writtenPolicies.length} written policy(ies)`,
            evidence: report,
          };
        },
      },
      {
        agent: 'devops-navigator',
        title: 'DevOps Navigator — pipeline and commit contract',
        run: (target) => {
          const report = this.devops.analyse(target);
          const facts: KnowledgeFact[] = report.pipelines.map((p) => ({
            id: `cicd:pipeline:${p.file}`,
            agent: 'devops-navigator',
            category: 'cicd' as const,
            title: `${p.system} pipeline (${p.file})`,
            detail:
              `Stages in order: ${p.stages.map((s) => s.name).join(' → ')}.` +
              (p.agents.length ? ` Runs on: ${p.agents.join(', ')}.` : '') +
              (p.secrets.length ? ` Uses secrets: ${p.secrets.join(', ')}.` : ''),
            evidence: [p.file],
            weight: 5,
          }));

          if (report.commitConvention) {
            const c = report.commitConvention;
            facts.push({
              id: 'cicd:commit-convention',
              agent: 'devops-navigator',
              category: 'cicd',
              title: 'Commit message convention (CI-enforced)',
              detail:
                `Format: \`${c.pattern}\`. ` +
                (c.types.length ? `Types: ${c.types.join(', ')}. ` : '') +
                (c.scopes.length ? `Scopes: ${c.scopes.join(', ')}. ` : '') +
                (c.requiresTicketRef ? 'A ticket key is MANDATORY — CI rejects commits without one. ' : '') +
                (c.maxHeaderLength ? `Header max ${c.maxHeaderLength} chars. ` : '') +
                (c.example ? `Example: \`${c.example}\`` : ''),
              evidence: [c.source],
              weight: 5,
            });
          }
          if (report.manualApprovalGates.length) {
            facts.push({
              id: 'cicd:approval-gates',
              agent: 'devops-navigator',
              category: 'cicd',
              title: 'Manual approval gates',
              detail: report.manualApprovalGates
                .map((g) => `"${g.stage}" in ${g.pipeline} requires approval from ${g.who}`)
                .join('; '),
              evidence: report.manualApprovalGates.map((g) => g.pipeline),
              weight: 4,
            });
          }
          if (report.branchModel.length) {
            facts.push({
              id: 'cicd:branch-model',
              agent: 'devops-navigator',
              category: 'cicd',
              title: 'Branch model',
              detail: report.branchModel
                .map((b) => `${b.branch}: ${b.role}${b.deploysTo ? ` (${b.deploysTo})` : ''}`)
                .join('; '),
              evidence: report.pipelines.map((p) => p.file),
              weight: 4,
            });
          }
          return {
            facts,
            summary: `${report.pipelines.length} pipeline(s), commit convention ${report.commitConvention ? 'recovered' : 'not found'}`,
            evidence: report,
          };
        },
      },
      {
        agent: 'product-synchronizer',
        title: 'Product Synchronizer — Jira sprint state',
        run: async (target) => {
          const sourced = await this.agile.loadSprint();
          const sprint = sourced.value;

          // Fixture sprint data describes the bundled Aurora demo. Writing it
          // into a manifest for somebody else's repository would tell their
          // agent that six invented tickets are in flight — confidently, and
          // completely wrongly. Contribute nothing instead, and say why.
          const fictional = sourced.dataSource === 'fixture' && !this.workspace.isBundledFixture(target);
          if (fictional) {
            return {
              facts: [],
              summary: 'skipped — no live Jira configured, and the demo fixture does not describe this repository',
              evidence: { skipped: true, hint: sourced.configurationHint },
            };
          }

          const inFlight = sprint.issues.filter((i) => !/done|closed/i.test(i.status));
          const facts: KnowledgeFact[] = [
            {
              id: 'agile:sprint',
              agent: 'product-synchronizer',
              category: 'agile',
              title: `Active sprint: ${sprint.sprint.name}`,
              detail:
                `Goal: ${sprint.sprint.goal ?? 'not stated'}. ` +
                `Runs ${sprint.sprint.startDate ?? '?'} → ${sprint.sprint.endDate ?? '?'}. ` +
                `${inFlight.length} of ${sprint.issues.length} issues still open.`,
              evidence: [`${sprint.board} board (${sourced.dataSource})`],
              weight: 5,
            },
            ...inFlight.map<KnowledgeFact>((issue) => ({
              id: `agile:issue:${issue.key}`,
              agent: 'product-synchronizer',
              category: 'agile',
              title: `${issue.key} (${issue.status}) — ${issue.summary}`,
              detail: `${issue.description} Owner: ${issue.assignee ?? 'unassigned'}.`,
              evidence: [issue.key],
              weight: issue.status.toLowerCase().includes('progress') ? 4 : 3,
            })),
          ];
          return {
            facts,
            summary:
              `sprint "${sprint.sprint.name}", ${inFlight.length} open issue(s) · ${sourced.dataSource}`,
            evidence: sprint,
          };
        },
      },
      {
        agent: 'scrum-analyst',
        title: 'Scrum Analyst — human consensus from Slack',
        run: async (target) => {
          const sourced = await this.agile.loadTranscript();
          const transcript = sourced.value;

          // Same reasoning as the Product Synchronizer above: a fixture standup
          // about Redis and a frozen ORM is authoritative for the demo repo and
          // fiction everywhere else.
          if (sourced.dataSource === 'fixture' && !this.workspace.isBundledFixture(target)) {
            return {
              facts: [],
              summary: 'skipped — no live Slack configured, and the demo transcript does not describe this repository',
              evidence: { skipped: true, hint: sourced.configurationHint },
            };
          }

          const binding = this.agile.bindingDirectives(transcript);
          const facts: KnowledgeFact[] = [
            {
              id: 'consensus:meeting',
              agent: 'scrum-analyst',
              category: 'consensus',
              title: `Human consensus: ${transcript.title}`,
              detail:
                `${transcript.occurredAt ?? 'undated'}. ${transcript.attendees.length} attendees. ` +
                `${binding.length} binding directive(s) from ${transcript.decisions.length} utterances.`,
              evidence: [transcript.source],
              weight: 4,
            },
            ...binding.slice(0, 10).map<KnowledgeFact>((d) => ({
              id: `consensus:${d.id}`,
              agent: 'scrum-analyst',
              category: 'consensus',
              title: `${d.polarity.toUpperCase()}${d.entities.length ? `: ${d.entities.join(', ')}` : ''} — ${d.speaker ?? 'unknown'}`,
              detail: `"${d.text}" (${d.timestamp ?? '?'}, authority: ${d.authority})`,
              evidence: [transcript.source],
              weight: d.authority === 'lead' || d.authority === 'ops' ? 5 : 3,
            })),
          ];
          return {
            facts,
            summary: `${binding.length} binding directive(s) extracted · ${sourced.dataSource}`,
            evidence: { transcript, binding },
          };
        },
      },
      {
        agent: 'uiux-integrator',
        title: 'UI/UX Integrator — corporate design language',
        run: (target) => {
          const report = this.uiux.analyse(target);
          const facts: KnowledgeFact[] = [];
          if (report.palette.length) {
            facts.push({
              id: 'ui:palette',
              agent: 'uiux-integrator',
              category: 'design-system',
              title: 'Approved colour palette',
              detail:
                'Use ONLY these colour tokens. Never introduce a raw hex value:\n' +
                report.palette.map((p) => `  ${p.name} = ${p.value}`).join('\n'),
              evidence: [...new Set(report.tokens.filter((t) => t.category === 'color').map((t) => t.source))],
              weight: 5,
            });
          }
          if (report.typography.length) {
            facts.push({
              id: 'ui:typography',
              agent: 'uiux-integrator',
              category: 'design-system',
              title: 'Typography',
              detail: report.typography.map((t) => `${t.name}: ${t.value}`).join('\n'),
              evidence: [...new Set(report.tokens.filter((t) => t.category === 'font').map((t) => t.source))],
              weight: 4,
            });
          }
          if (report.components.length) {
            facts.push({
              id: 'ui:components',
              agent: 'uiux-integrator',
              category: 'design-system',
              title: 'Reusable component inventory',
              detail:
                'Compose from these before writing new markup:\n' +
                report.components
                  .map((c) => `  <${c.name} ${c.props.map((p) => `${p}={…}`).join(' ')} />  — ${c.path}${c.doc ? ` — ${c.doc}` : ''}`)
                  .join('\n'),
              evidence: report.components.map((c) => c.path),
              weight: 5,
            });
          }
          const scale = report.tokens.filter((t) => ['spacing', 'radius', 'elevation', 'duration'].includes(t.category));
          if (scale.length) {
            facts.push({
              id: 'ui:scale',
              agent: 'uiux-integrator',
              category: 'design-system',
              title: 'Spacing, radius and motion scale',
              detail: scale.map((t) => `${t.name} = ${t.value}`).join('\n'),
              evidence: [...new Set(scale.map((t) => t.source))],
              weight: 3,
            });
          }
          report.conventions.forEach((convention, i) => {
            facts.push({
              id: `ui:convention:${i}`,
              agent: 'uiux-integrator',
              category: 'design-system',
              title: 'Design system rule',
              detail: convention,
              evidence: [],
              weight: 4,
            });
          });
          return {
            facts,
            summary: `${report.tokens.length} token(s), ${report.components.length} component(s), ${report.adHocColors.length} ad-hoc colour(s)`,
            evidence: report,
          };
        },
      },
    ];
  }

  private countBy(facts: KnowledgeFact[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const f of facts) out[f.category] = (out[f.category] ?? 0) + 1;
    return out;
  }
}
