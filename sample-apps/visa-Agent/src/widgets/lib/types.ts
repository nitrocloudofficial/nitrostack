/**
 * Response shapes returned by the MigrateEase backend tools.
 *
 * These mirror the frozen backend contracts exactly — see
 * src/modules/{case,onboarding,requirement,document}/*.tools.ts. Nothing
 * here is invented: every field is one the corresponding tool returns.
 */

export type CaseStatus = 'DRAFT';

/** `case_start` */
export interface CaseStartOutput {
  caseId: string;
  status: CaseStatus;
  createdAt: string;
  nextStep: string;
}

/** `case_get` */
export interface CaseGetOutput {
  caseId: string;
  destinationCountry: string;
  nationality: string;
  visaType: string;
  status: CaseStatus;
  createdAt: string;
  nextStep: string;
}

export interface ExtractedCaseFields {
  nationality: string | null;
  destinationCountry: string | null;
  visaType: string | null;
}

/**
 * `onboarding_extract` — a discriminated union on `outcome`. The backend
 * returns `missingFields` + `message` only when information is missing, and
 * `caseId` + `status` + `nextStep` only when a case was started.
 */
export type OnboardingExtractOutput =
  | {
      outcome: 'case_started';
      extracted: ExtractedCaseFields;
      caseId: string;
      status: CaseStatus;
      createdAt: string;
      nextStep: string;
    }
  | {
      outcome: 'missing_information';
      extracted: ExtractedCaseFields;
      missingFields: string[];
      message: string;
    };

/** `resolve_requirements` */
export interface ResolveRequirementsOutput {
  caseId: string;
  checklist: string[];
  timeline: string;
  notes: string[];
}

/** `document_upload` */
export interface DocumentUploadOutput {
  documentId: string;
  status: 'UPLOADED';
  uploadedAt: string;
}

export interface PassportFields {
  fullName: string | null;
  nationality: string | null;
  passportNumber: string | null;
  expiryDate: string | null;
}

export interface VisaLetterFields {
  university: string | null;
  country: string | null;
  intake: string | null;
}

/**
 * `document_ocr` — the backend spreads either `extractedFields` (passport /
 * visa_letter) or `extractedText` (unknown type) onto the response.
 */
export interface DocumentOcrOutput {
  documentId: string;
  documentType: string;
  kind: 'passport' | 'visa_letter' | 'unknown';
  extractedAt: string;
  extractedFields?: PassportFields | VisaLetterFields;
  extractedText?: string;
}

/** `document_validate` */
export interface DocumentValidateOutput {
  status: 'VALID' | 'INVALID';
  confidence: number;
  passedChecks: string[];
  failedChecks: string[];
  extractedFields: Record<string, unknown>;
}
