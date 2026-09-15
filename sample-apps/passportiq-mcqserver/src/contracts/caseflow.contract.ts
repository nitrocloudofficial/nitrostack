/**
 * ============================================================================
 * SHARED CONTRACT — passport case lifecycle (the actual government process)
 * Owner: Caseflow. Consumed by: the orchestrator agent, the console, the tools.
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * -------------------
 * Everything else in PassportIQ answers one question: *is this application
 * fraudulent?* That is the interesting half, but it is not the process. A real
 * passport application is a long-running government case that moves through
 * counters, payments, appointments, a police district, a printing press and a
 * courier — and the fraud check is one station on that line.
 *
 * Without this layer the product is a fraud scanner with no subject. With it,
 * PassportIQ is what it claims to be: an agent that runs the whole Passport Seva
 * workflow end to end and stops exactly once, at the human decision.
 *
 * The stage list below is modelled on the real MEA / Passport Seva flow:
 * online filing (ARN) → fee → PSK appointment → counters A/B/C (document
 * granting + biometrics) → verification → police verification → officer grant →
 * printing (booklet + passport number) → Speed Post dispatch → delivery.
 *
 * DESIGN RULE THAT MATTERS
 * -----------------------
 * Every transition is declared here as DATA, not as code scattered across tools.
 * `CASE_TRANSITIONS` is the single source of truth for "what may happen next",
 * which is what lets one agent drive the entire lifecycle without a hand-written
 * if/else ladder per stage — and what lets the console render an honest board.
 */
import { z } from 'zod';
import { ApplicationTypeSchema } from './seed-applicant.contract.js';

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

/**
 * The case lifecycle, in the order a clean application walks it.
 *
 * Terminal stages sit at the end. `clarification` is a hold, not a step
 * backwards: the case returns to `officer_review` when the applicant answers.
 */
export const CASE_STAGES = [
  'submitted', // ARN generated, application filed online
  'fee_paid', // fee collected against the ARN
  'appointment_booked', // PSK slot allotted
  'psk_visit_complete', // counters A/B/C: documents granted, biometrics captured
  'verification_running', // PassportIQ verification pipeline executing
  'police_verification', // PV request open with the district police
  'officer_review', // ⬅ THE HUMAN GATE. No machine passes this alone.
  'clarification', // held: applicant asked for more information
  'granted', // officer approved — cleared for printing
  'printing', // booklet printed, passport number allotted
  'dispatched', // handed to Speed Post with a tracking number
  'delivered', // received by the applicant — closed, happy
  'rejected', // officer refused — closed
  'withdrawn', // applicant pulled out — closed
] as const;

export const CaseStageSchema = z.enum(CASE_STAGES);
export type CaseStage = (typeof CASE_STAGES)[number];

/** Stages after which nothing further happens. */
export const TERMINAL_STAGES: readonly CaseStage[] = ['delivered', 'rejected', 'withdrawn'];

/** Stages where the case is waiting on a person, not on the system. */
export const WAITING_ON_HUMAN: readonly CaseStage[] = ['officer_review', 'clarification'];

