/**
 * IntakeTools — the citizen-facing half of the process.
 *
 * These are the tools a Passport Seva portal would call: file the form, pay the
 * fee, take the appointment, answer a clarification, withdraw. Every one of them
 * moves the case through CaseflowService.transition(), so an illegal sequence
 * (paying twice, booking before paying) is refused by the state machine with a
 * message that names the legal next stages.
 *
 * WHY THE TOOLS ARE THIN
 * ---------------------
 * All the domain logic lives in CaseflowService: the fee schedule, the PSK
 * allotment, the checklist. A tool's job is to validate input, ask the service
 * for the artefact, commit the transition with a rationale, and return something
 * an officer can read. That split is what lets the autonomous orchestrator drive
 * these same tools without a parallel code path.
 *
 * `_agentRationale` on every input: when the orchestrator calls a tool it passes
 * its own reasoning, which is then what lands in the case journal instead of the
 * generic string. A human calling the same tool from the console omits it and
 * gets the human wording. One journal, two authors, honestly attributed.
 */
import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import {
  BookAppointmentInputSchema,
  ClarificationResponseInputSchema,
  CompletePskVisitInputSchema,
  FEE_SCHEDULE,
  PayFeeInputSchema,
  REQUIRED_DOCUMENTS,
  STAGE_LABELS,
  SubmitApplicationInputSchema,
  WithdrawInputSchema,
  progressPercent,
} from '../../../contracts/index.js';
import { CaseflowEventsService } from '../services/caseflow-events.service.js';
import { CaseflowService } from '../services/caseflow.service.js';

/** Agent-supplied reasoning, threaded through every lifecycle tool. */
const AgentRationale = z
  .string()
  .optional()
  .describe('Internal: the calling agent\'s reasoning, recorded verbatim in the case journal.');

@Injectable({ deps: [CaseflowService, CaseflowEventsService] })
export class IntakeTools {
  constructor(
    private readonly caseflow: CaseflowService,
    private readonly events: CaseflowEventsService
  ) {}

  // =========================================================================
  // 1. File the application
  // =========================================================================

