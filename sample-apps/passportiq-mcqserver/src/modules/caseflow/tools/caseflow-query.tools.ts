/**
 * CaseflowQueryTools — the read + control surface over the case register.
 *
 * The twelve tools in intake.tools.ts and processing.tools.ts *move* cases. These
 * six let an agent (or an officer, or a citizen) see the process and decide what
 * to do about it:
 *
 *   get_case_file                 one case, whole: artefacts + journal + next step
 *   list_passport_cases           filtered register — the officer's worklist
 *   get_caseflow_board            the whole pipeline as stage columns with SLA clocks
 *   track_passport_application    the citizen view — no internal reasoning leaked
 *   advance_case                  drive ONE case forward autonomously, stopping at the gate
 *   caseflow_autopilot            arm / disarm / single-step the lifecycle loop
 *
 * WHY `advance_case` IS A TOOL AND NOT JUST A BUTTON
 * ------------------------------------------------
 * It is the agentic primitive. An LLM client that has read `get_caseflow_board`
 * can call `advance_case` on the case it judges most urgent and get back the
 * exact list of transitions performed, each with the rationale the orchestrator
 * composed *before* acting, plus the reason it stopped. That closes the
 * perceive → decide → act → explain loop entirely inside MCP, with no bespoke
 * agent runtime on the client side.
 *
 * WHY `track_passport_application` DELIBERATELY SHOWS LESS
 * ------------------------------------------------------
 * A citizen tracking their ARN must not see the fraud-graph reasoning, the
 * officer's private notes, or the agent's internal rationale — that is
 * information the applicant is not entitled to and would leak the detection
 * heuristics. This tool projects only the stage, the artefacts the citizen owns
 * (receipt, appointment, tracking number) and a plain-language status line.
 */
import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import {
  AdvanceCaseInputSchema,
  CASE_TRANSITIONS,
  CaseflowAutopilotControlInputSchema,
  ListCasesInputSchema,
  STAGE_LABELS,
  TrackInputSchema,
  WAITING_ON_HUMAN,
  autonomousNext,
  explainHold,
  isTerminal,
  progressPercent,
  transitionsFrom,
  type PassportCase,
} from '../../../contracts/index.js';
import { CaseOrchestratorService } from '../services/case-orchestrator.service.js';
import { CaseflowService } from '../services/caseflow.service.js';

const ArnHandleInput = z.object({
  arn: z
    .string()
    .min(1)
    .describe('The ARN (e.g. ARN-2026-000123) or the PassportIQ application id. Either resolves.'),
});

@Injectable({ deps: [CaseflowService, CaseOrchestratorService] })
export class CaseflowQueryTools {
  constructor(
    private readonly caseflow: CaseflowService,
    private readonly orchestrator: CaseOrchestratorService
  ) {}

  // =========================================================================
  // 1. The case file
  // =========================================================================

