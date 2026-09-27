/**
 * DocumentService — the document checklist behind `document_validate`.
 *
 * Deterministic and read-only. The only inputs are the application type and the
 * documents actually attached, and the only outputs are "which required document
 * is absent" and "which attached document is out of date". No model, no
 * heuristics, no scoring: this stage exists to state facts the later stages
 * reason about.
 *
 * The checklist itself is the interesting part. It is expressed per application
 * type, because a renewal legitimately has no birth certificate and demanding one
 * would flag every clean renewal in the queue — that class of false positive is
 * what makes officers stop trusting a tool.
 */
import { Injectable } from '@nitrostack/core';
import type {
  DocumentChecklistRow,
  DocumentType,
  DocumentValidateResult,
  SeededApplication,
  Severity,
} from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';

/**
 * Documents required per application type, per the Passport Rules checklist the
 * demo models. Order matters: it is the order the officer's UI renders.
 */
export const REQUIRED_DOCUMENTS: Readonly<Record<string, readonly DocumentType[]>> = {
  fresh: ['aadhaar', 'birth_certificate', 'address_proof', 'photograph'],
  renewal: ['aadhaar', 'old_passport', 'address_proof', 'photograph'],
  lost_replacement: ['aadhaar', 'fir_copy', 'address_proof', 'photograph'],
  minor: ['aadhaar', 'birth_certificate', 'address_proof', 'photograph', 'parent_consent'],
};

/**
 * A document inside this window is flagged as expiring soon rather than valid.
 *
 * 90 days is not arbitrary: a passport issued against an address proof that
 * lapses next month produces a mismatch at the next renewal, so the officer is
 * told now while a fresh document is cheap to ask for.
 */
export const DOCUMENT_EXPIRY_WARNING_DAYS = 90;

@Injectable({ deps: [ApplicationService] })
export class DocumentService {
  constructor(private readonly applications: ApplicationService) {}

  /** Required document types for an application type; empty for an unknown type. */
  getRequiredDocuments(applicationType: string): readonly DocumentType[] {
    return REQUIRED_DOCUMENTS[applicationType] ?? [];
  }

  /**
   * Validate the document set.
   *
   * @param asOf injectable "today", so the expiry branch is testable without
   *        waiting for a document to lapse. Defaults to the real clock.
   */
  validate(applicationId: string, asOf: Date = new Date()): DocumentValidateResult {
    const application = this.applications.getApplication(applicationId);
    const required = this.getRequiredDocuments(application.applicationType);
    const today = asOf.toISOString().slice(0, 10);

    const checklist: DocumentChecklistRow[] = [];
    const seen = new Set<DocumentType>();

    for (const documentType of required) {
      const document = application.documents.find((candidate) => candidate.type === documentType);
      seen.add(documentType);
      checklist.push(this.buildRow(documentType, document, today, true));
    }

    // Documents present but not on the checklist. Not an error — an applicant
    // volunteering an extra proof is fine — but the UI shows them so the officer
    // knows the file contains more than the checklist covers.
    for (const document of application.documents) {
      if (seen.has(document.type)) continue;
      seen.add(document.type);
      checklist.push(this.buildRow(document.type, document, today, false));
    }

    const missingDocuments = checklist
      .filter((row) => row.required && !row.present)
      .map((row) => row.documentType);

    const expiredDocuments = checklist.filter((row) => row.expired).map((row) => row.documentType);

    const expiringSoonDocuments = checklist
      .filter(
        (row) =>
          row.present &&
          !row.expired &&
          row.daysToExpiry !== null &&
          row.daysToExpiry <= DOCUMENT_EXPIRY_WARNING_DAYS
      )
      .map((row) => row.documentType);

    const unexpectedDocuments = checklist
      .filter((row) => !row.required && row.present)
      .map((row) => row.documentType);

    return {
      applicationId: application.applicationId,
      applicationType: application.applicationType,

      missingDocuments,
      expiredDocuments,
      // `complete` means the checklist is satisfied AND nothing on it has lapsed.
      // An expired address proof is not a complete file, even though the document
      // is physically present.
      complete: missingDocuments.length === 0 && expiredDocuments.length === 0,

      requiredDocuments: [...required],
      presentDocuments: [...new Set(application.documents.map((document) => document.type))],
      expiringSoonDocuments,
      unexpectedDocuments,
      checklist,
      findings: this.buildFindings(
        application,
        missingDocuments,
        expiredDocuments,
        expiringSoonDocuments
      ),
    };
  }

  private buildRow(
    documentType: DocumentType,
    document: SeededApplication['documents'][number] | undefined,
    today: string,
    required: boolean
  ): DocumentChecklistRow {
    const expiresOn = document?.expiresOn ?? null;
    const daysToExpiry = expiresOn === null ? null : daysBetween(today, expiresOn);

    return {
      documentType,
      required,
      present: document !== undefined,
      documentId: document?.documentId ?? null,
      expiresOn,
      expired: expiresOn !== null && expiresOn < today,
      daysToExpiry,
    };
  }

  private buildFindings(
    application: SeededApplication,
    missing: DocumentType[],
    expired: DocumentType[],
    expiringSoon: DocumentType[]
  ): Array<{ severity: Severity; detail: string }> {
    const findings: Array<{ severity: Severity; detail: string }> = [];

    for (const documentType of missing) {
      findings.push({
        // A missing parental consent on a minor application is a hard stop; any
        // other absent document is a request-clarification matter.
        severity: documentType === 'parent_consent' ? 'high' : 'medium',
        detail: `Required document '${humanise(documentType)}' is not attached to this ${
          application.applicationType
        } application.`,
      });
    }

    for (const documentType of expired) {
      findings.push({
        severity: 'high',
        detail: `'${humanise(documentType)}' has expired and cannot support this application.`,
      });
    }

    for (const documentType of expiringSoon) {
      findings.push({
        severity: 'low',
        detail: `'${humanise(
          documentType
        )}' expires within ${DOCUMENT_EXPIRY_WARNING_DAYS} days — request a current copy.`,
      });
    }

    return findings;
  }
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative when `to` is past. */
function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

/** 'birth_certificate' -> 'Birth Certificate'. Used in officer-facing text only. */
export function humanise(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