  @Tool({
    name: 'submit_passport_application',
    description:
      'STEP 1 OF THE PASSPORT PROCESS. File a new passport application and open a case. ' +
      'Generates an ARN (Application Reference Number), registers the applicant in the ' +
      'verification pool, and reindexes the cross-application fraud graph so the new ' +
      'application is immediately comparable against every existing one. Returns the ARN, the ' +
      'fee due, and the document checklist for the chosen application type.',
    inputSchema: SubmitApplicationInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async submitApplication(
    input: z.infer<typeof SubmitApplicationInputSchema> & { _agentRationale?: string }
  ) {
    // Re-validate at the tool boundary. The in-process executor path (console
    // HTTP, orchestrator) hands the input straight to execute() without the
    // schema check an MCP client request would get, so a malformed body used to
    // surface as "Cannot read properties of undefined" from deep inside
    // openCase(). An applicant-facing form deserves the field name instead.
    const parsed = SubmitApplicationInputSchema.safeParse(input);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw new Error(`The application form is incomplete or malformed — ${detail}`);
    }

    const kase = this.caseflow.openCase(parsed.data);
    this.events.caseOpened(kase);

    const schedule = FEE_SCHEDULE[kase.applicationType];
    const required = REQUIRED_DOCUMENTS[kase.applicationType];
    const supplied = new Set(parsed.data.documents.map((d) => d.type));
    const missing = required.filter((type) => !supplied.has(type));

    return {
      arn: kase.arn,
      applicationId: kase.applicationId,
      applicantName: kase.applicantName,
      applicationType: kase.applicationType,
      tatkal: kase.tatkal,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      feeDue: { amount: kase.tatkal ? schedule.tatkal : schedule.normal, currency: 'INR' },
      checklist: { required, supplied: [...supplied], missing },
      nextStep: 'pay_application_fee',
      summary:
        `Case opened as ${kase.arn} for ${kase.applicantName} (${kase.applicationType}` +
        `${kase.tatkal ? ', tatkal' : ''}). ₹${
          kase.tatkal ? schedule.tatkal : schedule.normal
        } due.` +
        (missing.length > 0
          ? ` ${missing.length} mandatory document(s) still to upload: ${missing.join(', ')}.`
          : ' Document checklist complete.'),
      notice:
        'Nothing has been verified yet. The application is now visible to ' +
        'detect_duplicate_signals and build_risk_graph, and the lifecycle orchestrator will ' +
        'pick it up on its next pass.',
    };
  }

  // =========================================================================
  // 2. Fee
  // =========================================================================

  @Tool({
    name: 'pay_application_fee',
    description:
      'STEP 2. Collect the application fee against an ARN and issue a receipt. Amount is derived ' +
      'from the application type and the tatkal flag using the Passport Seva fee schedule. ' +
      'Refused unless the case is at the "submitted" stage.',
    inputSchema: PayFeeInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async payFee(input: z.infer<typeof PayFeeInputSchema> & { _agentRationale?: string }) {
    const existing = this.caseflow.get(input.arn);
    const fee = this.caseflow.buildFee(existing, input.method);

    const kase = this.caseflow.transition(input.arn, {
      to: 'fee_paid',
      actor: 'citizen',
      by: existing.applicantName,
      tool: 'pay_application_fee',
      summary: `Fee of ₹${fee.amount} received by ${input.method} — receipt ${fee.receiptNo}`,
      rationale:
        input._agentRationale ??
        `The fee schedule for a ${existing.applicationType} application${
          existing.tatkal ? ' under tatkal' : ''
        } is ₹${fee.amount}. Payment clears the case to be allotted a PSK appointment.`,
      detail: { ...fee },
      patch: { fee },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      receipt: fee,
      nextStep: 'book_psk_appointment',
      summary: `₹${fee.amount} paid on ${kase.arn}. Receipt ${fee.receiptNo}. Ready for appointment allotment.`,
    };
  }

  // =========================================================================
  // 3. Appointment
  // =========================================================================

  @Tool({
    name: 'book_psk_appointment',
    description:
      'STEP 3. Allot a Passport Seva Kendra appointment slot for a paid application. The PSK is ' +
      'chosen from the applicant\'s state unless one is named. Tatkal cases get the next working ' +
      'day; normal cases three days out.',
    inputSchema: BookAppointmentInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async bookAppointment(
    input: z.infer<typeof BookAppointmentInputSchema> & { _agentRationale?: string }
  ) {
    const existing = this.caseflow.get(input.arn);
    const appointment = this.caseflow.buildAppointment(existing, input.pskCode);

    const kase = this.caseflow.transition(input.arn, {
      to: 'appointment_booked',
      actor: 'system',
      by: 'PassportIQ scheduler',
      tool: 'book_psk_appointment',
      summary: `Slot ${appointment.tokenNo} allotted at ${appointment.pskName}`,
      rationale:
        input._agentRationale ??
        `Fee receipt ${existing.fee?.receiptNo ?? 'on file'} is confirmed, so the case is ` +
          `entitled to a slot. ${appointment.pskName} serves the applicant's state, and ` +
          `${existing.tatkal ? 'tatkal takes the next working day' : 'the earliest normal slot is three days out'}.`,
      detail: { ...appointment },
      patch: { appointment },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      appointment,
      nextStep: 'complete_psk_visit',
      summary:
        `${kase.arn} is booked into ${appointment.pskName} on ` +
        `${appointment.slot.slice(0, 16).replace('T', ' ')} UTC, token ${appointment.tokenNo}.`,
    };
  }

  // =========================================================================
  // 4. The PSK visit — counters A, B and C
  // =========================================================================

  @Tool({
    name: 'complete_psk_visit',
    description:
      'STEP 4. Record a completed Passport Seva Kendra visit: counter A (document granting), ' +
      'counter B (biometrics — photo, ten fingerprints, signature) and counter C (final ' +
      'granting). Counter C only clears when every mandatory document for the application type ' +
      'was produced; an incomplete checklist is recorded, not hidden, and will block verification.',
    inputSchema: CompletePskVisitInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async completePskVisit(
    input: z.infer<typeof CompletePskVisitInputSchema> & { _agentRationale?: string }
  ) {
    const existing = this.caseflow.get(input.arn);
    const visit = this.caseflow.buildPskVisit(existing);

    const kase = this.caseflow.transition(input.arn, {
      to: 'psk_visit_complete',
      actor: 'psk_officer',
      by: input.officer,
      tool: 'complete_psk_visit',
      summary:
        `Counters A/B${visit.counterC ? '/C' : ''} cleared; biometrics captured ` +
        `(${visit.biometrics.fingerprints} prints)` +
        (visit.documentsMissing.length > 0
          ? `. Counter C HELD — missing ${visit.documentsMissing.join(', ')}`
          : ''),
      rationale:
        input._agentRationale ??
        (visit.documentsMissing.length === 0
          ? `All ${visit.documentsGranted.length} mandatory documents for a ${existing.applicationType} ` +
            `application were produced and biometrics captured, so the file is complete enough to verify.`
          : `Biometrics captured, but ${visit.documentsMissing.join(', ')} were not produced. ` +
            `Recording the gap rather than granting counter C — verification must not run on an ` +
            `incomplete file.`),
      detail: { ...visit },
      patch: { pskVisit: visit },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      visit,
      nextStep: visit.counterC ? 'run_case_verification' : 'upload the missing documents',
      blocked: !visit.counterC,
      summary:
        `${kase.arn}: biometrics captured, ${visit.documentsGranted.length} document(s) granted` +
        (visit.documentsMissing.length > 0
          ? `, ${visit.documentsMissing.length} missing — verification is blocked until they arrive.`
          : '. Ready for verification.'),
    };
  }

  // =========================================================================
  // Clarification loop and withdrawal
  // =========================================================================

  @Tool({
    name: 'submit_clarification_response',
    description:
      'The applicant answers an officer\'s clarification request, returning the case to the ' +
      'officer review queue. Only valid while the case is held at "clarification".',
    inputSchema: ClarificationResponseInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async respondToClarification(
    input: z.infer<typeof ClarificationResponseInputSchema> & { _agentRationale?: string }
  ) {
    const existing = this.caseflow.get(input.arn);
    if (!existing.clarification) {
      throw new Error(
        `${existing.arn} has no open clarification request. An officer must ask for ` +
          `clarification (officer_decide with decision="clarify") before a response can be filed.`
      );
    }

    const clarification = {
      ...existing.clarification,
      respondedAt: new Date().toISOString(),
      response: input.response,
    };

    const kase = this.caseflow.transition(input.arn, {
      to: 'officer_review',
      actor: 'citizen',
      by: existing.applicantName,
      tool: 'submit_clarification_response',
      summary: 'Applicant answered the clarification request',
      rationale:
        input._agentRationale ??
        `The officer asked: "${existing.clarification.question}". The applicant has now answered, ` +
          `so the file returns to the officer who raised it — not to the start of the pipeline.`,
      detail: { question: existing.clarification.question, response: input.response },
      patch: { clarification },
    });

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      clarification,
      nextStep: 'officer_decide',
      summary: `${kase.arn} is back in the officer queue with the applicant's answer attached.`,
    };
  }

  @Tool({
    name: 'withdraw_passport_application',
    description:
      'The applicant withdraws the application. Closes the case at any non-terminal stage and ' +
      'records the reason. Irreversible — a withdrawn case cannot be reopened, a fresh ' +
      'application must be filed.',
    inputSchema: WithdrawInputSchema.extend({ _agentRationale: AgentRationale }),
  })
  async withdraw(input: z.infer<typeof WithdrawInputSchema> & { _agentRationale?: string }) {
    const existing = this.caseflow.get(input.arn);

    // Withdrawal is legal from anywhere, which the declarative table cannot
    // express without fourteen extra rows — so it is the one transition the
    // service performs directly, with its own explicit terminal check.
    const kase = this.caseflow.withdraw(input.arn, input.reason, input._agentRationale);

    return {
      arn: kase.arn,
      stage: kase.stage,
      stageLabel: STAGE_LABELS[kase.stage],
      withdrawnFrom: existing.stage,
      progress: progressPercent(kase.stage),
      summary: `${kase.arn} withdrawn from '${existing.stage}'. Reason: ${input.reason}`,
    };
  }
}
