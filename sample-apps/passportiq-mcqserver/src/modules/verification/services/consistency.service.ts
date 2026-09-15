/**
 * ConsistencyService — one comparison engine, two stages.
 *
 * `check_identity_consistency` and `check_address_consistency` are the same
 * operation over different field sets, so per the build doc they share this
 * service rather than duplicating the diff logic. `compare()` takes the field set
 * as a parameter; the two tools differ only in which set they pass.
 *
 * ---------------------------------------------------------------------------
 * WHAT COUNTS AS A MISMATCH
 * ---------------------------------------------------------------------------
 * The application form is the reference. Each document that STATES a field is
 * compared against the form, and the resulting `sources` map always contains the
 * form value plus every document value that disagrees — which is precisely the
 * side-by-side view Frontend B's Evidence Explorer renders.
 *
 * Name comparison is delegated to `compareNames()`, which distinguishes a
 * different person from a filing convention. That distinction is the whole reason
 * this stage is worth having: an officer who is shown four "mismatches" that are
 * all just reordered middle names learns to ignore the panel.
 */
import { Injectable } from '@nitrostack/core';
import type {
  ConsistencyResult,
  FieldMismatch,
  SeedDocument,
  SeededApplication,
  Severity,
} from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { formatAddress } from './ocr.service.js';
import { canonical, charSimilarity, compareNames, severityFromSimilarity } from './text-similarity.js';

/** Fields compared by `check_identity_consistency`. */
export const IDENTITY_FIELDS = ['fullName', 'dateOfBirth'] as const;

/** Fields compared by `check_address_consistency`. */
export const ADDRESS_FIELDS = ['pincode', 'city', 'state', 'addressLine'] as const;

/** Label used for the form itself in every `sources` map. */
const FORM_SOURCE = 'application_form';

@Injectable({ deps: [ApplicationService] })
export class ConsistencyService {
  constructor(private readonly applications: ApplicationService) {}

  /** Compare identity fields across every document that states them. */
  checkIdentity(applicationId: string): ConsistencyResult {
    const application = this.applications.getApplication(applicationId);
    const mismatches: FieldMismatch[] = [];

    mismatches.push(...this.compareName(application));
    mismatches.push(...this.compareDateOfBirth(application));

    return this.assemble(application, 'identity', [...IDENTITY_FIELDS], mismatches, (document) =>
      document.statedName !== undefined || document.statedDob !== undefined
    );
  }

  /** Compare PIN code, city, state and street line across address-bearing documents. */
  checkAddress(applicationId: string): ConsistencyResult {
    const application = this.applications.getApplication(applicationId);
    const mismatches: FieldMismatch[] = [];

    for (const document of application.documents) {
      if (document.statedAddress === undefined) continue;
      const stated = document.statedAddress;

      // PIN code is compared exactly and graded HIGH. It is the one address field
      // that is machine-checkable and unambiguous, so a difference is a real
      // discrepancy rather than a transcription variant.
      if (stated.pincode !== undefined && stated.pincode !== application.address.pincode) {
        mismatches.push({
          field: 'pincode',
          sources: {
            [FORM_SOURCE]: application.address.pincode,
            [document.type]: stated.pincode,
          },
          similarity: charSimilarity(application.address.pincode, stated.pincode),
          severity: 'high',
          detail:
            `PIN code on the ${humanLabel(document.type)} (${stated.pincode}) does not match the ` +
            `application form (${application.address.pincode}).`,
        });
      }

      for (const field of ['city', 'state'] as const) {
        const documentValue = stated[field];
        if (documentValue === undefined) continue;
        if (canonical(documentValue) === canonical(application.address[field])) continue;

        const similarity = charSimilarity(application.address[field], documentValue);
        mismatches.push({
          field,
          sources: {
            [FORM_SOURCE]: application.address[field],
            [document.type]: documentValue,
          },
          similarity,
          severity: severityFromSimilarity(similarity),
          detail:
            `${humanLabel(field)} differs between the application form ` +
            `("${application.address[field]}") and the ${humanLabel(document.type)} ` +
            `("${documentValue}").`,
        });
      }

      // The street line is only compared when the document actually carries one.
      // Most address proofs in the dataset state city/state/PIN only, and
      // treating an absent line1 as an empty street would flag every one of them.
      if (stated.line1 !== undefined) {
        const formLine = formatAddress(application.address);
        const documentLine = formatAddress({ ...application.address, ...stated });

        if (canonical(formLine) !== canonical(documentLine)) {
          const similarity = charSimilarity(formLine, documentLine);
          mismatches.push({
            field: 'addressLine',
            sources: { [FORM_SOURCE]: formLine, [document.type]: documentLine },
            similarity,
            severity: severityFromSimilarity(similarity),
            detail:
              `Street address on the ${humanLabel(document.type)} does not match the ` +
              `application form.`,
          });
        }
      }
    }

    return this.assemble(
      application,
      'address',
      [...ADDRESS_FIELDS],
      mismatches,
      (document) => document.statedAddress !== undefined
    );
  }

