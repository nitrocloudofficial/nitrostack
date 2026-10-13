/**
 * ProcessingTools — the government-side half of the process.
 *
 * Verification, police verification, printing, dispatch, delivery. These are the
 * steps the office performs *on* the applicant's file, and they are where the
 * lifecycle meets the fraud layer:
 *
 *   run_case_verification is the join. It refuses to start on an incomplete
 *   counter-C file, then drives the existing ten-stage PassportIQ pipeline
 *   through run_verification_pipeline, then attaches the resulting risk score,
 *   duplicate signals and cluster to the case. Everything downstream — the PV
 *   verdict the district reports, the recommendation an officer reads — is
 *   derived from that one call.
 *
 * PRINTING IS GUARDED TWICE
 * ------------------------
 * print_passport_booklet checks the state machine AND re-checks that a named
 * officer recorded a grant. The state machine alone would be enough today
 * (`granted` is only reachable through officer_decide), but the double check
 * means a future refactor that adds another path into `granted` cannot silently
 * produce a passport nobody approved. That is the one failure mode in this
 * system that would matter outside a hackathon.
 */
import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import {
  ConfirmDeliveryInputSchema,
  DispatchInputSchema,
  InitiatePvInputSchema,
  PrintBookletInputSchema,
  RecordPvInputSchema,
  STAGE_LABELS,
} from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { ToolExecutorService } from '../../pipeline/services/tool-executor.service.js';
import { CaseflowService } from '../services/caseflow.service.js';

const AgentRationale = z
  .string()
  .optional()
  .describe("Internal: the calling agent's reasoning, recorded verbatim in the case journal.");

const ArnOnly = z.object({
  arn: z.string().min(1).describe('The ARN or the applicationId'),
  _agentRationale: AgentRationale,
});

@Injectable({
  deps: [
    CaseflowService,
    ToolExecutorService,
    PipelineStateService,
    GraphService,
    ApplicationService,
  ],
})
export class ProcessingTools {
  constructor(
    private readonly caseflow: CaseflowService,
    private readonly executor: ToolExecutorService,
    private readonly pipelineState: PipelineStateService,
    private readonly graph: GraphService,
    private readonly applications: ApplicationService
  ) {}

  // =========================================================================
  // 5. Verification — where the lifecycle meets the fraud layer
  // =========================================================================

  @Tool({
    name: 'run_case_verification',
    description:
      'STEP 5. Run the full PassportIQ verification pipeline against a case whose PSK visit is ' +
      'complete: document checks, field extraction, identity and address consistency, ' +
      'cross-application duplicate signals, the fraud graph, the government rulebook, the ' +
      'weighted risk score and a plain-language explanation. Refuses to run when counter C is ' +
      'unresolved. Attaches the score, the signals and the linked-application cluster to the case.',
    inputSchema: ArnOnly,
  })
  async runCaseVerification(input: z.infer<typeof ArnOnly>) {
    const existing = this.caseflow.get(input.arn);

    // The precondition that makes the whole line honest. A confident risk score
    // computed over a file with a missing birth certificate is worse than no
    // score, because an officer would trust it.
    if (existing.pskVisit && !existing.pskVisit.counterC) {
      throw new Error(
        `${existing.arn} cannot be verified: counter C is unresolved — ` +
          `${existing.pskVisit.documentsMissing.join(', ')} were never produced. ` +
          `Verifying an incomplete file would produce a confident answer about missing evidence.`
      );
    }

    const kase = this.caseflow.transition(input.arn, {
      to: 'verification_running',
      actor: 'system',
      by: 'PassportIQ pipeline',
      tool: 'run_case_verification',
      summary: 'Verification pipeline started',
      rationale:
        input._agentRationale ??
        'Counters A/B/C are clear and biometrics are on file, so every input the ten verification ' +
          'stages need is present. Running them now.',
      detail: { applicationId: existing.applicationId },
    });

    // Drive the existing pipeline by tool name, exactly as an MCP client would.
    const pipeline = (await this.executor.call('run_verification_pipeline', {
      applicationId: kase.applicationId,
    })) as { stagesCompleted?: string[] } | undefined;

    const progress = this.pipelineState.getProgress(kase.applicationId);
    const riskScore = this.pipelineState.getRiskScore(kase.applicationId);
    const linked = this.graph.getLinkedApplicationIds(kase.applicationId);
    const signals = this.graph.findReusedSignals(kase.applicationId);

    return {
      arn: kase.arn,
      applicationId: kase.applicationId,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      verification: {
        stagesCompleted: progress.completedStages,
        stagesMissing: progress.missingStages,
        pipelineComplete: progress.isComplete,
        riskScore,
        riskBand:
          riskScore === null
            ? 'unknown'
            : riskScore >= 70
              ? 'high'
              : riskScore >= 40
                ? 'medium'
                : 'low',
        duplicateSignalCount: signals.signals.length,
        linkedApplicationIds: linked,
      },
      nextStep: 'initiate_police_verification',
      summary:
        `${kase.arn} verified: ${progress.completedStages.length} stage(s) complete` +
        (riskScore === null ? '' : `, risk ${riskScore}/100`) +
        (linked.length > 0
          ? `, and this applicant shares identifiers with ${linked.length} other application(s).`
          : ', no cross-application links found.'),
      pipelineEcho: pipeline?.stagesCompleted?.length ?? progress.completedStages.length,
    };
  }

