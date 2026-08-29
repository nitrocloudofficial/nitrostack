/**
 * ApplicationService — the seeded applicant pool and the decision store.
 *
 * Owner: Backend B. This is the only class that knows where application data
 * lives, so swapping the JSON seed for a real datastore later touches one file.
 *
 * Backend A's tools are welcome to inject this for document/field lookups rather
 * than re-reading the seed file — see getApplication() / getDocuments().
 */
import { Injectable } from '@nitrostack/core';
import {
  DECISION_TO_STATUS,
  type ApplicationStatus,
  type DecisionRecord,
  type OfficerDecideInput,
  type SeedApplicant,
  type SeedDocument,
  type SeededApplication,
  toSeedApplicant,
} from '../../../contracts/index.js';
import { loadSeedDataset } from './seed-data.loader.js';
import { formatAddress } from './signal-normalizer.js';

/** Thrown when a tool is handed an applicationId that is not in the pool. */
export class ApplicationNotFoundError extends Error {
  constructor(applicationId: string, known: string[]) {
    super(
      `Application '${applicationId}' not found in the seeded pool. ` +
        `Known applications: ${known.join(', ')}`
    );
    this.name = 'ApplicationNotFoundError';
  }
}

@Injectable()
export class ApplicationService {
  private readonly applications = new Map<string, SeededApplication>();

  /**
   * Decisions live in memory only, keyed by applicationId.
   *
   * Deliberate: a hackathon demo that writes decisions to disk gains nothing and
   * risks a leftover decision from a rehearsal run making the live application
   * look already-decided. Every server restart is a clean slate.
   */
  private readonly decisions = new Map<string, DecisionRecord>();

  private decisionSequence = 0;