  // -------------------------------------------------------------------------
  // Field comparisons
  // -------------------------------------------------------------------------

  private compareName(application: SeededApplication): FieldMismatch[] {
    const mismatches: FieldMismatch[] = [];

    for (const document of application.documents) {
      if (document.statedName === undefined) continue;

      const comparison = compareNames(application.fullName, document.statedName);
      if (!comparison.isMismatch) continue;

      mismatches.push({
        field: 'fullName',
        sources: {
          [FORM_SOURCE]: application.fullName,
          [document.type]: document.statedName,
        },
        similarity: comparison.similarity,
        // An omitted middle name is a documentation gap (low); a genuinely
        // different name is an identity question (medium/high by similarity).
        severity:
          comparison.verdict === 'expanded_form' ? 'low' : severityFromSimilarity(comparison.similarity),
        detail: `${comparison.detail} Form: "${application.fullName}"; ${humanLabel(
          document.type
        )}: "${document.statedName}".`,
      });
    }

    return mergeByField(mismatches);
  }

  private compareDateOfBirth(application: SeededApplication): FieldMismatch[] {
    const mismatches: FieldMismatch[] = [];

    for (const document of application.documents) {
      if (document.statedDob === undefined) continue;
      if (document.statedDob === application.dateOfBirth) continue;

      // Dates are compared exactly. There is no such thing as an "almost right"
      // date of birth on a passport application, so this is always high severity
      // regardless of how few characters differ.
      mismatches.push({
        field: 'dateOfBirth',
        sources: {
          [FORM_SOURCE]: application.dateOfBirth,
          [document.type]: document.statedDob,
        },
        similarity: charSimilarity(application.dateOfBirth, document.statedDob),
        severity: 'high',
        detail:
          `Date of birth on the ${humanLabel(document.type)} (${document.statedDob}) does not ` +
          `match the application form (${application.dateOfBirth}).`,
      });
    }

    return mergeByField(mismatches);
  }

  private assemble(
    application: SeededApplication,
    scope: 'identity' | 'address',
    comparedFields: string[],
    mismatches: FieldMismatch[],
    participates: (document: SeedDocument) => boolean
  ): ConsistencyResult {
    const ordered = [...mismatches].sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity) || a.field.localeCompare(b.field)
    );

    return {
      applicationId: application.applicationId,
      scope,
      consistent: ordered.length === 0,
      mismatches: ordered,
      comparedFields,
      comparedDocuments: application.documents.filter(participates).map((document) => document.type),
      worstSeverity: ordered.length === 0 ? null : ordered[0]!.severity,
    };
  }
}

/**
 * Collapse per-document mismatches on the same field into one card.
 *
 * Without this, an application whose Aadhaar and birth certificate both differ
 * from the form produces two `fullName` cards, and the Evidence Explorer shows
 * the same conflict twice. Merging keeps ONE card per field with every source in
 * the `sources` map, which is the shape Frontend B renders side by side.
 */
function mergeByField(mismatches: FieldMismatch[]): FieldMismatch[] {
  const byField = new Map<string, FieldMismatch>();

  for (const mismatch of mismatches) {
    const existing = byField.get(mismatch.field);
    if (!existing) {
      byField.set(mismatch.field, { ...mismatch, sources: { ...mismatch.sources } });
      continue;
    }

    Object.assign(existing.sources, mismatch.sources);
    // Keep the WORST case: the officer needs the strongest disagreement, and the
    // lowest similarity is the one that drives severity.
    if (mismatch.similarity < existing.similarity) {
      existing.similarity = mismatch.similarity;
      existing.detail = mismatch.detail;
    }
    if (severityRank(mismatch.severity) > severityRank(existing.severity)) {
      existing.severity = mismatch.severity;
    }
  }

  return [...byField.values()];
}

function severityRank(severity: Severity): number {
  return severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
}

/** 'birth_certificate' -> 'birth certificate'; used inside sentences. */
function humanLabel(value: string): string {
  return value.replace(/_/g, ' ');
}