export function isTerminal(stage: CaseStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

/** Who is allowed to move a case out of a stage. */
export const ActorSchema = z.enum([
  'citizen', // the applicant, via the public portal
  'system', // PassportIQ itself — the part an agent may do unattended
  'psk_officer', // counter staff at a Passport Seva Kendra
  'police', // the district police verification unit
  'passport_officer', // the granting authority — the human in the loop
]);
export type Actor = z.infer<typeof ActorSchema>;

// ---------------------------------------------------------------------------
// Transitions — declarative, and the reason one agent can drive everything
// ---------------------------------------------------------------------------

export interface CaseTransition {
  from: CaseStage;
  to: CaseStage;
  /** The tool that performs it. Also the agent's action name. */
  tool: string;
  actor: Actor;
  label: string;
  /**
   * True when PassportIQ may perform this step with no human involved. The
   * autonomous orchestrator will only ever execute transitions marked true —
   * that single flag is the technical expression of "the AI never decides".
   */
  autonomous: boolean;
  /** Target duration for the *source* stage, in hours. Drives the SLA clock. */
  slaHours: number;
  /** Officer-readable precondition, rendered in the UI next to the step. */
  requires?: string;
}

export const CASE_TRANSITIONS: readonly CaseTransition[] = [
  {
    from: 'submitted',
    to: 'fee_paid',
    tool: 'pay_application_fee',
    actor: 'citizen',
    label: 'Collect application fee',
    autonomous: true, // the payment gateway callback is a machine event
    slaHours: 24,
    requires: 'A fee schedule resolved for the application type',
  },
  {
    from: 'fee_paid',
    to: 'appointment_booked',
    tool: 'book_psk_appointment',
    actor: 'system',
    label: 'Allot a Passport Seva Kendra slot',
    autonomous: true,
    slaHours: 12,
    requires: 'Fee receipt on file',
  },
  {
    from: 'appointment_booked',
    to: 'psk_visit_complete',
    tool: 'complete_psk_visit',
    actor: 'psk_officer',
    label: 'Counters A/B/C — grant documents, capture biometrics',
    autonomous: true, // simulated kiosk feed in this build; see CaseflowService
    slaHours: 72,
    requires: 'An allotted appointment slot',
  },
  {
    from: 'psk_visit_complete',
    to: 'verification_running',
    tool: 'run_case_verification',
    actor: 'system',
    label: 'Run the PassportIQ verification pipeline',
    autonomous: true,
    slaHours: 6,
    requires: 'Biometrics captured and every mandatory document granted',
  },
  {
    from: 'verification_running',
    to: 'police_verification',
    tool: 'initiate_police_verification',
    actor: 'system',
    label: 'Raise police verification with the district',
    autonomous: true,
    slaHours: 4,
    requires: 'All ten verification stages complete',
  },
  {
    from: 'police_verification',
    to: 'officer_review',
    tool: 'record_police_verification',
    actor: 'police',
    label: 'Receive the police verification report',
    autonomous: true, // simulated district feed; the *verdict* is data, not judgement
    slaHours: 120,
    requires: 'An open PV request',
  },
  {
    from: 'officer_review',
    to: 'granted',
    tool: 'officer_decide',
    actor: 'passport_officer',
    label: 'Officer grants the passport',
    autonomous: false, // ⬅ the gate
    slaHours: 48,
    requires: 'Verification complete, PV report on file, and a human officer',
  },
  {
    from: 'officer_review',
    to: 'clarification',
    tool: 'officer_decide',
    actor: 'passport_officer',
    label: 'Officer asks the applicant for clarification',
    autonomous: false,
    slaHours: 48,
    requires: 'A human officer',
  },
  {
    from: 'officer_review',
    to: 'rejected',
    tool: 'officer_decide',
    actor: 'passport_officer',
    label: 'Officer refuses the application',
    autonomous: false,
    slaHours: 48,
    requires: 'A human officer',
  },
  {
    from: 'clarification',
    to: 'officer_review',
    tool: 'submit_clarification_response',
    actor: 'citizen',
    label: 'Applicant answers the clarification',
    autonomous: false, // waiting on a person outside the building
    slaHours: 168,
    requires: 'An open clarification request',
  },
  {
    from: 'granted',
    to: 'printing',
    tool: 'print_passport_booklet',
    actor: 'system',
    label: 'Allot passport number and print the booklet',
    autonomous: true,
    slaHours: 24,
    requires: 'A recorded grant by a named officer',
  },
  {
    from: 'printing',
    to: 'dispatched',
    tool: 'dispatch_passport',
    actor: 'system',
    label: 'Hand the booklet to Speed Post',
    autonomous: true,
    slaHours: 24,
    requires: 'A printed booklet with an allotted passport number',
  },
  {
    from: 'dispatched',
    to: 'delivered',
    tool: 'confirm_delivery',
    actor: 'system',
    label: 'Confirm delivery to the applicant',
    autonomous: true,
    slaHours: 96,
    requires: 'A Speed Post tracking number',
  },
];

/** Every transition legally available from a stage. */
export function transitionsFrom(stage: CaseStage): CaseTransition[] {
  return CASE_TRANSITIONS.filter((t) => t.from === stage);
}

/**
 * The single next step PassportIQ may take on its own, or null.
 *
 * Null has two very different meanings and the caller must tell them apart:
 * the case is finished, or the case is waiting for a human. `explainHold()`
 * below turns that into a sentence.
 */
export function autonomousNext(stage: CaseStage): CaseTransition | null {
  return transitionsFrom(stage).find((t) => t.autonomous) ?? null;
}

export function explainHold(stage: CaseStage): string {
  if (isTerminal(stage)) return `Case closed at '${stage}'. Nothing further to do.`;
  if (stage === 'officer_review') {
    return 'Waiting on a human passport officer. PassportIQ has prepared the recommendation ' +
      'and will not decide — officer_decide is the only way past this point.';
  }
  if (stage === 'clarification') {
    return 'Waiting on the applicant to answer the clarification request.';
  }
  return `No autonomous transition is defined out of '${stage}'.`;
}

/** Human-readable stage labels for the UI and for tool output. */
export const STAGE_LABELS: Record<CaseStage, string> = {
  submitted: 'Application filed',
  fee_paid: 'Fee paid',
  appointment_booked: 'Appointment booked',
  psk_visit_complete: 'PSK visit complete',
  verification_running: 'Verification running',
  police_verification: 'Police verification',
  officer_review: 'Awaiting officer',
  clarification: 'Clarification pending',
  granted: 'Granted',
  printing: 'Printing',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/** Zero-based progress index used by the board and the tracker's progress bar. */
export const HAPPY_PATH: readonly CaseStage[] = [
  'submitted',
  'fee_paid',
  'appointment_booked',
  'psk_visit_complete',
  'verification_running',
  'police_verification',
  'officer_review',
  'granted',
  'printing',
  'dispatched',
  'delivered',
];

export function progressPercent(stage: CaseStage): number {
  if (stage === 'rejected' || stage === 'withdrawn') return 100;
  if (stage === 'clarification') return Math.round((6 / (HAPPY_PATH.length - 1)) * 100);
  const i = HAPPY_PATH.indexOf(stage);
  if (i < 0) return 0;
  return Math.round((i / (HAPPY_PATH.length - 1)) * 100);
}

// ---------------------------------------------------------------------------
// Fees — the real Passport Seva schedule (₹), so the numbers survive scrutiny
// ---------------------------------------------------------------------------

export const FEE_SCHEDULE: Record<
  z.infer<typeof ApplicationTypeSchema>,
  { normal: number; tatkal: number; pages: number; validityYears: number }
> = {
  fresh: { normal: 1500, tatkal: 3500, pages: 36, validityYears: 10 },
  renewal: { normal: 1500, tatkal: 3500, pages: 36, validityYears: 10 },
  lost_replacement: { normal: 3000, tatkal: 5000, pages: 36, validityYears: 10 },
  minor: { normal: 1000, tatkal: 3000, pages: 36, validityYears: 5 },
};

// ---------------------------------------------------------------------------
// Documents required per application type — the counter-A checklist
// ---------------------------------------------------------------------------

export const REQUIRED_DOCUMENTS: Record<z.infer<typeof ApplicationTypeSchema>, string[]> = {
  fresh: ['aadhaar', 'birth_certificate', 'address_proof', 'photograph'],
  renewal: ['aadhaar', 'old_passport', 'address_proof', 'photograph'],
  lost_replacement: ['aadhaar', 'fir_copy', 'address_proof', 'photograph'],
  minor: ['aadhaar', 'birth_certificate', 'parent_consent', 'photograph'],
};

// ---------------------------------------------------------------------------
// Case record
// ---------------------------------------------------------------------------

export const PoliceVerdictSchema = z.enum(['clear', 'adverse', 'incomplete', 'not_required']);
export type PoliceVerdict = z.infer<typeof PoliceVerdictSchema>;

export const CaseJournalEntrySchema = z.object({
  seq: z.number().int().positive(),
  at: z.string().datetime(),
  stage: CaseStageSchema,
  /** Stage the case was in before this entry. Null for the opening entry. */
  fromStage: CaseStageSchema.nullable(),
  actor: ActorSchema,
  /** Named human or the machine identity that acted. */
  by: z.string().min(1),
  tool: z.string().min(1),
  summary: z.string().min(1),
  /**
   * Why this happened *now*. Written by whoever performed the transition; for
   * agent-driven steps this is the agent's own reasoning, which is what makes
   * the journal an explanation rather than a log.
   */
  rationale: z.string().min(1),
  detail: z.record(z.unknown()).default({}),
});
export type CaseJournalEntry = z.infer<typeof CaseJournalEntrySchema>;

export const PassportCaseSchema = z.object({
  /** Application Reference Number — the citizen-facing handle. */
  arn: z.string().min(1),
  /** The PassportIQ application id this case verifies. 1:1 with the ARN. */
  applicationId: z.string().min(1),
  applicantName: z.string().min(1),
  applicationType: ApplicationTypeSchema,
  tatkal: z.boolean().default(false),

  stage: CaseStageSchema,
  stageEnteredAt: z.string().datetime(),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable().default(null),

  /** Set once the case has been through officer_review at least once. */
  officerDecision: z.enum(['approve', 'clarify', 'reject']).nullable().default(null),

  fee: z
    .object({
      amount: z.number().int().nonnegative(),
      currency: z.literal('INR'),
      receiptNo: z.string().min(1),
      paidAt: z.string().datetime(),
      method: z.enum(['upi', 'netbanking', 'card', 'challan']),
    })
    .nullable()
    .default(null),

  appointment: z
    .object({
      pskCode: z.string().min(1),
      pskName: z.string().min(1),
      slot: z.string().datetime(),
      tokenNo: z.string().min(1),
    })
    .nullable()
    .default(null),

  pskVisit: z
    .object({
      completedAt: z.string().datetime(),
      counterA: z.boolean(),
      counterB: z.boolean(),
      counterC: z.boolean(),
      biometrics: z.object({
        photo: z.boolean(),
        fingerprints: z.number().int().min(0).max(10),
        signature: z.boolean(),
      }),
      documentsGranted: z.array(z.string()),
      documentsMissing: z.array(z.string()),
    })
    .nullable()
    .default(null),

  policeVerification: z
    .object({
      requestedAt: z.string().datetime(),
      district: z.string().min(1),
      station: z.string().min(1),
      referenceNo: z.string().min(1),
      verdict: PoliceVerdictSchema.nullable(),
      reportedAt: z.string().datetime().nullable(),
      remarks: z.string().nullable(),
    })
    .nullable()
    .default(null),

  clarification: z
    .object({
      requestedAt: z.string().datetime(),
      question: z.string().min(1),
      respondedAt: z.string().datetime().nullable(),
      response: z.string().nullable(),
    })
    .nullable()
    .default(null),

  booklet: z
    .object({
      passportNumber: z.string().min(1),
      printedAt: z.string().datetime(),
      pages: z.number().int().positive(),
      validUntil: z.string(),
      printQueue: z.string().min(1),
    })
    .nullable()
    .default(null),

  dispatch: z
    .object({
      dispatchedAt: z.string().datetime(),
      courier: z.string().min(1),
      trackingNo: z.string().min(1),
      deliveredAt: z.string().datetime().nullable(),
    })
    .nullable()
    .default(null),

  journal: z.array(CaseJournalEntrySchema),
});
export type PassportCase = z.infer<typeof PassportCaseSchema>;

// ---------------------------------------------------------------------------
// Events — the caseflow half of the bus
// ---------------------------------------------------------------------------

export const CASE_STAGE_CHANGED = 'caseflow.stage_changed' as const;
export const CASE_OPENED = 'caseflow.case_opened' as const;
export const CASE_SLA_BREACHED = 'caseflow.sla_breached' as const;
export const CASE_CLOSED = 'caseflow.case_closed' as const;

export const CaseStageChangedEventSchema = z.object({
  arn: z.string().min(1),
  applicationId: z.string().min(1),
  applicantName: z.string().min(1),
  fromStage: CaseStageSchema.nullable(),
  stage: CaseStageSchema,
  actor: ActorSchema,
  by: z.string().min(1),
  tool: z.string().min(1),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  at: z.string().datetime(),
});
export type CaseStageChangedEvent = z.infer<typeof CaseStageChangedEventSchema>;

export const CaseSlaBreachedEventSchema = z.object({
  arn: z.string().min(1),
  applicationId: z.string().min(1),
  stage: CaseStageSchema,
  slaHours: z.number(),
  hoursInStage: z.number(),
  at: z.string().datetime(),
});
export type CaseSlaBreachedEvent = z.infer<typeof CaseSlaBreachedEventSchema>;

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

const ArnInput = z.object({
  arn: z
    .string()
    .min(1)
    .describe('Application Reference Number, e.g. ARN-2026-000123. The ARN or the applicationId.'),
});

export const SubmitApplicationInputSchema = z.object({
  fullName: z.string().min(2).describe("Applicant's full name as it must appear in the passport"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Date of birth, YYYY-MM-DD'),
  applicationType: ApplicationTypeSchema.describe(
    'fresh | renewal | lost_replacement | minor — drives the fee and the document checklist'
  ),
  tatkal: z.boolean().default(false).describe('Tatkal (expedited) scheme — higher fee, tighter SLA'),
  phone: z.string().min(6).describe('Mobile number — also a cross-application fraud signal'),
  email: z.string().email().describe('Email — also a cross-application fraud signal'),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().regex(/^\d{6}$/, 'Indian PIN codes are exactly 6 digits'),
  }),
  passportNumber: z
    .string()
    .optional()
    .describe('Existing passport number, for renewal / lost replacement'),
  documents: z
    .array(
      z.object({
        type: z.string().min(1).describe('aadhaar | birth_certificate | old_passport | address_proof | photograph | fir_copy | parent_consent'),
        imageHash: z
          .string()
          .optional()
          .describe('Perceptual hash of the scan. Reusing a hash is the strongest fraud signal.'),
      })
    )
    .default([])
    .describe('Documents uploaded with the online form'),
});
export type SubmitApplicationInput = z.infer<typeof SubmitApplicationInputSchema>;

export const PayFeeInputSchema = ArnInput.extend({
  method: z.enum(['upi', 'netbanking', 'card', 'challan']).default('upi'),
});

export const BookAppointmentInputSchema = ArnInput.extend({
  pskCode: z.string().optional().describe('Preferred Passport Seva Kendra; nearest by PIN if omitted'),
});

export const CompletePskVisitInputSchema = ArnInput.extend({
  officer: z.string().default('PSK counter staff').describe('PSK officer who cleared the counters'),
});

export const InitiatePvInputSchema = ArnInput;

export const RecordPvInputSchema = ArnInput.extend({
  verdict: PoliceVerdictSchema.describe('clear | adverse | incomplete | not_required'),
  remarks: z.string().optional(),
});

export const PrintBookletInputSchema = ArnInput;
export const DispatchInputSchema = ArnInput.extend({
  courier: z.string().default('India Post Speed Post'),
});
export const ConfirmDeliveryInputSchema = ArnInput;

export const ClarificationResponseInputSchema = ArnInput.extend({
  response: z.string().min(3).describe('What the applicant supplied in answer'),
});

export const WithdrawInputSchema = ArnInput.extend({
  reason: z.string().min(3).describe('Why the applicant is withdrawing'),
});

export const AdvanceCaseInputSchema = ArnInput.extend({
  maxSteps: z
    .number()
    .int()
    .min(1)
    .max(12)
    .default(1)
    .describe('How many autonomous transitions to attempt in one call. Stops at any human gate.'),
});

export const ListCasesInputSchema = z.object({
  stage: CaseStageSchema.optional().describe('Filter to one lifecycle stage'),
  waitingOnHuman: z.boolean().optional().describe('Only cases blocked on a person'),
  breachedOnly: z.boolean().optional().describe('Only cases past their stage SLA'),
  limit: z.number().int().min(1).max(200).default(50),
});

export const TrackInputSchema = z.object({
  arn: z
    .string()
    .min(1)
    .describe('The ARN printed on the acknowledgement, or the PassportIQ application id'),
});

export const CaseflowAutopilotControlInputSchema = z.object({
  action: z
    .enum(['start', 'stop', 'tick'])
    .describe('start = arm the lifecycle loop, stop = disarm, tick = run exactly one pass now'),
  reason: z.string().optional().describe('Recorded in the caseflow journal'),
});