  @Tool({
    name: 'get_case_file',
    description:
      'Read one passport case end to end: current lifecycle stage, SLA clock, every ' +
      'artefact produced so far (fee receipt, PSK appointment and counter results, ' +
      'police verification report, printed booklet, dispatch tracking), the complete ' +
      'journal of who moved it and why, and the single next step available. This is the ' +
      'tool to call before acting on a case.',
    inputSchema: ArnHandleInput,
  })
  async getCaseFile(input: z.infer<typeof ArnHandleInput>) {
    const kase = this.caseflow.get(input.arn);
    const sla = this.caseflow.sla(kase);
    const next = autonomousNext(kase.stage);
    const legal = transitionsFrom(kase.stage);

    return {
      arn: kase.arn,
      applicationId: kase.applicationId,
      applicantName: kase.applicantName,
      applicationType: kase.applicationType,
      tatkal: kase.tatkal,

      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      progressPercent: progressPercent(kase.stage),
      stageEnteredAt: kase.stageEnteredAt,
      openedAt: kase.openedAt,
      closedAt: kase.closedAt,
      terminal: isTerminal(kase.stage),
      waitingOnHuman: WAITING_ON_HUMAN.includes(kase.stage),

      sla: {
        targetHours: sla.slaHours,
        hoursInStage: sla.hoursInStage,
        breached: sla.breached,
        consumedPercent: Math.round(sla.consumed * 100),
        dueAt: sla.dueAt,
      },

      officerDecision: kase.officerDecision,

      artefacts: {
        fee: kase.fee,
        appointment: kase.appointment,
        pskVisit: kase.pskVisit,
        policeVerification: kase.policeVerification,
        clarification: kase.clarification,
        booklet: kase.booklet,
        dispatch: kase.dispatch,
      },

      nextStep: next
        ? {
            tool: next.tool,
            label: next.label,
            actor: next.actor,
            autonomous: true,
            requires: next.requires ?? null,
            toStage: next.to,
          }
        : null,
      hold: next ? null : explainHold(kase.stage),

      /** Everything legally possible from here, including the human-only moves. */
      legalTransitions: legal.map((t) => ({
        tool: t.tool,
        toStage: t.to,
        label: t.label,
        actor: t.actor,
        autonomous: t.autonomous,
        requires: t.requires ?? null,
      })),

      journal: kase.journal.map((entry) => ({
        seq: entry.seq,
        at: entry.at,
        from: entry.fromStage,
        to: entry.stage,
        actor: entry.actor,
        by: entry.by,
        tool: entry.tool,
        summary: entry.summary,
        rationale: entry.rationale,
        detail: entry.detail,
      })),
    };
  }

  // =========================================================================
  // 2. The worklist
  // =========================================================================

  @Tool({
    name: 'list_passport_cases',
    description:
      'List passport cases in the register, optionally filtered by lifecycle stage, ' +
      'by whether they are blocked on a human, or by SLA breach. Use waitingOnHuman=true ' +
      "to get exactly the officer's inbox — the cases PassportIQ has carried as far as it " +
      'is allowed to and handed over. Returns a stage histogram alongside the rows.',
    inputSchema: ListCasesInputSchema,
  })
  async listCases(input: z.infer<typeof ListCasesInputSchema>) {
    const all = this.caseflow.getAll();

    let rows = all;
    if (input.stage) rows = rows.filter((k) => k.stage === input.stage);
    if (input.waitingOnHuman === true) rows = rows.filter((k) => WAITING_ON_HUMAN.includes(k.stage));
    if (input.waitingOnHuman === false) rows = rows.filter((k) => !WAITING_ON_HUMAN.includes(k.stage));
    if (input.breachedOnly) rows = rows.filter((k) => this.caseflow.sla(k).breached);

    // Most urgent first: breached, then tatkal, then most SLA consumed.
    const scored = rows
      .map((kase) => ({ kase, sla: this.caseflow.sla(kase) }))
      .sort((a, b) => {
        if (a.sla.breached !== b.sla.breached) return a.sla.breached ? -1 : 1;
        if (a.kase.tatkal !== b.kase.tatkal) return a.kase.tatkal ? -1 : 1;
        return b.sla.consumed - a.sla.consumed;
      })
      .slice(0, input.limit);

    const histogram: Record<string, number> = {};
    for (const kase of all) histogram[kase.stage] = (histogram[kase.stage] ?? 0) + 1;

    return {
      total: all.length,
      matched: rows.length,
      returned: scored.length,
      histogram,
      waitingOnHumanCount: all.filter((k) => WAITING_ON_HUMAN.includes(k.stage)).length,
      breachedCount: all.filter((k) => this.caseflow.sla(k).breached).length,
      closedCount: all.filter((k) => isTerminal(k.stage)).length,
      cases: scored.map(({ kase, sla }) => ({
        arn: kase.arn,
        applicationId: kase.applicationId,
        applicantName: kase.applicantName,
        applicationType: kase.applicationType,
        tatkal: kase.tatkal,
        stage: kase.stage,
        stageLabel: STAGE_LABELS[kase.stage],
        progressPercent: progressPercent(kase.stage),
        hoursInStage: sla.hoursInStage,
        slaTargetHours: sla.slaHours,
        slaBreached: sla.breached,
        waitingOnHuman: WAITING_ON_HUMAN.includes(kase.stage),
        nextAutonomousStep: autonomousNext(kase.stage)?.label ?? null,
        hold: autonomousNext(kase.stage) ? null : explainHold(kase.stage),
      })),
    };
  }

