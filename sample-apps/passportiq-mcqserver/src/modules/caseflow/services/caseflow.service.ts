/**
 * CaseflowService — the passport case store and the workflow engine.
 *
 * This is the piece that turns PassportIQ from a fraud scanner into a system of
 * record for the actual government process. It owns:
 *
 *   - the case register (ARN → PassportCase), including cases seeded to match
 *     the nine demo applications so the board is populated on first paint;
 *   - the state machine: every mutation goes through `transition()`, which
 *     refuses illegal moves against CASE_TRANSITIONS rather than trusting the
 *     caller;
 *   - the append-only case journal, with a `rationale` on every entry;
 *   - the derived facts a real office needs: fee schedule, PSK allotment,
 *     passport-number allotment, Speed Post tracking, SLA clocks.
 *
 * WHAT IT DELIBERATELY DOES NOT OWN
 * --------------------------------
 * It never scores risk, never decides, and never calls another tool. Stage
 * changes that depend on verification (`run_case_verification`) or on a human
 * (`officer_decide`) are driven from outside — the tools and the orchestrator —
 * so this class stays a pure, testable state machine with no cycles back into
 * the pipeline.
 *
 * WHY A NEW APPLICATION IS PUSHED INTO ApplicationService
 * -----------------------------------------------------
 * A case is only interesting because the fraud layer can look at it. When a
 * citizen files a new application, `openCase()` registers a matching
 * SeededApplication in the pool and asks GraphService to reindex, so the brand
 * new ARN is immediately visible to detect_duplicate_signals and build_risk_graph.
 * Skip that and every runtime-submitted application looks innocent forever,
 * which is exactly the bug that would make a live demo submission underwhelming.
 */
import { Injectable, defaultLogger } from '@nitrostack/core';
import {
  CASE_TRANSITIONS,
  FEE_SCHEDULE,
  REQUIRED_DOCUMENTS,
  STAGE_LABELS,
  WAITING_ON_HUMAN,
  autonomousNext,
  isTerminal,
  progressPercent,
  transitionsFrom,
  type Actor,
  type ApplicationType,
  type CaseJournalEntry,
  type CaseStage,
  type CaseTransition,
  type PassportCase,
  type PoliceVerdict,
  type SeededApplication,
  type SubmitApplicationInput,
} from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { normalizeAddress } from '../../pipeline/services/signal-normalizer.js';

/** Passport Seva Kendras used for allotment. Real codes, plausible geography. */
const PSK_NETWORK: ReadonlyArray<{ code: string; name: string; states: string[] }> = [
  { code: 'PSK-DEL-01', name: 'PSK Herald House, New Delhi', states: ['Delhi', 'Haryana'] },
  { code: 'PSK-MUM-02', name: 'PSK Malad, Mumbai', states: ['Maharashtra', 'Goa'] },
  { code: 'PSK-BLR-01', name: 'PSK Lalbagh Road, Bengaluru', states: ['Karnataka'] },
  { code: 'PSK-CHN-01', name: 'PSK Aminjikarai, Chennai', states: ['Tamil Nadu', 'Puducherry'] },
  { code: 'PSK-HYD-01', name: 'PSK Begumpet, Hyderabad', states: ['Telangana', 'Andhra Pradesh'] },
  { code: 'PSK-KOL-01', name: 'PSK Brabourne Road, Kolkata', states: ['West Bengal'] },
  { code: 'PSK-KOC-01', name: 'PSK Kakkanad, Kochi', states: ['Kerala'] },
  { code: 'PSK-JAI-01', name: 'PSK Jaipur', states: ['Rajasthan'] },
];

