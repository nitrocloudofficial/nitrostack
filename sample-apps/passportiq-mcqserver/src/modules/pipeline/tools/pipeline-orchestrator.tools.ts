/**
 * run_verification_pipeline — the orchestrating tool the dashboard invokes.
 *
 * Backend B owns this because it is server orchestration, not verification logic:
 * it chains the ten verification stages in order, letting each one emit its own
 * `pipeline.stage_completed` event so Frontend A's timeline fills in live, then
 * stops. It never decides anything — officer_decide stays a separate, guarded,
 * human action.
 *
 * Resilience is deliberate. A stage that throws is recorded as failed and the
 * chain CONTINUES. During a hackathon demo, one unfinished tool must not blank
 * the entire dashboard, and at Hour 4 (Checkpoint 1) this is what lets the team
 * see exactly which stages are live and which are still stubs.
 */
import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { PIPELINE_STAGES } from '../../../contracts/index.js';
import { ApplicationService } from '../services/application.service.js';
import { PipelineStateService } from '../services/pipeline-state.service.js';
import { ToolExecutorService } from '../services/tool-executor.service.js';

/**
 * Stages that need more than `{ applicationId }`.
 *
 * ocr_extract is per-document (Backend A's inputSchema takes a `documentType`),
 * so the orchestrator runs it once per document type on the application.
 * visual_similarity_flag needs a second application to compare against and is
 * optional, so it is skipped unless a comparison target is supplied.
 */
const PER_DOCUMENT_STAGE = 'ocr_extract';
const NEEDS_COMPARISON_TARGET = 'visual_similarity_flag';

interface StageOutcome {
  stage: string;
  status: 'completed' | 'failed' | 'skipped' | 'not_registered';
  durationMs: number;
  detail?: string;
}

/**
 * @Injectable({ deps: [...] }) — the deps array is MANDATORY, not documentation.
 *
 * DIContainer.getDependencies() prefers explicit `nitrostack:deps` metadata and
 * only falls back to TypeScript's `design:paramtypes`, which is empty under ESM
 * unless reflect-metadata was loaded before the decorator ran. Without the
 * explicit list, this class is constructed with NO arguments and every injected
 * field is `undefined` — the first tool call then dies with
 * "Cannot read properties of undefined". Order must match the constructor.
 */
@Injectable({ deps: [ApplicationService, PipelineStateService, ToolExecutorService] })
export class PipelineOrchestratorTools {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly state: PipelineStateService,
    private readonly toolExecutor: ToolExecutorService
  ) {}

  @Tool({
    name: 'run_verification_pipeline',
    title: 'Run verification pipeline',
    description:
      'Run the full verification pipeline for one application, in order: document_validate, ' +
      'ocr_extract, identity/address consistency, duplicate-signal detection, risk graph, rule ' +
      'evaluation, risk scoring and explanation. Each stage emits pipeline.stage_completed as it ' +
      'finishes so the dashboard updates live. Does NOT decide the application — that is ' +
      'officer_decide, which stays a human action.',
    inputSchema: z.object({
      applicationId: z.string().min(1).describe('Passport application ID to verify'),
      compareToApplicationId: z
        .string()
        .optional()
        .describe(
          'Optional second application for the visual_similarity_flag stage. Omit to skip it.'
        ),
      reset: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Clear previously recorded stage progress for this application first. Leave true so ' +
            'a re-run during rehearsal starts from a clean timeline.'
        ),
    }),
    outputSchema: z.object({
      applicationId: z.string(),
      applicant: z.record(z.unknown()),
      stages: z.array(
        z.object({
          stage: z.string(),
          status: z.enum(['completed', 'failed', 'skipped', 'not_registered']),
          durationMs: z.number(),
          detail: z.string().optional(),
        })
      ),
      progress: z.object({
        applicationId: z.string(),
        completedStages: z.array(z.string()),
        missingStages: z.array(z.string()),
        isComplete: z.boolean(),
        percentComplete: z.number(),
      }),
      decisionReady: z.boolean(),
      totalDurationMs: z.number(),
    }),
    annotations: {
      // Read-only: orchestration writes no outcome. Not idempotent, because each
      // run re-emits the event stream the dashboard animates from.
      readOnlyHint: true,
      idempotentHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Running verification pipeline...',
      invoked: 'Verification pipeline complete',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        decisionReady: true,
        stages: [{ stage: 'detect_duplicate_signals', status: 'completed', durationMs: 2 }],
      },
    },
  })
  @Widget('officer-dashboard')
  async runPipeline(
    input: { applicationId: string; compareToApplicationId?: string; reset?: boolean },
    ctx: ExecutionContext
  ) {
    // Fail fast on an unknown ID rather than emitting ten stage failures.
    const application = this.applicationService.getApplication(input.applicationId);

    if (input.reset ?? true) {
      this.state.reset(input.applicationId);
    }

    const startedAt = Date.now();
    const stages: StageOutcome[] = [];

    for (const stage of PIPELINE_STAGES) {
      stages.push(...(await this.runStage(stage, input, ctx)));
    }

    return {
      applicationId: application.applicationId,
      applicant: this.applicationService.getSummary(application.applicationId),
      stages,
      progress: this.state.getProgress(application.applicationId),
      decisionReady: this.state.isPipelineComplete(application.applicationId),
      totalDurationMs: Date.now() - startedAt,
    };
  }

  /** Run one stage, expanding ocr_extract into one call per document type. */
  private async runStage(
    stage: string,
    input: { applicationId: string; compareToApplicationId?: string },
    ctx: ExecutionContext
  ): Promise<StageOutcome[]> {
    if (!this.toolExecutor.has(stage)) {
      return [
        {
          stage,
          status: 'not_registered',
          durationMs: 0,
          detail:
            `Tool '${stage}' is not registered on this server yet. ` +
            'Expected until the owning role wires it in.',
        },
      ];
    }

    if (stage === NEEDS_COMPARISON_TARGET && !input.compareToApplicationId) {
      return [
        {
          stage,
          status: 'skipped',
          durationMs: 0,
          detail:
            'Optional stage — pass compareToApplicationId to run it. Not required by ' +
            'PipelineCompleteGuard.',
        },
      ];
    }

    if (stage === PER_DOCUMENT_STAGE) {
      const documentTypes = [
        ...new Set(this.applicationService.getDocuments(input.applicationId).map((d) => d.type)),
      ];
      const outcomes: StageOutcome[] = [];
      for (const documentType of documentTypes) {
        outcomes.push(
          await this.invoke(stage, { applicationId: input.applicationId, documentType }, ctx, documentType)
        );
      }
      return outcomes;
    }

    const payload: Record<string, unknown> = { applicationId: input.applicationId };
    if (stage === NEEDS_COMPARISON_TARGET) {
      payload['compareToApplicationId'] = input.compareToApplicationId;
    }

    return [await this.invoke(stage, payload, ctx)];
  }

  private async invoke(
    stage: string,
    payload: unknown,
    ctx: ExecutionContext,
    label?: string
  ): Promise<StageOutcome> {
    const startedAt = Date.now();

    try {
      await this.toolExecutor.call(stage, payload, ctx);
      return {
        stage,
        status: 'completed',
        durationMs: Date.now() - startedAt,
        ...(label ? { detail: `documentType: ${label}` } : {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Logged, recorded, and the chain continues — see the class comment.
      ctx.logger?.warn(`Stage '${stage}' failed; continuing pipeline`, { error: message });
      return {
        stage,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        detail: message,
      };
    }
  }
}
