/**
 * ============================================================================
 * SHARED CONTRACT — seed applicant / seeded application
 * Owner: Backend B. Consumed by: everyone (Hour 1 deliverable).
 * ============================================================================
 *
 * `SeedApplicantSchema` is a VERBATIM copy of contracts.md §1. It is the frozen
 * integration boundary between ocr_extract (Backend A) and Backend B's
 * duplicate-detection flow. Do not edit it without a written team agreement.
 *
 * `SeededApplicationSchema` extends it with the fields Backend B needs that
 * contracts.md §1 does not carry:
 *
 *   - `address`      — detect_duplicate_signals must find reused ADDRESSES, and
 *                      contracts.md §1 has no address field at all.
 *   - `documents[]`  — each with an `imageHash`, because reused document IMAGES
 *                      are the third planted signal in the fraud ring and the
 *                      one that makes the GraphView reveal land.
 *   - `applicationType` / `submittedAt` / `status` — needed by document_validate,
 *                      evaluate_rules, and the dashboard's left-hand panel.
 *
 * This is an ADDITIVE extension: every SeededApplication is still a valid
 * SeedApplicant, so nothing that parses against the frozen §1 schema breaks.
 */
import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// contracts.md §1 — VERBATIM. DO NOT EDIT.
// ---------------------------------------------------------------------------
export const SeedApplicantSchema = z.object({
  applicationId: z.string().min(1),
  applicantId: z.string().min(1).optional(),

  fullName: z.string().min(1),
  dateOfBirth: z.string().regex(ISO_DATE),
  nationality: z.string().min(1).optional(),

  passport: z.object({
    number: z.string().min(1),
    issuingCountry: z.string().min(1),
    issueDate: z.string().regex(ISO_DATE).optional(),
    expiryDate: z.string().regex(ISO_DATE).optional(),
  }),

  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().min(1).optional(),
    })
    .optional(),

  extractedFrom: z.object({
    documentId: z.string().min(1),
    source: z.enum(['passport', 'visa', 'application_form', 'other']),
    extractedAt: z.string().datetime(),
  }),
});

export type SeedApplicant = z.infer<typeof SeedApplicantSchema>;

// ---------------------------------------------------------------------------
// Backend B additive extension
// ---------------------------------------------------------------------------

/** Document types the pipeline understands. Matches Backend A's ocr_extract enum. */
export const DocumentTypeSchema = z.enum([
  'aadhaar',
  'birth_certificate',
  'old_passport',
  'address_proof',
  'photograph',
  'fir_copy',
  'parent_consent',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

/**
 * A structured postal address.
 *
 * `normalized` is what duplicate detection actually compares — it is derived,
 * never hand-written, so two applicants who typed the same address slightly
 * differently ("Flat 4B" vs "flat 4-b") still collide. See
 * `normalizeAddress()` in src/modules/pipeline/services/signal-normalizer.ts.
 */
export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, 'Indian PIN codes are exactly 6 digits'),
});
export type Address = z.infer<typeof AddressSchema>;

/**
 * An uploaded document.
 *
 * `imageHash` stands in for a perceptual hash of the scan. In the seed data it
 * is a fixed `sha256:...`-style string: two applications sharing an imageHash
 * means the SAME image file was submitted twice, which is the strongest
 * document-level fraud signal in the demo. Deterministic on purpose — a real
 * pHash would make the demo reveal probabilistic.
 */
export const SeedDocumentSchema = z.object({
  documentId: z.string().min(1),
  type: DocumentTypeSchema,
  imageHash: z.string().min(1),
  issuedOn: z.string().regex(ISO_DATE).optional(),
  expiresOn: z.string().regex(ISO_DATE).optional(),
  /** Fields as they appear ON THIS DOCUMENT — lets Backend A diff across documents. */
  statedName: z.string().optional(),
  statedDob: z.string().regex(ISO_DATE).optional(),
  statedAddress: AddressSchema.partial().optional(),
});
export type SeedDocument = z.infer<typeof SeedDocumentSchema>;

export const ApplicationTypeSchema = z.enum(['fresh', 'renewal', 'lost_replacement', 'minor']);
export type ApplicationType = z.infer<typeof ApplicationTypeSchema>;

export const ApplicationStatusSchema = z.enum([
  'pending_review',
  'approved',
  'clarification_requested',
  'rejected',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const SeededApplicationSchema = SeedApplicantSchema.extend({
  applicantId: z.string().min(1),
  applicationType: ApplicationTypeSchema,
  submittedAt: z.string().datetime(),
  status: ApplicationStatusSchema.default('pending_review'),

  address: AddressSchema,
  documents: z.array(SeedDocumentSchema).min(1),

  /**
   * Demo-authoring metadata. NOT consumed by any scoring logic — it exists so
   * `npm run test:seed` can assert that the overlaps we *intended* to plant are
   * the overlaps the detector actually finds. Keeping intent and detection
   * separate is what stops a "the test passes because it reads the same
   * constant" false positive.
   */
  seedProfile: z.object({
    label: z.string().min(1),
    ring: z.string().nullable(),
    notes: z.string().optional(),
  }),
});

export type SeededApplication = z.infer<typeof SeededApplicationSchema>;

export const SeedDatasetSchema = z.object({
  version: z.string().min(1),
  generatedFor: z.string().min(1),
  applications: z.array(SeededApplicationSchema).min(2),
});
export type SeedDataset = z.infer<typeof SeedDatasetSchema>;

/** Narrow a SeededApplication down to the frozen contracts.md §1 shape. */
export function toSeedApplicant(application: SeededApplication): SeedApplicant {
  return SeedApplicantSchema.parse(application);
}