  // =========================================================================
  // 3. The board
  // =========================================================================

  @Tool({
    name: 'get_caseflow_board',
    description:
      'The whole passport pipeline as a board: one column per lifecycle stage, in ' +
      'process order, every case as a card with its SLA clock and its next available ' +
      'step. Also returns the lifecycle definition itself (every declared transition, ' +
      'and which of them PassportIQ is permitted to perform unattended) so a client can ' +
      'reason about the process without hard-coding it.',
    inputSchema: z.object({}),
  })
  async getBoard() {
    const board = this.caseflow.board();
    const all = this.caseflow.getAll();
    const orch = this.orchestrator.status();

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        cases: all.length,
        inFlight: all.filter((k) => !isTerminal(k.stage)).length,
        waitingOnHuman: all.filter((k) => WAITING_ON_HUMAN.includes(k.stage)).length,
        breached: all.filter((k) => this.caseflow.sla(k).breached).length,
        closed: all.filter((k) => isTerminal(k.stage)).length,
      },
      columns: board.map((col) => ({
        stage: col.stage,
        label: col.label,
        waitingOnHuman: col.waitingOnHuman,
        terminal: col.terminal,
        count: col.cases.length,
        cases: col.cases.map((c) => ({
          ...c,
          slaBreached: c.sla.breached,
          hoursInStage: c.sla.hoursInStage,
        })),
      })),
      orchestrator: {
        enabled: orch.enabled,
        mode: orch.mode,
        ticks: orch.ticks,
        transitionsExecuted: orch.transitionsExecuted,
        handoffsToOfficer: orch.handoffsToOfficer,
        casesClosed: orch.casesClosed,
        lastTickAt: orch.lastTickAt,
        detail: orch.detail,
      },
      /**
       * The lifecycle as data. `autonomous: false` rows are the human gates — the
       * three officer_decide branches and the applicant's clarification reply.
       */
      lifecycle: CASE_TRANSITIONS.map((t) => ({
        from: t.from,
        to: t.to,
        tool: t.tool,
        actor: t.actor,
        label: t.label,
        autonomous: t.autonomous,
        slaHours: t.slaHours,
        requires: t.requires ?? null,
      })),
    };
  }

  // =========================================================================
  // 4. The citizen view
  // =========================================================================

  @Tool({
    name: 'track_passport_application',
    description:
      'CITIZEN-FACING STATUS CHECK. Track a passport application by ARN and get the ' +
      'plain-language status a Passport Seva enquiry counter would read out: which stage ' +
      'it has reached, what happens next, the expected date, and the applicant-owned ' +
      'artefacts (fee receipt, appointment slot, Speed Post tracking number). Internal ' +
      'fraud reasoning, officer notes and agent rationale are deliberately NOT returned.',
    inputSchema: TrackInputSchema,
  })
  async track(input: z.infer<typeof TrackInputSchema>) {
    const kase = this.caseflow.get(input.arn);
    const sla = this.caseflow.sla(kase);

    // A citizen-safe timeline: the milestones, not the reasoning.
    const milestones = kase.journal
      .filter((e) => e.fromStage !== null || e.stage === 'submitted')
      .map((e) => ({
        at: e.at,
        stage: e.stage,
        stageLabel: STAGE_LABELS[e.stage],
        milestone: e.summary,
      }));

    return {
      arn: kase.arn,
      applicantName: kase.applicantName,
      applicationType: kase.applicationType,
      scheme: kase.tatkal ? 'Tatkal' : 'Normal',
      status: STAGE_LABELS[kase.stage],
      statusMessage: this.citizenMessage(kase),
      progressPercent: progressPercent(kase.stage),
      filedOn: kase.openedAt,
      lastUpdated: kase.stageEnteredAt,
      expectedBy: sla.dueAt,
      closed: isTerminal(kase.stage),
      yourDetails: {
        feeReceipt: kase.fee
          ? { receiptNo: kase.fee.receiptNo, amount: kase.fee.amount, paidAt: kase.fee.paidAt }
          : null,
        appointment: kase.appointment
          ? {
              centre: kase.appointment.pskName,
              slot: kase.appointment.slot,
              tokenNo: kase.appointment.tokenNo,
            }
          : null,
        passportNumber: kase.booklet?.passportNumber ?? null,
        dispatch: kase.dispatch
          ? {
              courier: kase.dispatch.courier,
              trackingNo: kase.dispatch.trackingNo,
              deliveredAt: kase.dispatch.deliveredAt,
            }
          : null,
      },
      actionRequiredFromYou:
        kase.stage === 'clarification'
          ? (kase.clarification?.question ?? 'Additional information has been requested.')
          : kase.stage === 'submitted'
            ? 'Pay the application fee to proceed.'
            : null,
      timeline: milestones,
    };
  }

  private citizenMessage(kase: PassportCase): string {
    switch (kase.stage) {
      case 'submitted':
        return 'Your application has been received and an ARN allotted. Please pay the application fee.';
      case 'fee_paid':
        return 'Fee received. A Passport Seva Kendra appointment is being allotted to you.';
      case 'appointment_booked':
        return `Appointment allotted at ${kase.appointment?.pskName ?? 'your PSK'}. Please attend with your original documents.`;
      case 'psk_visit_complete':
        return 'Your documents and biometrics have been accepted at the Kendra. Verification is under way.';
      case 'verification_running':
        return 'Your application is under verification by the Passport Office.';
      case 'police_verification':
        return `Police verification is in progress with ${kase.policeVerification?.station ?? 'your local police station'}.`;
      case 'officer_review':
        return 'Your application is with the Passport Officer for a granting decision.';
      case 'clarification':
        return 'The Passport Office has requested additional information from you. Please respond.';
      case 'granted':
        return 'Your passport has been granted and is queued for printing.';
      case 'printing':
        return `Your passport has been printed${kase.booklet ? ` (No. ${kase.booklet.passportNumber})` : ''} and will be dispatched shortly.`;
      case 'dispatched':
        return `Your passport has been dispatched by ${kase.dispatch?.courier ?? 'Speed Post'}${
          kase.dispatch ? `, tracking ${kase.dispatch.trackingNo}` : ''
        }.`;
      case 'delivered':
        return 'Your passport has been delivered. This application is closed.';
      case 'rejected':
        return 'Your application has not been granted. A refusal letter has been issued with the reasons.';
      case 'withdrawn':
        return 'This application was withdrawn at your request.';
      default:
        return STAGE_LABELS[kase.stage];
    }
  }

  // =========================================================================
  // 5. Drive one case forward
  // =========================================================================

  @Tool({
    name: 'advance_case',
    description:
      'AGENTIC DRIVER. Move one passport case forward through as many lifecycle steps as ' +
      'PassportIQ is permitted to perform unattended, then stop and explain why it ' +
      'stopped. Each step returns the reasoning composed BEFORE the action was taken, ' +
      'the tool invoked, and the outcome. The loop always halts at officer_review — ' +
      'granting a passport is reserved for a human and no number of steps will cross it.',
    inputSchema: AdvanceCaseInputSchema,
  })
  async advanceCase(input: z.infer<typeof AdvanceCaseInputSchema>) {
    const before = this.caseflow.get(input.arn);
    const fromStage = before.stage;

    const steps = await this.orchestrator.advance(input.arn, input.maxSteps);

    const after = this.caseflow.get(input.arn);
    const next = autonomousNext(after.stage);

    // The orchestrator records its own refusal to act as a step with tool '—'.
    // That is the agent working correctly — stopping at the officer gate is the
    // designed outcome, not an error — so it must never be counted as a failure
    // or the console will paint a successful hand-off red.
    const declined = steps.filter((s) => s.tool === '—');
    const failed = steps.filter((s) => !s.ok && s.tool !== '—');
    const executed = steps.filter((s) => s.tool !== '—');

    return {
      arn: after.arn,
      applicantName: after.applicantName,
      fromStage,
      fromStageLabel: STAGE_LABELS[fromStage],
      toStage: after.stage,
      toStageLabel: STAGE_LABELS[after.stage],
      progressPercent: progressPercent(after.stage),
      stepsRequested: input.maxSteps,
      stepsExecuted: executed.length,
      stepsFailed: failed.length,
      steps: steps.map((s) => ({
        from: s.from,
        to: s.to,
        tool: s.tool,
        ok: s.ok,
        /** The agent's reasoning, written before it acted. */
        rationale: s.rationale,
        outcome: s.outcome,
        at: s.at,
        durationMs: s.durationMs,
      })),
      stopped:
        declined.length > 0
          ? (declined[declined.length - 1]?.outcome ?? explainHold(after.stage))
          : failed.length > 0
            ? `Blocked: ${failed[failed.length - 1]?.outcome ?? 'unknown error'}`
            : next
              ? `Step budget of ${input.maxSteps} exhausted. Next available: ${next.label}.`
              : explainHold(after.stage),
      handedToOfficer: after.stage === 'officer_review',
      waitingOnHuman: WAITING_ON_HUMAN.includes(after.stage),
      nextAutonomousStep: next?.label ?? null,
    };
  }

  // =========================================================================
  // 6. The lifecycle loop
  // =========================================================================

  @Tool({
    name: 'caseflow_autopilot',
    description:
      'Control the autonomous lifecycle loop that walks the entire case register on a ' +
      'timer: arm it (start), disarm it (stop), or run exactly one pass right now (tick). ' +
      'A tick perceives every open case, prioritises by tatkal and SLA breach, executes ' +
      'the permitted transitions, and narrates what it did and what it refused to do. ' +
      'Use action=tick for a deterministic, demonstrable single pass.',
    inputSchema: CaseflowAutopilotControlInputSchema,
  })
  async autopilot(input: z.infer<typeof CaseflowAutopilotControlInputSchema>) {
    if (input.action === 'start') {
      const status = this.orchestrator.start();
      return { action: 'start', status, tick: null, message: status.detail };
    }

    if (input.action === 'stop') {
      const status = this.orchestrator.stop(input.reason ?? 'Stopped via caseflow_autopilot tool.');
      return { action: 'stop', status, tick: null, message: status.detail };
    }

    const tick = await this.orchestrator.tick();
    return {
      action: 'tick',
      status: this.orchestrator.status(),
      tick: {
        tickId: tick.tickId,
        startedAt: tick.startedAt,
        durationMs: tick.durationMs,
        casesConsidered: tick.considered,
        casesAdvanced: tick.advanced,
        blockedOnHuman: tick.blockedOnHuman,
        slaBreaches: tick.slaBreaches,
        steps: tick.steps.map((s) => ({
          arn: s.arn,
          applicantName: s.applicantName,
          from: s.from,
          to: s.to,
          tool: s.tool,
          ok: s.ok,
          rationale: s.rationale,
          outcome: s.outcome,
        })),
      },
      message: tick.narrative,
    };
  }
}