/** Police districts, by state, for PV routing. */
const PV_DISTRICTS: Record<string, { district: string; station: string }> = {
  Delhi: { district: 'New Delhi District', station: 'Connaught Place PS' },
  Maharashtra: { district: 'Mumbai Suburban', station: 'Malad PS' },
  Karnataka: { district: 'Bengaluru Urban', station: 'Ashok Nagar PS' },
  'Tamil Nadu': { district: 'Chennai Central', station: 'Egmore PS' },
  Telangana: { district: 'Hyderabad City', station: 'Begumpet PS' },
  'West Bengal': { district: 'Kolkata North', station: 'Burrabazar PS' },
  Kerala: { district: 'Ernakulam Rural', station: 'Kakkanad PS' },
  Rajasthan: { district: 'Jaipur North', station: 'Vidhyadhar Nagar PS' },
  'Uttar Pradesh': { district: 'Lucknow', station: 'Hazratganj PS' },
  Gujarat: { district: 'Ahmedabad City', station: 'Navrangpura PS' },
};

/** Thrown when a caller asks for a transition the state machine forbids. */
export class IllegalTransitionError extends Error {
  constructor(
    readonly arn: string,
    readonly from: CaseStage,
    readonly to: CaseStage,
    readonly allowed: CaseStage[]
  ) {
    super(
      `Case ${arn} is at '${from}' — it cannot move to '${to}'. ` +
        (allowed.length > 0
          ? `Legal next stages: ${allowed.join(', ')}.`
          : `'${from}' is terminal; the case is closed.`)
    );
    this.name = 'IllegalTransitionError';
  }
}

export class CaseNotFoundError extends Error {
  constructor(handle: string) {
    super(
      `No passport case for '${handle}'. Pass an ARN (ARN-2026-000123) or an ` +
        `applicationId (PIQ-2026-1001). Use list_passport_cases to see the register.`
    );
    this.name = 'CaseNotFoundError';
  }
}

export interface TransitionRequest {
  to: CaseStage;
  actor: Actor;
  by: string;
  tool: string;
  summary: string;
  rationale: string;
  detail?: Record<string, unknown>;
  /** Mutations applied to the case in the same atomic step as the stage change. */
  patch?: Partial<PassportCase>;
}

export interface SlaStatus {
  slaHours: number;
  hoursInStage: number;
  breached: boolean;
  /** 0..1+ — over 1 means the SLA is blown. */
  consumed: number;
  dueAt: string | null;
}

@Injectable({ deps: [ApplicationService, GraphService] })
export class CaseflowService {
  private readonly cases = new Map<string, PassportCase>();
  /** applicationId → arn, so either handle resolves. */
  private readonly byApplication = new Map<string, string>();

  private arnSequence = 0;
  private receiptSequence = 0;
  private tokenSequence = 0;
  private passportSequence = 0;
  private pvSequence = 0;
  private trackingSequence = 0;

  /** Set of "arn|stage" pairs already reported as breached, so we alert once. */
  private readonly breachAnnounced = new Set<string>();

  /** Subscribers notified after every committed transition (the events bridge). */
  private readonly listeners: Array<(entry: CaseJournalEntry, kase: PassportCase) => void> = [];

  constructor(
    private readonly applications: ApplicationService,
    private readonly graph: GraphService
  ) {
    this.seedFromApplicationPool();
  }

  // =========================================================================
  // Seeding
  // =========================================================================

  /**
   * Give every seeded application a case, staged so the board tells a story.
   *
   * The nine demo applications are not all at `submitted` — that would make the
   * lifecycle board a single column and hide the whole point. Instead they are
   * spread across the pipeline deterministically by their position in the pool,
   * with the fraud ring parked at `officer_review` (the decision the demo is
   * about) and the clean control already dispatched.
   *
   * Deterministic on purpose: same seed file, same board, every rehearsal.
   */
  private seedFromApplicationPool(): void {
    const pool = this.applications.getAll();

    // Where each application starts on the board. Anything not named here is
    // walked to `officer_review`, which is the honest default for a demo about a
    // decision queue.
    const START: Record<string, CaseStage> = {
      'PIQ-2026-1001': 'dispatched', // clean renewal, already on its way
      'PIQ-2026-1002': 'printing',
      'PIQ-2026-1003': 'delivered', // the clean control, closed happy
      'PIQ-2026-2001': 'officer_review', // ⬅ the ring hub: the demo decision
      'PIQ-2026-2002': 'officer_review',
      'PIQ-2026-2003': 'police_verification',
      'PIQ-2026-2004': 'officer_review',
      'PIQ-2026-3001': 'psk_visit_complete',
      'PIQ-2026-3002': 'fee_paid',
    };

    for (const application of pool) {
      const target = START[application.applicationId] ?? 'officer_review';
      const kase = this.createCaseRecord(application, application.submittedAt);
      this.cases.set(kase.arn, kase);
      this.byApplication.set(application.applicationId, kase.arn);
      this.fastForward(kase, target);
    }

    defaultLogger.info(
      `✓ Caseflow register seeded — ${this.cases.size} passport cases across ` +
        `${new Set([...this.cases.values()].map((c) => c.stage)).size} lifecycle stages`
    );
  }