  // =========================================================================
  // 6-7. Police verification
  // =========================================================================

  @Tool({
    name: 'initiate_police_verification',
    description:
      "STEP 6. Raise a police verification request with the district covering the applicant's " +
      'address. Requires the verification pipeline to have completed every mandatory stage — the ' +
      'district should not be asked to visit an address the system has not even checked.',
    inputSchema: InitiatePvInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async initiatePv(input: z.infer<typeof InitiatePvInputSchema> & { _agentRationale?: string }) {
    const existing = this.caseflow.get(input.arn);
    const progress = this.pipelineState.getProgress(existing.applicationId);

    if (!progress.isComplete) {
      throw new Error(
        `${existing.arn} cannot go to police verification: the pipeline is incomplete — ` +
          `missing ${progress.missingStages.join(', ')}. Run run_case_verification first.`
      );
    }

    const pv = this.caseflow.buildPvRequest(existing);

    const kase = this.caseflow.transition(input.arn, {
      to: 'police_verification',
      actor: 'system',
      by: 'PassportIQ',
      tool: 'initiate_police_verification',
      summary: `PV request ${pv.referenceNo} raised with ${pv.station}, ${pv.district}`,
      rationale:
        input._agentRationale ??
        `All ${progress.completedStages.length} verification stages are complete, so there is nothing ` +
          `further the system can establish without a physical visit. Routing to ${pv.station} ` +
          `because it covers the stated address.`,
      detail: { ...pv },
      patch: { policeVerification: pv },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      policeVerification: pv,
      nextStep: 'record_police_verification',
      summary: `PV ${pv.referenceNo} is open with ${pv.station} (${pv.district}).`,
    };
  }

  @Tool({
    name: 'record_police_verification',
    description:
      'STEP 7. File the district police verification report against a case and move it into the ' +
      'officer review queue. An "adverse" or "incomplete" verdict does NOT reject the ' +
      'application — it is evidence the officer reads. Only a human officer decides.',
    inputSchema: RecordPvInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async recordPv(input: z.infer<typeof RecordPvInputSchema> & { _agentRationale?: string }) {
    const existing = this.caseflow.get(input.arn);
    if (!existing.policeVerification) {
      throw new Error(
        `${existing.arn} has no open PV request. Call initiate_police_verification first.`
      );
    }

    const remarks =
      input.remarks ??
      {
        clear: 'Residence and identity confirmed at the stated address by the beat officer.',
        adverse:
          'Adverse report: the applicant could not be confirmed at the stated address and a ' +
          'neighbour dispute is on record.',
        incomplete:
          'Report incomplete: the address exists but the applicant was not traceable at it on ' +
          'two visits. A single residence could not be established.',
        not_required: 'PV waived under the applicable exemption.',
      }[input.verdict];

    const pv = {
      ...existing.policeVerification,
      verdict: input.verdict,
      reportedAt: new Date().toISOString(),
      remarks,
    };

    const kase = this.caseflow.transition(input.arn, {
      to: 'officer_review',
      actor: 'police',
      by: `${pv.station} (${pv.district})`,
      tool: 'record_police_verification',
      summary: `PV report received — verdict: ${input.verdict}`,
      rationale:
        input._agentRationale ??
        `The district filed its report on ${pv.referenceNo}: ${input.verdict}. That closes every ` +
          `machine-checkable and field-checkable input. The grant itself is a statutory human ` +
          `act, so the file now goes to an officer and PassportIQ stops.`,
      detail: { ...pv },
      patch: { policeVerification: pv },
    });

    const riskScore = this.pipelineState.getRiskScore(kase.applicationId);
    const linked = this.graph.getLinkedApplicationIds(kase.applicationId);

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      policeVerification: pv,
      handoff: {
        to: 'passport_officer',
        riskScore,
        linkedApplicationIds: linked,
        tool: 'officer_decide',
      },
      nextStep: 'officer_decide (HUMAN ONLY)',
      summary:
        `${kase.arn} is now with a passport officer. PV: ${input.verdict}` +
        (riskScore === null ? '' : `, risk ${riskScore}/100`) +
        (linked.length > 0 ? `, ${linked.length} linked application(s).` : '.'),
      notice:
        'PassportIQ will not move this case again until a human officer records a decision. ' +
        'That is enforced by the transition table, not by convention.',
    };
  }

  // =========================================================================
  // 8-10. Issuance
  // =========================================================================

  @Tool({
    name: 'print_passport_booklet',
    description:
      'STEP 8. Allot a passport number and print the booklet. Requires a recorded grant by a ' +
      'named officer — checked against the case record independently of the stage, so no ' +
      'refactor can produce a passport nobody approved.',
    inputSchema: PrintBookletInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async printBooklet(
    input: z.infer<typeof PrintBookletInputSchema> & { _agentRationale?: string }
  ) {
    const existing = this.caseflow.get(input.arn);

    // The second guard. See the file header for why this is not redundant.
    if (existing.officerDecision !== 'approve') {
      throw new Error(
        `Refusing to print for ${existing.arn}: no officer grant is recorded on the case ` +
          `(officerDecision = ${existing.officerDecision ?? 'none'}). A passport may only be ` +
          `printed against a named human approval.`
      );
    }

    const booklet = this.caseflow.buildBooklet(existing);

    const kase = this.caseflow.transition(input.arn, {
      to: 'printing',
      actor: 'system',
      by: 'Nashik India Security Press',
      tool: 'print_passport_booklet',
      summary: `Passport ${booklet.passportNumber} printed (${booklet.pages}pp, valid to ${booklet.validUntil})`,
      rationale:
        input._agentRationale ??
        `An officer recorded a grant on this case, which is the only thing that authorises ` +
          `printing. Allotting ${booklet.passportNumber} and queueing the booklet in the ` +
          `${booklet.printQueue}.`,
      detail: { ...booklet },
      patch: { booklet },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      booklet,
      nextStep: 'dispatch_passport',
      summary: `${kase.arn}: passport ${booklet.passportNumber} printed, valid until ${booklet.validUntil}.`,
    };
  }

  @Tool({
    name: 'dispatch_passport',
    description:
      'STEP 9. Hand the printed booklet to Speed Post and issue a tracking number the applicant ' +
      'can follow.',
    inputSchema: DispatchInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async dispatch(input: z.infer<typeof DispatchInputSchema> & { _agentRationale?: string }) {
    const existing = this.caseflow.get(input.arn);
    if (!existing.booklet) {
      throw new Error(`${existing.arn} has no printed booklet to dispatch.`);
    }

    const dispatch = this.caseflow.buildDispatch(existing, input.courier);
    const address = this.applications.getSummary(existing.applicationId).address;

    const kase = this.caseflow.transition(input.arn, {
      to: 'dispatched',
      actor: 'system',
      by: input.courier,
      tool: 'dispatch_passport',
      summary: `Dispatched via ${input.courier} — tracking ${dispatch.trackingNo}`,
      rationale:
        input._agentRationale ??
        `Booklet ${existing.booklet.passportNumber} is printed and quality-checked. Handing it to ` +
          `${input.courier} for the address on file closes the office's part of the case.`,
      detail: { ...dispatch, address },
      patch: { dispatch },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      dispatch,
      deliveryAddress: address,
      nextStep: 'confirm_delivery',
      summary: `${kase.arn} dispatched. Tracking ${dispatch.trackingNo} via ${input.courier}.`,
    };
  }

  @Tool({
    name: 'confirm_delivery',
    description:
      'STEP 10 — the last one. Confirm the applicant received the passport. Closes the case ' +
      'permanently.',
    inputSchema: ConfirmDeliveryInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async confirmDelivery(
    input: z.infer<typeof ConfirmDeliveryInputSchema> & { _agentRationale?: string }
  ) {
    const existing = this.caseflow.get(input.arn);
    if (!existing.dispatch) {
      throw new Error(`${existing.arn} was never dispatched, so delivery cannot be confirmed.`);
    }

    const dispatch = { ...existing.dispatch, deliveredAt: new Date().toISOString() };
    const openedMs = Date.now() - new Date(existing.openedAt).getTime();
    const days = Math.max(1, Math.round(openedMs / 86_400_000));

    const kase = this.caseflow.transition(input.arn, {
      to: 'delivered',
      actor: 'system',
      by: dispatch.courier,
      tool: 'confirm_delivery',
      summary: `Delivered — case closed after ${days} day(s)`,
      rationale:
        input._agentRationale ??
        `${dispatch.courier} confirmed delivery against tracking ${dispatch.trackingNo}. The ` +
          `applicant has the passport, so the case closes.`,
      detail: { ...dispatch, totalDays: days },
      patch: { dispatch },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      dispatch,
      totalDays: days,
      passportNumber: kase.booklet?.passportNumber ?? null,
      summary:
        `${kase.arn} closed. ${kase.applicantName} received passport ` +
        `${kase.booklet?.passportNumber ?? '—'} after ${days} day(s).`,
    };
  }
}
