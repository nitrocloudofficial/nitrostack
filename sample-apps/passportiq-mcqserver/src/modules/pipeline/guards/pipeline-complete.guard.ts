/**
 * PipelineCompleteGuard — the human-in-the-loop enforcement point.
 *
 * Blocks officer_decide until every required verification stage has reported
 * completion for that specific applicationId. This is the mechanism behind the
 * project's central claim: the AI never auto-approves, and no decision is
 * recorded against an application nobody has actually finished checking.
 *
 * ---------------------------------------------------------------------------
 * HOW IT SEES THE APPLICATION ID
 * ---------------------------------------------------------------------------
 * @nitrostack/core invokes guards as `guard.canActivate(context)`
 * (dist/core/tool.js:59) — the tool INPUT is never passed. Since `applicationId`
 * only exists in the input, the guard reads `ctx.input`, which is attached by
 * installExecutionContextBridge() at boot. If the bridge is missing, this guard
 * denies rather than allowing an unverifiable decision through: failing closed is
 * the only safe direction for an approval gate.
 *
 * ---------------------------------------------------------------------------
 * WHY IT THROWS INSTEAD OF RETURNING false
 * ---------------------------------------------------------------------------
 * A `false` return produces core's generic "Access denied by guard", which tells
 * the officer nothing. Throwing lets the message name the missing stages, which
 * turns a blocked click into a usable explanation on stage:
 *
 *   "Cannot record a decision on PIQ-2026-2001 yet — 3 verification stage(s)
 *    have not completed: evaluate_rules, score_risk, explain_risk."
 */
import { Injectable } from '@nitrostack/core';
import type { ExecutionContext, Guard, GuardConstructor } from '@nitrostack/core';
import { REQUIRED_STAGES_BEFORE_DECISION } from '../../../contracts/index.js';
import { PipelineStateService } from '../services/pipeline-state.service.js';

/** Escape hatch for frontend devs testing decision controls in isolation. */
const BYPASS_ENV_VAR = 'PASSPORTIQ_ALLOW_UNGUARDED_DECISION';

export class PipelineIncompleteError extends Error {
  constructor(
    readonly applicationId: string,
    readonly missingStages: readonly string[],
    readonly completedStages: readonly string[]
  ) {
    super(
      `Cannot record a decision on ${applicationId} yet — ` +
        `${missingStages.length} verification stage(s) have not completed: ` +
        `${missingStages.join(', ')}. ` +
        `Completed so far (${completedStages.length}/${REQUIRED_STAGES_BEFORE_DECISION.length}): ` +
        `${completedStages.length > 0 ? completedStages.join(', ') : 'none'}. ` +
        `Run the verification pipeline for this application first.`
    );
    this.name = 'PipelineIncompleteError';
  }
}

@Injectable({ deps: [PipelineStateService] })
export class PipelineCompleteGuard implements Guard {
  constructor(private readonly state: PipelineStateService) {}

  canActivate(context: ExecutionContext): boolean {
    const input = (context as { input?: Record<string, unknown> }).input;

    if (!input || typeof input !== 'object') {
      throw new Error(
        'PipelineCompleteGuard could not read the tool input, so it cannot tell which ' +
          'application is being decided. This means installExecutionContextBridge() did not ' +
          'run — see src/bootstrap/execution-context.bridge.ts. Denying the decision: an ' +
          'approval gate must fail closed.'
      );
    }

    const applicationId = input['applicationId'];
    if (typeof applicationId !== 'string' || applicationId.length === 0) {
      throw new Error(
        'PipelineCompleteGuard requires a non-empty string `applicationId` in the tool input.'
      );
    }

    if (process.env[BYPASS_ENV_VAR] === 'true') {
      context.logger?.warn(
        `⚠️  ${BYPASS_ENV_VAR}=true — PipelineCompleteGuard bypassed for ${applicationId}. ` +
          'Never present the demo in this mode: the human-in-the-loop gate is the pitch.'
      );
      return true;
    }

    const missingStages = this.state.getMissingStages(applicationId);

    if (missingStages.length > 0) {
      throw new PipelineIncompleteError(
        applicationId,
        missingStages,
        this.state.getCompletedStages(applicationId)
      );
    }

    context.logger?.info(
      `PipelineCompleteGuard: all ${REQUIRED_STAGES_BEFORE_DECISION.length} required stages ` +
        `complete for ${applicationId} — decision allowed.`
    );

    return true;
  }
}

/**
 * The same class, retyped for @UseGuards.
 *
 * WHY THIS EXISTS
 * ---------------
 * @nitrostack/core types guards as
 *   `GuardConstructor = new (...args: unknown[]) => Guard`
 * (dist/core/guards/guard.interface.d.ts), which only accepts guards with
 * NO-ARGUMENT constructors. Every guard in core's own sample apps is
 * dependency-free, so the gap never shows up there.
 *
 * PipelineCompleteGuard must inject PipelineStateService — it cannot answer
 * "which stages have completed?" otherwise — so its constructor is
 * `(state: PipelineStateService)`, and passing the class directly to @UseGuards
 * is a compile error: `unknown` is not assignable to `PipelineStateService`.
 *
 * Removing the constructor parameter is not an option: the guard would then have
 * no way to read pipeline state, and `emitDecoratorMetadata` needs the real
 * parameter type for DI to inject the singleton.
 *
 * So we retype rather than restructure. This is the SAME constructor object at
 * runtime — the DI container resolves it to the same singleton the tools write
 * to — with only its static call signature widened to what core's alias demands.
 * Confined to this one export so no call site needs an inline cast.
 */
export const PipelineCompleteGuardRef = PipelineCompleteGuard as unknown as GuardConstructor;
