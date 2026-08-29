/**
 * Health checks for the lifecycle layer.
 *
 * TWO DISTINCT FAILURE MODES, TWO PROBES
 * -------------------------------------
 *   caseflow-register    The case register exists but is empty or wedged. The
 *                        symptom is a blank lifecycle board with every tool still
 *                        answering 200 — indistinguishable from "no applications
 *                        today" unless something says otherwise.
 *
 *   caseflow-orchestrator  The lifecycle loop is armed but silent. Same shape of
 *                        problem as the investigation autopilot: nothing crashes,
 *                        cases simply stop moving. A container in that state is
 *                        worse than a dead one, because it looks fine.
 *
 * WHY NEITHER GOES 'down' WHEN THE LOOP IS SIMPLY OFF
 * -------------------------------------------------
 * Manual mode is supported and used: local stdio development, the acceptance
 * suite, and the scripted demo all run with PASSPORTIQ_CASEFLOW=false and drive
 * `advance_case` / `caseflow_autopilot action=tick` by hand. Reporting 'down' for
 * a supported configuration would make NitroCloud's readiness probe restart a
 * perfectly healthy container in a loop. Off => 'up' with an explanation.
 *
 * A @HealthCheck class must appear in a module's `providers` for core to resolve
 * and register it. Under `controllers` it contributes nothing, silently.
 */
import { HealthCheck, Injectable } from '@nitrostack/core';
import type { HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import { WAITING_ON_HUMAN, isTerminal } from '../../../contracts/index.js';
import { CaseOrchestratorService } from '../services/case-orchestrator.service.js';
import { CaseflowDecisionBridge } from '../services/caseflow-decision.bridge.js';
import { CaseflowService } from '../services/caseflow.service.js';

/** A tick "running" longer than this is stuck, not slow. */
const STALLED_TICK_MS = 3 * 60 * 1000;

@HealthCheck({
  name: 'caseflow-register',
  description: 'Passport case register is populated and the state machine is intact',
})
@Injectable({ deps: [CaseflowService, CaseflowDecisionBridge] })
export class CaseflowRegisterHealthCheck implements HealthCheckInterface {
  constructor(
    private readonly caseflow: CaseflowService,
    private readonly bridge: CaseflowDecisionBridge
  ) {}

  check(): HealthCheckResult {
    const cases = this.caseflow.getAll();
    const breached = cases.filter((k) => this.caseflow.sla(k).breached);
    const waiting = cases.filter((k) => WAITING_ON_HUMAN.includes(k.stage));
    const closed = cases.filter((k) => isTerminal(k.stage));
    const bridgeStats = this.bridge.stats();

    const details = {
      cases: cases.length,
      inFlight: cases.length - closed.length,
      waitingOnHuman: waiting.length,
      slaBreached: breached.length,
      closed: closed.length,
      stagesOccupied: new Set(cases.map((k) => k.stage)).size,
      journalEntries: cases.reduce((sum, k) => sum + k.journal.length, 0),
      decisionBridge: bridgeStats,
    };

    if (cases.length === 0) {
      return {
        status: 'degraded',
        message:
          'The case register is empty. Seeding from the applicant pool did not run, so the ' +
          'lifecycle board will render blank and no case tool can resolve an ARN. Check that ' +
          'PipelineModule is registered before CaseflowModule in app.module.ts.',
        details,
      };
    }

    if (bridgeStats.lastError !== null) {
      return {
        status: 'degraded',
        message:
          `The officer-decision bridge failed on its last event: ${bridgeStats.lastError}. ` +
          `Decisions are being recorded in the audit log but cases are not leaving ` +
          `officer_review.`,
        details,
      };
    }

    return {
      status: 'up',
      message:
        `${cases.length} passport case(s) on the register: ${details.inFlight} in flight, ` +
        `${waiting.length} awaiting a human, ${closed.length} closed` +
        (breached.length > 0 ? `, ${breached.length} past SLA.` : '.'),
      details,
    };
  }
}

@HealthCheck({
  name: 'caseflow-orchestrator',
  description: 'Autonomous lifecycle loop is armed and moving cases',
})
@Injectable({ deps: [CaseOrchestratorService] })
export class CaseflowOrchestratorHealthCheck implements HealthCheckInterface {
  constructor(private readonly orchestrator: CaseOrchestratorService) {}

  check(): HealthCheckResult {
    const status = this.orchestrator.status();

    const details = {
      enabled: status.enabled,
      mode: status.mode,
      intervalSeconds: status.intervalSeconds,
      ticks: status.ticks,
      transitionsExecuted: status.transitionsExecuted,
      handoffsToOfficer: status.handoffsToOfficer,
      casesClosed: status.casesClosed,
      slaBreaches: status.slaBreaches,
      lastTickAt: status.lastTickAt,
      nextTickEta: status.nextTickEta,
    };

    if (!status.enabled) {
      return {
        status: 'up',
        message:
          'Lifecycle orchestrator disabled by configuration — advance_case and ' +
          'caseflow_autopilot action=tick still drive cases on demand. Set ' +
          'PASSPORTIQ_CASEFLOW=true to arm the timer.',
        details,
      };
    }

    if (status.mode === 'stopped') {
      return {
        status: 'degraded',
        message:
          `The lifecycle loop is enabled but not running: ${status.detail} Cases will sit in ` +
          `their current stage until it is armed (caseflow_autopilot action=start).`,
        details,
      };
    }

    if (status.mode === 'running' && status.lastTickAt !== null) {
      const elapsed = Date.now() - Date.parse(status.lastTickAt);
      if (Number.isFinite(elapsed) && elapsed > STALLED_TICK_MS) {
        return {
          status: 'degraded',
          message:
            `A lifecycle pass has been in progress for ${Math.round(elapsed / 1000)}s on ` +
            `${status.currentArn ?? 'an unknown case'} — far longer than any legitimate pass. ` +
            `The loop is stuck and the re-entrancy guard is skipping every subsequent tick.`,
          details,
        };
      }
    }

    return {
      status: 'up',
      message:
        `Lifecycle orchestrator ${status.mode}: ${status.ticks} pass(es), ` +
        `${status.transitionsExecuted} transition(s) executed autonomously, ` +
        `${status.handoffsToOfficer} case(s) handed to a human officer, ` +
        `${status.casesClosed} closed.`,
      details,
    };
  }
}
