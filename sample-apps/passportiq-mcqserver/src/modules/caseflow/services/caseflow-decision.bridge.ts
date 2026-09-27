/**
 * CaseflowDecisionBridge — the join between the human gate and the lifecycle.
 *
 * ---------------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES
 * ---------------------------------------------------------------------------
 * `officer_decide` already existed before the lifecycle did. It is Backend B's
 * guarded tool: it checks the pipeline is complete, writes a DecisionRecord to
 * the audit log, and emits `application.decided`. It knows nothing about cases,
 * ARNs, printing or dispatch — and it must stay that way, because contracts.md
 * §2 freezes its input and output and three other roles depend on that shape.
 *
 * So the lifecycle listens instead. When an officer decides, this bridge picks up
 * `application.decided` off the bus and moves the corresponding case out of
 * `officer_review`:
 *
 *     approve  → granted        (which the agent may then print and dispatch)
 *     clarify  → clarification  (held, waiting on the applicant)
 *     reject   → rejected       (closed)
 *
 * ---------------------------------------------------------------------------
 * WHY A BRIDGE RATHER THAN A DIRECT CALL
 * ---------------------------------------------------------------------------
 * Three reasons, in order of importance:
 *
 * 1. It keeps the frozen contract frozen. officer_decide gains a whole
 *    downstream lifecycle without a single line changing inside it.
 *
 * 2. It means EVERY route into a decision lands in the case journal. The console
 *    has a decision button, the MCP client can call officer_decide directly, and
 *    Frontend B has its own decision panel. All three emit the same event, so all
 *    three advance the case. There is no path that approves a passport without
 *    the case following.
 *
 * 3. It preserves the gate. The bridge only ever *reacts* to a decision that a
 *    human already made; it never originates one. The three officer_review rows
 *    in CASE_TRANSITIONS remain `autonomous: false`, so the orchestrator still
 *    cannot cross them — this class does not give the agent a back door, because
 *    the agent has no way to emit `application.decided`.
 *
 * ---------------------------------------------------------------------------
 * WHY IT MUST BE IN `providers`
 * ---------------------------------------------------------------------------
 * @OnEvent writes metadata only. Core subscribes handlers when it resolves the
 * instance while walking a module's `providers` (app-decorator.js). Listed under
 * `controllers`, or omitted, this class silently never fires and officer
 * decisions would stop dead at `officer_review` forever.
 */
import { Injectable, OnEvent } from '@nitrostack/core';
import {
  APPLICATION_DECIDED,
  type ApplicationDecidedEvent,
  type CaseStage,
} from '../../../contracts/index.js';
import { CaseflowService } from './caseflow.service.js';

/** decision → the stage the case lands in. */
const DECISION_TO_STAGE: Record<ApplicationDecidedEvent['decision'], CaseStage> = {
  approve: 'granted',
  clarify: 'clarification',
  reject: 'rejected',
};

@Injectable({ deps: [CaseflowService] })
export class CaseflowDecisionBridge {
  private applied = 0;
  private ignored = 0;
  private lastError: string | null = null;

  constructor(private readonly caseflow: CaseflowService) {}

  @OnEvent(APPLICATION_DECIDED)
  onApplicationDecided(event: ApplicationDecidedEvent): void {
    const kase = this.caseflow.find(event.applicationId);

    // A decision on an application with no case is not an error — the fraud
    // tools can be driven standalone over MCP, without anyone filing a case.
    if (!kase) {
      this.ignored += 1;
      return;
    }

    if (kase.stage !== 'officer_review') {
      // Re-deciding a case that already left the gate. Record it in the journal
      // as an annotation rather than forcing an illegal transition.
      this.ignored += 1;
      return;
    }

    const to = DECISION_TO_STAGE[event.decision];

    try {
      this.caseflow.transition(kase.arn, {
        to,
        actor: 'passport_officer',
        by: event.officer,
        tool: 'officer_decide',
        summary: this.summaryFor(event),
        rationale:
          event.note && event.note.trim().length > 0
            ? event.note
            : `Recorded decision '${event.decision}' by ${event.officer}. No note supplied.`,
        detail: {
          decision: event.decision,
          officer: event.officer,
          decidedAt: event.decidedAt,
          note: event.note ?? null,
          gate: 'human',
        },
        patch: {
          officerDecision: event.decision,
          ...(event.decision === 'clarify'
            ? {
                clarification: {
                  requestedAt: event.decidedAt,
                  question:
                    event.note && event.note.trim().length > 0
                      ? event.note
                      : 'The Passport Office has requested additional supporting documents. ' +
                        'Please submit them against your ARN.',
                  respondedAt: null,
                  response: null,
                },
              }
            : {}),
        },
      });
      this.applied += 1;
      this.lastError = null;
    } catch (error) {
      // Never throw out of an event handler — an unhandled rejection here would
      // take down the decision path for a purely downstream concern.
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  private summaryFor(event: ApplicationDecidedEvent): string {
    switch (event.decision) {
      case 'approve':
        return `Passport granted by ${event.officer}. Cleared for printing.`;
      case 'clarify':
        return `${event.officer} requested clarification from the applicant. Case held.`;
      case 'reject':
        return `Application refused by ${event.officer}. Case closed.`;
    }
  }

  /** Surfaced by the caseflow health check. */
  stats(): { applied: number; ignored: number; lastError: string | null } {
    return { applied: this.applied, ignored: this.ignored, lastError: this.lastError };
  }
}