  /**
   * Walk a freshly created case up to `target`, back-dating each step.
   *
   * Used only for seeding. It calls the same `applyTransition` the live tools do,
   * so a seeded case is indistinguishable in shape from one filed at runtime —
   * including a full journal. Back-dating matters: a case created "now" and shown
   * as `police_verification` would report 0 hours in stage and no SLA pressure,
   * making the board look artificially calm.
   */
  private fastForward(kase: PassportCase, target: CaseStage): void {
    const path = this.pathTo(kase.stage, target);
    // Spread the synthetic history over the window since submission so the SLA
    // clocks read plausibly rather than all landing on the same instant.
    const start = new Date(kase.openedAt).getTime();
    const span = Math.max(Date.now() - start, 1);
    const step = span / (path.length + 1);

    path.forEach((transition, i) => {
      const at = new Date(start + step * (i + 1)).toISOString();
      const seeded = this.seedDetailFor(kase, transition, at);
      this.applyTransition(
        kase,
        transition.to,
        {
          to: transition.to,
          actor: transition.actor,
          by: transition.actor === 'passport_officer' ? 'Officer (historic record)' : 'PassportIQ',
          tool: transition.tool,
          summary: transition.label,
          rationale:
            'Backfilled from the case register at boot so the lifecycle board opens with real ' +
            'history rather than an empty first column.',
          detail: { backfilled: true },
          patch: seeded,
        },
        at,
        /* silent */ true
      );
    });
  }

