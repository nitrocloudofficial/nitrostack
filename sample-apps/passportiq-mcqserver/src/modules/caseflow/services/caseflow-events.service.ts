/**
 * CaseflowEventsService — the caseflow half of the event bus.
 *
 * Why a second events service instead of reusing PipelineEventsService: the
 * pipeline bus carries `pipeline.stage_completed`, whose envelope is a FROZEN
 * contract (contracts.md §3) that Frontend A's timeline parses field by field.
 * Squeezing lifecycle transitions into that shape would either corrupt the
 * timeline or force a contract renegotiation for no benefit. Lifecycle events
 * are a different thing — they carry an ARN, an actor and a rationale — so they
 * get their own names and their own envelope.
 *
 * This service subscribes itself to CaseflowService at module init, so every
 * committed transition reaches the bus without each of the fifteen caseflow
 * tools having to remember to emit. A stage change that does not appear in the
 * console is then impossible by construction rather than by discipline.
 */
import { Injectable, emitEvent, defaultLogger } from '@nitrostack/core';
import type { OnModuleInit } from '@nitrostack/core';
import {
  CASE_CLOSED,
  CASE_OPENED,
  CASE_SLA_BREACHED,
  CASE_STAGE_CHANGED,
  CaseStageChangedEventSchema,
  isTerminal,
  type CaseJournalEntry,
  type CaseSlaBreachedEvent,
  type PassportCase,
} from '../../../contracts/index.js';
import { CaseflowService, type SlaStatus } from './caseflow.service.js';

@Injectable({ deps: [CaseflowService] })
export class CaseflowEventsService implements OnModuleInit {
  private subscribed = false;

  constructor(private readonly caseflow: CaseflowService) {}

  /**
   * Subscribe once, at module init rather than in the constructor.
   *
   * The constructor runs during DI resolution, which can happen more than once
   * across a test file that rebuilds the container; onModuleInit is fired
   * exactly once per application by the bootstrap. The `subscribed` guard makes
   * a double call harmless anyway — a duplicated subscription would emit every
   * transition twice and double-count the console's activity stream.
   */
  onModuleInit(): void {
    if (this.subscribed) return;
    this.subscribed = true;
    this.caseflow.onTransition((entry, kase) => this.publishTransition(entry, kase));
  }

  private publishTransition(entry: CaseJournalEntry, kase: PassportCase): void {
    const payload = {
      arn: kase.arn,
      applicationId: kase.applicationId,
      applicantName: kase.applicantName,
      fromStage: entry.fromStage,
      stage: entry.stage,
      actor: entry.actor,
      by: entry.by,
      tool: entry.tool,
      summary: entry.summary,
      rationale: entry.rationale,
      at: entry.at,
    };

    const parsed = CaseStageChangedEventSchema.safeParse(payload);
    if (!parsed.success) {
      // Loud, but non-fatal: a malformed event must not roll back a transition
      // that the register has already committed.
      defaultLogger.warn(
        `Refusing to emit an off-contract '${CASE_STAGE_CHANGED}' for ${kase.arn}: ` +
          JSON.stringify(parsed.error.flatten().fieldErrors)
      );
      return;
    }

    emitEvent(CASE_STAGE_CHANGED, parsed.data);
    if (isTerminal(entry.stage)) emitEvent(CASE_CLOSED, parsed.data);
  }

  /** Announce a brand new case. Separate name so the console can toast it. */
  caseOpened(kase: PassportCase): void {
    emitEvent(CASE_OPENED, {
      arn: kase.arn,
      applicationId: kase.applicationId,
      applicantName: kase.applicantName,
      applicationType: kase.applicationType,
      tatkal: kase.tatkal,
      openedAt: kase.openedAt,
    });
  }

  /** Announce an SLA breach. Called by the orchestrator, which detects them. */
  slaBreached(kase: PassportCase, sla: SlaStatus): void {
    const payload: CaseSlaBreachedEvent = {
      arn: kase.arn,
      applicationId: kase.applicationId,
      stage: kase.stage,
      slaHours: sla.slaHours,
      hoursInStage: sla.hoursInStage,
      at: new Date().toISOString(),
    };
    emitEvent(CASE_SLA_BREACHED, payload);
  }
}