  constructor() {
    const dataset = loadSeedDataset();
    for (const application of dataset.applications) {
      this.applications.set(application.applicationId, application);
    }
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  /** Every seeded application, in submission order (oldest first). */
  getAll(): SeededApplication[] {
    return [...this.applications.values()].sort((a, b) =>
      a.submittedAt.localeCompare(b.submittedAt)
    );
  }

  getIds(): string[] {
    return [...this.applications.keys()];
  }

  has(applicationId: string): boolean {
    return this.applications.has(applicationId);
  }

  /** @throws ApplicationNotFoundError so tools surface a usable message. */
  getApplication(applicationId: string): SeededApplication {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId, this.getIds());
    }
    return application;
  }

  /** The frozen contracts.md §1 projection, for anything parsing that shape. */
  getSeedApplicant(applicationId: string): SeedApplicant {
    return toSeedApplicant(this.getApplication(applicationId));
  }

  getDocuments(applicationId: string): SeedDocument[] {
    return this.getApplication(applicationId).documents;
  }

  /** Current status: the recorded decision if there is one, else the seeded status. */
  getStatus(applicationId: string): ApplicationStatus {
    const decided = this.decisions.get(applicationId);
    if (decided) return decided.status;
    return this.getApplication(applicationId).status;
  }

  /** Compact summary for the dashboard's left-hand panel and the list tool. */
  getSummary(applicationId: string): ApplicationSummary {
    const application = this.getApplication(applicationId);
    return {
      applicationId: application.applicationId,
      applicantName: application.fullName,
      applicationType: application.applicationType,
      dateOfBirth: application.dateOfBirth,
      passportNumber: application.passport.number,
      phone: application.contact?.phone ?? null,
      email: application.contact?.email ?? null,
      address: formatAddress(application.address),
      documentCount: application.documents.length,
      submittedAt: application.submittedAt,
      status: this.getStatus(application.applicationId),
    };
  }

  // -------------------------------------------------------------------------
  // Writes — the only mutating path in Backend B
  // -------------------------------------------------------------------------

  /**
   * Record an officer's final decision.
   *
   * Called by officer_decide AFTER PipelineCompleteGuard has allowed it. The risk
   * score and stage list are passed in rather than looked up here, so this
   * service carries no dependency on Backend A's scoring internals.
   */
  recordDecision(
    input: OfficerDecideInput,
    context: {
      officer: string;
      stagesCompleted: string[];
      riskScoreAtDecision: number | null;
      linkedApplicationIds: string[];
    }
  ): DecisionRecord {
    const application = this.getApplication(input.applicationId);

    // Invariant at the write boundary, not just at the tool. DECISION_TO_STATUS
    // is a plain Record lookup: an off-enum `decision` silently yields
    // `status: undefined`, producing an audit row that satisfies no schema and
    // can never be corrected because the log is append-only. officer_decide
    // already parses its input; this second check means a future caller (a bulk
    // importer, a replay script) cannot corrupt the trail by skipping that.
    const status = DECISION_TO_STATUS[input.decision];
    if (status === undefined) {
      throw new Error(
        `Refusing to record decision '${String(input.decision)}' for ${input.applicationId}: ` +
          `not one of ${Object.keys(DECISION_TO_STATUS).join(', ')}.`
      );
    }

    this.decisionSequence += 1;

    const record: DecisionRecord = {
      recordId: `DEC-${String(this.decisionSequence).padStart(4, '0')}`,
      applicationId: application.applicationId,
      applicantName: application.fullName,
      decision: input.decision,
      ...(input.note !== undefined ? { note: input.note } : {}),
      officer: context.officer,
      decidedAt: new Date().toISOString(),
      status,
      stagesCompleted: [...context.stagesCompleted],
      riskScoreAtDecision: context.riskScoreAtDecision,
      linkedApplicationIds: [...context.linkedApplicationIds],
    };

    this.decisions.set(application.applicationId, record);
    return record;
  }

  /**
   * Register an application filed at runtime.
   *
   * The pool started life as a read-only fixture, which was correct while the
   * only applications were the nine seeded ones. Once citizens can file through
   * the caseflow intake, the pool has to grow — and everything downstream
   * (duplicate detection, the graph, the console queue) reads it through this
   * service, so a single insertion point keeps them all consistent.
   *
   * Callers MUST ask GraphService to reindex afterwards: the identifier index is
   * built once at construction, so an application added without a reindex is
   * invisible to cross-application detection and would look permanently clean.
   * CaseflowService.openCase() does both in one step; do not add a second path.
   *
   * @throws when the id already exists — silently overwriting an application
   *         would rewrite history under a live case.
   */
  addApplication(application: SeededApplication): SeededApplication {
    if (this.applications.has(application.applicationId)) {
      throw new Error(
        `Application '${application.applicationId}' already exists in the pool. ` +
          `Runtime intake must allocate a fresh id via nextApplicationId().`
      );
    }
    this.applications.set(application.applicationId, application);
    return application;
  }

  /**
   * Allocate the next free application id.
   *
   * Runtime submissions live in the 9xxx band so they are instantly
   * distinguishable from the seeded 1xxx/2xxx/3xxx demo cohort — useful when a
   * judge asks "is that one you just filed, or was it planted?".
   */
  nextApplicationId(): string {
    const used = new Set(this.applications.keys());
    let n = 9001;
    while (used.has(`PIQ-2026-${n}`)) n += 1;
    return `PIQ-2026-${n}`;
  }

  /** Overwrite the seeded status of an application (caseflow stage changes). */
  setStatus(applicationId: string, status: ApplicationStatus): void {
    const application = this.getApplication(applicationId);
    application.status = status;
  }

  getDecision(applicationId: string): DecisionRecord | undefined {
    return this.decisions.get(applicationId);
  }

  hasDecision(applicationId: string): boolean {
    return this.decisions.has(applicationId);
  }

  /** Test-only: forget recorded decisions without rebuilding the applicant pool. */
  resetDecisions(): void {
    this.decisions.clear();
    this.decisionSequence = 0;
  }
}

export interface ApplicationSummary {
  applicationId: string;
  applicantName: string;
  applicationType: string;
  dateOfBirth: string;
  passportNumber: string;
  phone: string | null;
  email: string | null;
  address: string;
  documentCount: number;
  submittedAt: string;
  status: ApplicationStatus;
}
