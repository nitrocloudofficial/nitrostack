import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';

/**
 * Visa Case lifecycle status.
 *
 * TODO(visa-case): expand to the full lifecycle defined in
 * docs/ARCHITECTURE.md §14 ("Case Lifecycle"): Draft -> Intake in Progress
 * -> Evidence Collection -> Operations Review -> Broker Assignment Pending
 * Approval -> Broker Assigned -> Submission Readiness Review -> Final
 * Submission Pending Approval -> Submitted -> Decision Received -> Closed,
 * plus exceptional paths (On Hold, Information Required, Escalated,
 * Withdrawn, Rejected). A transition table owned by this module must
 * govern which roles/prerequisites can move a case between states.
 */
export type CaseStatus = 'DRAFT';

/**
 * In-memory Visa Case record.
 *
 * TODO(visa-case): this shape is a first vertical slice. The real record
 * per docs/MODULES.md §3.1 also owns tenant ownership, participants,
 * eligibility intake, milestones, operational notes, and transition
 * history.
 */
/**
 * [LLD] Case model — target shape
 * `{ _id, clientId, source, destination, visaType, profile, status, phase,
 * brokerId?, checklist:[{ itemId, label, required, status }], createdAt,
 * updatedAt }`. Status and phase drive progress steppers. Checklist item
 * status is `not_uploaded|under_review|accepted|needs_fix|expiry_risk`.
 *
 * This delivered interface is a deliberately smaller in-memory vertical
 * slice. The target record is persisted in MongoDB and remains the source of
 * truth for live case/approval state; it must never be replaced by a cache.
 */
export interface VisaCaseRecord {
    caseId: string;
    destinationCountry: string;
    nationality: string;
    visaType: string;
    status: CaseStatus;
    createdAt: string;
    nextStep: string;
}

export interface CreateCaseInput {
    destinationCountry: string;
    nationality: string;
    visaType: string;
}

/**
 * VisaCaseService
 *
 * First vertical slice of the Visa Case Module described in
 * docs/MODULES.md §3.1 and docs/ARCHITECTURE.md §6. Owns case creation and
 * retrieval only.
 *
 * Storage: in-memory Map, intentionally non-persistent. Data is lost on
 * process restart.
 *
 * TODO(visa-case): replace the in-memory Map with the MongoDB-backed Case
 * Service described in docs/ARCHITECTURE.md §7 ("Case Service") once the
 * Integration Adapter Services (MongoDB Service) are implemented.
 * TODO(visa-case): every mutation must eventually carry tenant ID, actor
 * identity, and correlation ID per docs/ARCHITECTURE.md §16 and enforce
 * tenant isolation per docs/MODULES.md.
 * TODO(visa-case): case_start must eventually record an audit entry
 * (Audit Service) and emit `case.created` (Nitro Event) per docs/EVENTS.md
 * and docs/TASKS.md (`case_intake` task), and case creation must capture
 * consent per docs/TOOLS.md before this is a real capability.
 * TODO(visa-case): document acceptance, broker assignment, and final
 * submission remain out of scope until the Approval Module exists — this
 * service must never simulate those outcomes.
 */
@Injectable()
export class VisaCaseService {
    private readonly cases = new Map<string, VisaCaseRecord>();

    /**
     * Create a new visa case in DRAFT status.
     */
    async createCase(input: CreateCaseInput): Promise<VisaCaseRecord> {
        const record: VisaCaseRecord = {
            caseId: randomUUID(),
            destinationCountry: input.destinationCountry,
            nationality: input.nationality,
            visaType: input.visaType,
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            nextStep: 'Complete onboarding.'
        };

        this.cases.set(record.caseId, record);
        return record;
    }

    /**
     * Retrieve a previously created visa case.
     *
     * TODO(visa-case): normalize this into a stable application error
     * (e.g. CaseNotFoundError) once the error taxonomy from
     * docs/ARCHITECTURE.md §16 exists, instead of a plain Error.
     */
    async getCase(caseId: string): Promise<VisaCaseRecord> {
        const record = this.cases.get(caseId);
        if (!record) {
            throw new Error(`Case not found: ${caseId}`);
        }
        return record;
    }
}