  /** Shortest legal sequence of transitions from `from` to `to`. BFS. */
  private pathTo(from: CaseStage, to: CaseStage): CaseTransition[] {
    if (from === to) return [];
    const queue: Array<{ stage: CaseStage; path: CaseTransition[] }> = [{ stage: from, path: [] }];
    const seen = new Set<CaseStage>([from]);

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) break;
      for (const transition of transitionsFrom(node.stage)) {
        if (seen.has(transition.to)) continue;
        const path = [...node.path, transition];
        if (transition.to === to) return path;
        seen.add(transition.to);
        queue.push({ stage: transition.to, path });
      }
    }
    return [];
  }

  /** The record each seeding step has to leave behind for the case to be coherent. */
  private seedDetailFor(
    kase: PassportCase,
    transition: CaseTransition,
    at: string
  ): Partial<PassportCase> {
    switch (transition.to) {
      case 'fee_paid':
        return { fee: this.buildFee(kase, 'netbanking', at) };
      case 'appointment_booked':
        return { appointment: this.buildAppointment(kase, undefined, at) };
      case 'psk_visit_complete':
        return { pskVisit: this.buildPskVisit(kase, at) };
      case 'police_verification':
        return { policeVerification: this.buildPvRequest(kase, at) };
      case 'officer_review':
        // Reaching officer_review from police_verification means a report landed.
        return kase.policeVerification
          ? {
              policeVerification: {
                ...kase.policeVerification,
                verdict: 'clear' as PoliceVerdict,
                reportedAt: at,
                remarks: 'Residence and identity confirmed at the stated address.',
              },
            }
          : {};
      case 'granted':
        return { officerDecision: 'approve' };
      case 'printing':
        return { booklet: this.buildBooklet(kase, at) };
      case 'dispatched':
        return { dispatch: this.buildDispatch(kase, 'India Post Speed Post', at) };
      case 'delivered':
        return kase.dispatch ? { dispatch: { ...kase.dispatch, deliveredAt: at } } : {};
      default:
        return {};
    }
  }

  private createCaseRecord(application: SeededApplication, openedAt: string): PassportCase {
    this.arnSequence += 1;
    const arn = `ARN-2026-${String(this.arnSequence).padStart(6, '0')}`;
    return {
      arn,
      applicationId: application.applicationId,
      applicantName: application.fullName,
      applicationType: application.applicationType,
      tatkal: false,
      stage: 'submitted',
      stageEnteredAt: openedAt,
      openedAt,
      closedAt: null,
      officerDecision: null,
      fee: null,
      appointment: null,
      pskVisit: null,
      policeVerification: null,
      clarification: null,
      booklet: null,
      dispatch: null,
      journal: [
        {
          seq: 1,
          at: openedAt,
          stage: 'submitted',
          fromStage: null,
          actor: 'citizen',
          by: application.fullName,
          tool: 'submit_passport_application',
          summary: `${application.applicationType} application filed online — ARN ${arn}`,
          rationale:
            'Case opened on receipt of the online form. Nothing has been verified yet; the ARN ' +
            'exists so the applicant can track from this moment on.',
          detail: {
            applicationType: application.applicationType,
            documents: application.documents.length,
          },
        },
      ],
    };
  }

  // =========================================================================
  // Reads
  // =========================================================================

  onTransition(listener: (entry: CaseJournalEntry, kase: PassportCase) => void): void {
    this.listeners.push(listener);
  }

  /** Resolve an ARN *or* an applicationId. Officers use both interchangeably. */
  find(handle: string): PassportCase | undefined {
    const direct = this.cases.get(handle);
    if (direct) return direct;
    const arn = this.byApplication.get(handle);
    return arn ? this.cases.get(arn) : undefined;
  }

  get(handle: string): PassportCase {
    const kase = this.find(handle);
    if (!kase) throw new CaseNotFoundError(handle);
    return kase;
  }

  getAll(): PassportCase[] {
    return [...this.cases.values()].sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  }

  count(): number {
    return this.cases.size;
  }

  /** SLA clock for whatever stage the case is sitting in. */
  sla(kase: PassportCase, now = Date.now()): SlaStatus {
    // Use the SLA of the stage the case is IN, which is declared on the
    // transitions leaving it. Terminal stages have no outbound transition and so
    // no SLA — a delivered case cannot be late.
    const outbound = transitionsFrom(kase.stage);
    if (outbound.length === 0) {
      return { slaHours: 0, hoursInStage: 0, breached: false, consumed: 0, dueAt: null };
    }
    const slaHours = Math.min(...outbound.map((t) => t.slaHours));
    const enteredAt = new Date(kase.stageEnteredAt).getTime();
    const hoursInStage = (now - enteredAt) / 3_600_000;
    return {
      slaHours,
      hoursInStage: Math.round(hoursInStage * 10) / 10,
      breached: hoursInStage > slaHours,
      consumed: Math.round((hoursInStage / slaHours) * 100) / 100,
      dueAt: new Date(enteredAt + slaHours * 3_600_000).toISOString(),
    };
  }

  /**
   * Cases whose current stage has blown its SLA, newly detected only.
   *
   * `breachAnnounced` keeps this idempotent: the orchestrator calls it on every
   * tick, and an unanswered breach must not re-alert every 20 seconds. Cleared
   * when the case moves on.
   */
  newlyBreached(now = Date.now()): Array<{ kase: PassportCase; sla: SlaStatus }> {
    const out: Array<{ kase: PassportCase; sla: SlaStatus }> = [];
    for (const kase of this.cases.values()) {
      const sla = this.sla(kase, now);
      if (!sla.breached) continue;
      const key = `${kase.arn}|${kase.stage}`;
      if (this.breachAnnounced.has(key)) continue;
      this.breachAnnounced.add(key);
      out.push({ kase, sla });
    }
    return out;
  }

  /** Board projection: stage columns in lifecycle order, with SLA per card. */
  board(): Array<{
    stage: CaseStage;
    label: string;
    waitingOnHuman: boolean;
    terminal: boolean;
    cases: Array<{
      arn: string;
      applicationId: string;
      applicantName: string;
      applicationType: ApplicationType;
      tatkal: boolean;
      stageEnteredAt: string;
      progress: number;
      sla: SlaStatus;
      nextAutonomousStep: string | null;
      hold: string | null;
    }>;
  }> {
    const columns = new Map<CaseStage, PassportCase[]>();
    for (const kase of this.getAll()) {
      const bucket = columns.get(kase.stage) ?? [];
      bucket.push(kase);
      columns.set(kase.stage, bucket);
    }

    // Only render columns that exist in the lifecycle, in lifecycle order, and
    // drop empty terminal columns so the board does not grow three dead lanes.
    const order: CaseStage[] = [
      'submitted',
      'fee_paid',
      'appointment_booked',
      'psk_visit_complete',
      'verification_running',
      'police_verification',
      'officer_review',
      'clarification',
      'granted',
      'printing',
      'dispatched',
      'delivered',
      'rejected',
      'withdrawn',
    ];

    return order
      .filter((stage) => !(isTerminal(stage) && (columns.get(stage)?.length ?? 0) === 0))
      .map((stage) => {
        const next = autonomousNext(stage);
        return {
          stage,
          label: STAGE_LABELS[stage],
          waitingOnHuman: WAITING_ON_HUMAN.includes(stage),
          terminal: isTerminal(stage),
          cases: (columns.get(stage) ?? []).map((kase) => ({
            arn: kase.arn,
            applicationId: kase.applicationId,
            applicantName: kase.applicantName,
            applicationType: kase.applicationType,
            tatkal: kase.tatkal,
            stageEnteredAt: kase.stageEnteredAt,
            progress: progressPercent(kase.stage),
            sla: this.sla(kase),
            nextAutonomousStep: next?.label ?? null,
            hold: next ? null : this.holdReason(kase),
          })),
        };
      });
  }

  private holdReason(kase: PassportCase): string {
    if (isTerminal(kase.stage)) return `Closed — ${STAGE_LABELS[kase.stage].toLowerCase()}.`;
    if (kase.stage === 'officer_review') {
      return 'Awaiting a human passport officer. PassportIQ has prepared the file and stops here.';
    }
    if (kase.stage === 'clarification') {
      return `Awaiting the applicant's reply: ${kase.clarification?.question ?? 'clarification requested'}`;
    }
    return `No autonomous step out of ${kase.stage}.`;
  }

  // =========================================================================
  // The state machine
  // =========================================================================

  /**
   * The ONLY way a case changes stage.
   *
   * Validates against CASE_TRANSITIONS first, so an illegal move raises a
   * message naming the legal ones instead of silently corrupting the register.
   */
  transition(handle: string, request: TransitionRequest): PassportCase {
    const kase = this.get(handle);
    const legal = transitionsFrom(kase.stage).map((t) => t.to);

    if (!legal.includes(request.to)) {
      throw new IllegalTransitionError(kase.arn, kase.stage, request.to, legal);
    }

    return this.applyTransition(kase, request.to, request, new Date().toISOString(), false);
  }

  private applyTransition(
    kase: PassportCase,
    to: CaseStage,
    request: TransitionRequest,
    at: string,
    silent: boolean
  ): PassportCase {
    const from = kase.stage;

    if (request.patch) Object.assign(kase, request.patch);

    kase.stage = to;
    kase.stageEnteredAt = at;
    if (isTerminal(to)) kase.closedAt = at;

    // A case that moved has a fresh SLA clock; let it breach again if it stalls.
    this.breachAnnounced.delete(`${kase.arn}|${from}`);

    const entry: CaseJournalEntry = {
      seq: kase.journal.length + 1,
      at,
      stage: to,
      fromStage: from,
      actor: request.actor,
      by: request.by,
      tool: request.tool,
      summary: request.summary,
      rationale: request.rationale,
      detail: request.detail ?? {},
    };
    kase.journal.push(entry);

    if (!silent) {
      for (const listener of this.listeners) {
        try {
          listener(entry, kase);
        } catch (error) {
          // A broken subscriber must never roll back a committed transition.
          defaultLogger.warn(
            `Caseflow listener threw on ${kase.arn} ${from}→${to}: ${(error as Error).message}`
          );
        }
      }
    }

    return kase;
  }

  /**
   * Withdraw a case from wherever it stands.
   *
   * The one transition NOT in CASE_TRANSITIONS. Adding `→ withdrawn` from each of
   * the eleven live stages would triple the table for a step with no
   * preconditions beyond "not already closed", and would let the autonomous
   * orchestrator see withdrawal as a legal move — which it must never do.
   * Keeping it here, off the table, means the agent structurally cannot withdraw
   * somebody's passport application.
   */
  withdraw(handle: string, reason: string, rationale?: string): PassportCase {
    const kase = this.get(handle);

    if (isTerminal(kase.stage)) {
      throw new Error(
        `${kase.arn} is already closed at '${kase.stage}' and cannot be withdrawn. ` +
          `File a fresh application instead.`
      );
    }

    const at = new Date().toISOString();
    return this.applyTransition(
      kase,
      'withdrawn',
      {
        to: 'withdrawn',
        actor: 'citizen',
        by: kase.applicantName,
        tool: 'withdraw_passport_application',
        summary: `Application withdrawn by the applicant from '${kase.stage}'`,
        rationale:
          rationale ??
          `The applicant asked to withdraw: ${reason}. Withdrawal is the applicant's right at any ` +
            `point before issuance, so the case closes here with no verdict recorded.`,
        detail: { reason, withdrawnFrom: kase.stage },
      },
      at,
      false
    );
  }

  // =========================================================================
  // Intake — the only place a new case (and a new application) is created
  // =========================================================================

  /**
   * File a brand new application.
   *
   * Registers BOTH a case and a SeededApplication, then reindexes the fraud
   * graph so the new ARN is immediately comparable against the existing pool.
   * That last step is what makes a live demo submission land: file an
   * application reusing the ring's phone number and the graph lights up on the
   * next detect_duplicate_signals with no restart.
   */
  openCase(input: SubmitApplicationInput, now = new Date().toISOString()): PassportCase {
    const applicationId = this.applications.nextApplicationId();

    const documents = this.materialiseDocuments(input, applicationId);

    const application: SeededApplication = {
      applicationId,
      applicantId: `APLT-${applicationId.split('-').pop() ?? '0000'}`,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      nationality: 'IN',
      applicationType: input.applicationType,
      submittedAt: now,
      status: 'pending_review',
      passport: {
        number: input.passportNumber ?? this.provisionalPassportNumber(),
        issuingCountry: 'IN',
      },
      contact: { email: input.email, phone: input.phone },
      address: {
        line1: input.address.line1,
        ...(input.address.line2 !== undefined ? { line2: input.address.line2 } : {}),
        city: input.address.city,
        state: input.address.state,
        pincode: input.address.pincode,
      },
      documents,
      extractedFrom: {
        documentId: documents[0]?.documentId ?? `${applicationId}-DOC-1`,
        source: 'application_form',
        extractedAt: now,
      },
      // seedProfile records what the fixture *intended* to plant, so the seed
      // test can assert intent against detection. A runtime submission planted
      // nothing: it is a real application whose overlaps, if any, are genuine.
      // Labelling it honestly keeps `npm run test:seed` meaningful.
      seedProfile: {
        label: `Runtime submission — ${input.fullName}`,
        ring: null,
        notes:
          'Filed at runtime through submit_passport_application. No overlaps were planted; ' +
          'any duplicate signal found against this application is real.',
      },
    };

    this.applications.addApplication(application);
    // Rebuild the identifier index so the new application participates in
    // cross-application detection from this instant.
    this.graph.reindex();

    const kase = this.createCaseRecord(application, now);
    kase.tatkal = input.tatkal;
    this.cases.set(kase.arn, kase);
    this.byApplication.set(applicationId, kase.arn);

    return kase;
  }

  /**
   * Turn the uploaded-document list into checklist-shaped records.
   *
   * An unrecognised type is dropped rather than rejected: the counter-A
   * checklist in `pskVisit.documentsMissing` is the honest place for that to
   * surface, and refusing the whole submission over one odd upload would be a
   * worse product than accepting it and flagging the gap.
   */
  private materialiseDocuments(
    input: SubmitApplicationInput,
    applicationId: string
  ): SeededApplication['documents'] {
    const allowed = new Set([
      'aadhaar',
      'birth_certificate',
      'old_passport',
      'address_proof',
      'photograph',
      'fir_copy',
      'parent_consent',
    ]);

    const provided = input.documents.filter((d) => allowed.has(d.type));

    // Always guarantee at least one document: SeededApplicationSchema requires
    // documents.min(1), and a form filed with no attachments is a real case that
    // must still be representable (it simply fails document_validate).
    const list = provided.length > 0 ? provided : [{ type: 'photograph', imageHash: undefined }];

    return list.map((doc, i) => ({
      documentId: `${applicationId}-DOC-${i + 1}`,
      type: doc.type as SeededApplication['documents'][number]['type'],
      // A hash is generated when the citizen portal did not supply one, so the
      // document is still comparable. Derived from the applicant + type so two
      // genuinely different people never collide by accident.
      imageHash:
        doc.imageHash ??
        `sha256:${this.hash(`${input.fullName}|${input.dateOfBirth}|${doc.type}|${i}`)}`,
      statedName: input.fullName,
      statedDob: input.dateOfBirth,
      statedAddress: {
        line1: input.address.line1,
        city: input.address.city,
        state: input.address.state,
        pincode: input.address.pincode,
      },
    }));
  }

  /** Small deterministic hash — enough to look like a digest, no crypto needed. */
  private hash(value: string): string {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < value.length; i += 1) {
      h1 = (h1 ^ value.charCodeAt(i)) * 0x01000193;
      h2 = (h2 + value.charCodeAt(i) * (i + 7)) * 0x85ebca6b;
    }
    const a = (h1 >>> 0).toString(16).padStart(8, '0');
    const b = (h2 >>> 0).toString(16).padStart(8, '0');
    return `${a}${b}${a}${b}`.slice(0, 32);
  }

  private provisionalPassportNumber(): string {
    this.passportSequence += 1;
    return `Z${String(4_000_000 + this.passportSequence).padStart(7, '0')}`;
  }

  // =========================================================================
  // Stage payload builders — the artefacts each step leaves behind
  // =========================================================================

  buildFee(
    kase: PassportCase,
    method: 'upi' | 'netbanking' | 'card' | 'challan',
    at = new Date().toISOString()
  ): NonNullable<PassportCase['fee']> {
    this.receiptSequence += 1;
    const schedule = FEE_SCHEDULE[kase.applicationType];
    return {
      amount: kase.tatkal ? schedule.tatkal : schedule.normal,
      currency: 'INR',
      receiptNo: `RCPT-2026-${String(this.receiptSequence).padStart(6, '0')}`,
      paidAt: at,
      method,
    };
  }

  buildAppointment(
    kase: PassportCase,
    preferredCode: string | undefined,
    at = new Date().toISOString()
  ): NonNullable<PassportCase['appointment']> {
    const application = this.applications.getApplication(kase.applicationId);
    const state = application.address.state;

    const psk =
      (preferredCode ? PSK_NETWORK.find((p) => p.code === preferredCode) : undefined) ??
      PSK_NETWORK.find((p) => p.states.includes(state)) ??
      PSK_NETWORK[0];

    this.tokenSequence += 1;

    // Tatkal gets the next working day; normal gets a slot three days out. Both
    // land at 10:00 IST (04:30Z) so the slot reads like a real appointment
    // rather than "whenever the tick happened to fire".
    const base = new Date(at);
    base.setUTCDate(base.getUTCDate() + (kase.tatkal ? 1 : 3));
    base.setUTCHours(4, 30, 0, 0);

    return {
      pskCode: psk?.code ?? 'PSK-DEL-01',
      pskName: psk?.name ?? 'PSK Herald House, New Delhi',
      slot: base.toISOString(),
      tokenNo: `TKN-${String(this.tokenSequence).padStart(4, '0')}`,
    };
  }

  buildPskVisit(
    kase: PassportCase,
    at = new Date().toISOString()
  ): NonNullable<PassportCase['pskVisit']> {
    const application = this.applications.getApplication(kase.applicationId);
    const required = REQUIRED_DOCUMENTS[kase.applicationType];
    const held = new Set(application.documents.map((d) => d.type));
    const granted = required.filter((type) => held.has(type as never));
    const missing = required.filter((type) => !held.has(type as never));

    // Counter C (granting) only clears when the checklist is complete. That is
    // not decoration: run_case_verification refuses to start without it, which
    // is how a document gap stops the line instead of quietly reaching an
    // officer as a "verified" file.
    return {
      completedAt: at,
      counterA: true,
      counterB: true,
      counterC: missing.length === 0,
      biometrics: { photo: true, fingerprints: 10, signature: true },
      documentsGranted: granted,
      documentsMissing: missing,
    };
  }

  buildPvRequest(
    kase: PassportCase,
    at = new Date().toISOString()
  ): NonNullable<PassportCase['policeVerification']> {
    const application = this.applications.getApplication(kase.applicationId);
    const routing =
      PV_DISTRICTS[application.address.state] ??
      { district: `${application.address.city} District`, station: `${application.address.city} PS` };
    this.pvSequence += 1;
    return {
      requestedAt: at,
      district: routing.district,
      station: routing.station,
      referenceNo: `PV-2026-${String(this.pvSequence).padStart(5, '0')}`,
      verdict: null,
      reportedAt: null,
      remarks: null,
    };
  }

  buildBooklet(
    kase: PassportCase,
    at = new Date().toISOString()
  ): NonNullable<PassportCase['booklet']> {
    this.passportSequence += 1;
    const schedule = FEE_SCHEDULE[kase.applicationType];
    const validUntil = new Date(at);
    validUntil.setUTCFullYear(validUntil.getUTCFullYear() + schedule.validityYears);
    return {
      // Indian passport numbers are one letter + seven digits.
      passportNumber: `${'ABCDEFGHJKLMNPRSTUVWXYZ'[this.passportSequence % 23]}${String(
        1_000_000 + this.passportSequence * 7919
      ).slice(-7)}`,
      printedAt: at,
      pages: schedule.pages,
      validUntil: validUntil.toISOString().slice(0, 10),
      printQueue: kase.tatkal ? 'Nashik ISP — tatkal lane' : 'Nashik ISP — regular lane',
    };
  }

  buildDispatch(
    kase: PassportCase,
    courier: string,
    at = new Date().toISOString()
  ): NonNullable<PassportCase['dispatch']> {
    this.trackingSequence += 1;
    return {
      dispatchedAt: at,
      courier,
      trackingNo: `EI${String(100_000_000 + this.trackingSequence * 137).slice(0, 9)}IN`,
      deliveredAt: null,
    };
  }

  /**
   * The address as duplicate detection sees it.
   *
   * Exposed so the tracker can show the applicant the normalised form actually
   * being compared — which is the difference between "we think you are a
   * duplicate" and "here is the exact string that matched".
   */
  normalizedAddress(kase: PassportCase): string {
    // normalizeAddress returns null for an application with no address on file.
    // Surfacing the empty string would read as "we compared nothing and matched";
    // saying so explicitly is the honest projection.
    return (
      normalizeAddress(this.applications.getApplication(kase.applicationId).address) ??
      '(no address on file)'
    );
  }

  /** Test-only: forget every runtime case, keeping the seeded register. */
  resetRuntimeCases(): void {
    for (const [arn, kase] of [...this.cases.entries()]) {
      if (Number(arn.split('-').pop()) > 9) {
        this.cases.delete(arn);
        this.byApplication.delete(kase.applicationId);
      }
    }
  }
}

export { CASE_TRANSITIONS };
