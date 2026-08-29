/**
 * PipelineEventsService — the single place any Backend B tool emits from.
 *
 * Tools call `this.events.stageCompleted(ctx, applicationId, stage, result)`
 * instead of `ctx.emit(...)` directly, which buys three things:
 *
 *   1. The `{ applicationId, stage, result }` envelope from contracts.md §3 is
 *      constructed in ONE place, so it cannot drift per-tool. Frontend A's
 *      timeline breaks silently on a malformed envelope, so it is validated here
 *      before it is published.
 *   2. PipelineStateService is updated SYNCHRONOUSLY, before the async bus hop.
 *      `emitEvent` is fire-and-forget, so a stage recorded only via @OnEvent is
 *      racing the next tool call; PipelineCompleteGuard must never lose that race.
 *   3. It works whether or not the ExecutionContext bridge is installed — it
 *      prefers `ctx.emit` (so bridged contexts log through the documented path)
 *      and falls back to the raw `emitEvent` export otherwise.
 */
import { Injectable, emitEvent } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import {
  APPLICATION_DECIDED,
  PIPELINE_STAGE_COMPLETED,
  PipelineStageCompletedEventSchema,
  type ApplicationDecidedEvent,
  type DecisionRecord,
  type PipelineStageCompletedEvent,
} from '../../../contracts/index.js';
import { PipelineStateService } from './pipeline-state.service.js';

/** `application.decided` payload: the contract event plus the full audit row. */
export type DecidedEventPayload = ApplicationDecidedEvent & { record: DecisionRecord };

@Injectable({ deps: [PipelineStateService] })
export class PipelineEventsService {
  constructor(private readonly state: PipelineStateService) {}

  /**
   * Announce that a pipeline stage finished.
   *
   * @param result must be a JSON object — contracts.md §3 types `result` as
   *        `z.record(z.unknown())`. An array or scalar is rejected loudly here
   *        rather than quietly breaking the timeline.
   */
  stageCompleted(
    ctx: ExecutionContext | undefined,
    applicationId: string,
    stage: string,
    result: unknown
  ): PipelineStageCompletedEvent {
    const envelope = { applicationId, stage, result };
    const parsed = PipelineStageCompletedEventSchema.safeParse(envelope);

    if (!parsed.success) {
      // Failing here is correct: an off-contract event is worse than no event,
      // because Frontend A's timeline would silently render nothing and the bug
      // would surface during the demo instead of now.
      throw new Error(
        `Refusing to emit an off-contract '${PIPELINE_STAGE_COMPLETED}' event for ` +
          `stage '${stage}'. contracts.md §3 requires ` +
          `{ applicationId: string, stage: string, result: object }.\n` +
          JSON.stringify(parsed.error.format(), null, 2)
      );
    }

    // Synchronous first — see (2) in the class comment.
    this.state.recordStage(applicationId, stage, parsed.data.result);

    this.publish(ctx, PIPELINE_STAGE_COMPLETED, parsed.data);
    ctx?.logger?.info(`stage_completed: ${stage}`, { applicationId, stage });

    return parsed.data;
  }

  /**
   * Announce an officer's final decision. Frontend B's audit trail listens here.
   *
   * The event carries the lean ApplicationDecidedEvent fields for consumers that
   * only need "what was decided", plus the full DecisionRecord under `record` so
   * PipelineNotificationService can write the audit row without a second lookup.
   */
  applicationDecided(
    ctx: ExecutionContext | undefined,
    event: DecidedEventPayload
  ): DecidedEventPayload {
    this.publish(ctx, APPLICATION_DECIDED, event);
    ctx?.logger?.info(`application_decided: ${event.decision}`, {
      applicationId: event.applicationId,
      officer: event.officer,
    });
    return event;
  }

  /**
   * Publish on NitroStack's event bus.
   *
   * Prefers the bridged `ctx.emit` so tool-scoped emission stays consistent with
   * what the build docs describe, and falls back to the `emitEvent` export when
   * the context is absent (services, tests) or unbridged.
   */
  private publish(ctx: ExecutionContext | undefined, event: string, payload: unknown): void {
    const contextEmit = (ctx as { emit?: (event: string, payload: unknown) => void } | undefined)
      ?.emit;

    if (typeof contextEmit === 'function') {
      contextEmit.call(ctx, event, payload);
      return;
    }

    emitEvent(event, payload);
  }
}
