import { Injectable } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { SopLoaderService, type StepDefinition, type OnErrorPolicy } from './sop-loader.service.js';
import { WorkflowContextStore, type StepResult } from './workflow-context.store.js';
import { ExceptionService } from './exception.service.js';

// ─── Step handler function signature ─────────────────────────────────────────

export type StepHandler = (
  stepName: string,
  input: Record<string, unknown>,
  ctx: ExecutionContext,
) => Promise<unknown>;

// ─── Engine result ────────────────────────────────────────────────────────────

export interface EngineResult {
  workflowId:  string;
  status:      'completed' | 'failed' | 'aborted';
  exitStep?:   string;   // which step triggered abort/fail
  exitReason?: string;
  stepResults: StepResult[];
  data:        Record<string, unknown>; // accumulated step outputs keyed by step name
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * WorkflowEngine — drives step execution from a sop_rules.yaml workflow definition.
 *
 * Each step calls a registered StepHandler. The handler receives:
 *   - stepName  — the step's name from YAML
 *   - input     — the accumulated data object built from all previous steps
 *   - ctx       — the NitroStack ExecutionContext
 *
 * On error, the engine applies the step's on_error policy:
 *   abort           → stop immediately, mark failed
 *   flag_and_abort  → write exception, stop, mark failed
 *   flag_and_route  → write exception + console route, stop, mark failed
 *   continue        → record error, keep going
 */
@Injectable({ deps: [SopLoaderService, WorkflowContextStore, ExceptionService] })
export class WorkflowEngine {
  constructor(
    private readonly sop:        SopLoaderService,
    private readonly store:      WorkflowContextStore,
    private readonly exceptions: ExceptionService,
  ) {}

  /**
   * Run a workflow definition driven by sop_rules.yaml.
   *
   * @param workflowType  The key inside the `workflows` map in sop_rules.yaml
   * @param initialInput  Seed data for the first step (e.g. { file_name, file_content })
   * @param handlers      Map of step name → handler function
   * @param ctx           NitroStack execution context
   */
  async run(
    workflowType:  string,
    initialInput:  Record<string, unknown>,
    handlers:      Map<string, StepHandler>,
    ctx:           ExecutionContext,
  ): Promise<EngineResult> {

    const definition = this.sop.getWorkflow(workflowType);
    const run        = this.store.create(workflowType);
    const { workflowId } = run;

    // Accumulate all outputs here — each step can read prior step results
    const data: Record<string, unknown> = { ...initialInput };

    ctx.logger?.info(`[WorkflowEngine] 🚀 Started workflow "${workflowType}" → ${workflowId}`);

    for (const step of definition.steps) {
      this.store.startStep(workflowId, step.name);
      const startedAt = new Date().toISOString();

      ctx.logger?.info(`[WorkflowEngine] ▶ Step "${step.name}" (tool: ${step.tool})`);

      const handler = handlers.get(step.name);
      if (!handler) {
        // No handler registered — treat same as 'continue' and skip
        const stepResult: StepResult = {
          step:      step.name,
          tool:      step.tool,
          status:    'skipped',
          error:     `No handler registered for step "${step.name}"`,
          startedAt,
          endedAt:   new Date().toISOString(),
        };
        this.store.recordStep(workflowId, stepResult);
        ctx.logger?.warn(`[WorkflowEngine] ⚠ Skipping unregistered step "${step.name}"`);
        continue;
      }

      try {
        const output = await handler(step.name, data, ctx);

        // Merge step output into accumulated data
        if (output && typeof output === 'object') {
          Object.assign(data, output);
        }
        data[`__step_${step.name}`] = output;

        const stepResult: StepResult = {
          step:      step.name,
          tool:      step.tool,
          status:    'success',
          output,
          startedAt,
          endedAt:   new Date().toISOString(),
        };
        this.store.recordStep(workflowId, stepResult);
        ctx.logger?.info(`[WorkflowEngine] ✓ Step "${step.name}" completed`);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        ctx.logger?.error(`[WorkflowEngine] ✗ Step "${step.name}" failed: ${errorMsg}`);

        const stepResult: StepResult = {
          step:      step.name,
          tool:      step.tool,
          status:    'error',
          error:     errorMsg,
          startedAt,
          endedAt:   new Date().toISOString(),
        };
        this.store.recordStep(workflowId, stepResult);

        const abort = await this.handleError(workflowId, step, errorMsg, data);
        if (abort) {
          this.store.finish(workflowId, 'failed', data);
          return {
            workflowId,
            status:      'failed',
            exitStep:    step.name,
            exitReason:  errorMsg,
            stepResults: run.steps,
            data,
          };
        }
        // continue policy — keep going
      }
    }

    // ── All steps ran (or were skipped/continued through errors) ─────────────
    this.store.finish(workflowId, 'completed', data);
    ctx.logger?.info(`[WorkflowEngine] 🏁 Workflow "${workflowId}" completed successfully`);

    return {
      workflowId,
      status:      'completed',
      stepResults: run.steps,
      data,
    };
  }

  // ── Error handler ─────────────────────────────────────────────────────────

  /**
   * Applies the on_error policy for a failed step.
   * @returns true if the workflow should abort, false to continue.
   */
  private async handleError(
    workflowId: string,
    step:       StepDefinition,
    reason:     string,
    data:       Record<string, unknown>,
  ): Promise<boolean> {

    const policy: OnErrorPolicy = step.on_error;

    switch (policy) {
      case 'abort':
        console.error(`[WorkflowEngine] ABORT — step "${step.name}": ${reason}`);
        return true;

      case 'flag_and_abort':
        this.exceptions.flag(workflowId, `Step "${step.name}" failed: ${reason}`, data);
        console.error(`[WorkflowEngine] FLAG+ABORT — exception recorded, aborting`);
        return true;

      case 'flag_and_route': {
        this.exceptions.flag(workflowId, `Step "${step.name}" failed: ${reason}`, data);
        // Route stub — Phase 2 will replace with real Slack/email
        console.error(
          `[WorkflowEngine] FLAG+ROUTE — exception recorded. ` +
          `[STUB] Would route to stakeholder for step "${step.name}"`,
        );
        return true;
      }

      case 'continue':
        console.error(`[WorkflowEngine] CONTINUE — step "${step.name}" error absorbed: ${reason}`);
        return false;

      default:
        console.error(`[WorkflowEngine] Unknown on_error policy "${policy}", defaulting to abort`);
        return true;
    }
  }
}
