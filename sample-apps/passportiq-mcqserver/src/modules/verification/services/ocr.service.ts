/**
 * OcrService — field extraction for `ocr_extract`.
 *
 * Framed honestly, as the build doc insists: this is AI-based field extraction,
 * not classical OCR, and in this build it has TWO modes which are always declared
 * in the output.
 *
 *   'vision-llm'     A model is configured, so the transcription carried on the
 *                    seeded document is handed to it for normalisation and
 *                    field-level confidence. The scans in this dataset are
 *                    synthetic — there are no pixels to read — so what the model
 *                    genuinely contributes is structuring and uncertainty
 *                    flagging, and the code says so rather than implying it read
 *                    an image it never saw.
 *
 *   'deterministic'  No credentials. Fields come straight from the document's
 *                    stated values with fixed per-field confidence.
 *
 * Downstream stages consume the SAME shape either way, which is the reason the
 * consistency checks, rules and score are reproducible in CI.
 *
 * Why extraction is cached per (application, document): `run_verification_pipeline`
 * calls this once per document type, and the agent loop may revisit a document
 * while investigating. Re-deriving is cheap but re-calling a model is not, and a
 * second call could return marginally different confidence and make the identity
 * check flicker between runs.
 */
import { Injectable } from '@nitrostack/core';
import type { OcrExtractResult, SeedDocument } from '../../../contracts/index.js';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { LlmService } from './llm.service.js';

/** Fields the model is asked to confirm. Order is the officer-facing order. */
const EXTRACTED_FIELDS = ['name', 'dob', 'address', 'documentNumber', 'parentNames'] as const;

/**
 * Confidence assigned per document type when running deterministically.
 *
 * These are not decoration: `score_risk` treats a low-confidence read as a reason
 * to prefer clarification over rejection, and `explain_risk` cites them. A
 * handwritten FIR copy genuinely transcribes worse than a machine-readable
 * passport, and the ordering encodes that.
 */
const BASE_CONFIDENCE: Readonly<Record<string, number>> = {
  old_passport: 0.98,
  aadhaar: 0.96,
  parent_consent: 0.93,
  birth_certificate: 0.92,
  address_proof: 0.9,
  photograph: 0.88,
  fir_copy: 0.81,
};

interface LlmExtraction {
  name?: string;
  dob?: string;
  address?: string;
  documentNumber?: string;
  parentNames?: string[];
  uncertainFields?: string[];
  fieldConfidence?: Record<string, number>;
}

@Injectable({ deps: [ApplicationService, LlmService] })
export class OcrService {
  /** `${applicationId}::${documentType}` -> the result already produced. */
  private readonly cache = new Map<string, OcrExtractResult>();

  constructor(
    private readonly applications: ApplicationService,
    private readonly llm: LlmService
  ) {}

  /**
   * Extract structured fields from one document.
   *
   * Throws when the document type is not on the application — a caller asking for
   * a document that was never submitted is a bug in the caller, and silently
   * returning empty fields would be read downstream as "the document says
   * nothing", which is a very different claim.
   */
  async extract(applicationId: string, documentType: string): Promise<OcrExtractResult> {
    const cacheKey = `${applicationId}::${documentType}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const application = this.applications.getApplication(applicationId);
    const document = application.documents.find((candidate) => candidate.type === documentType);

    if (!document) {
      throw new Error(
        `Application ${applicationId} has no '${documentType}' document. Present: ` +
          `${application.documents.map((candidate) => candidate.type).join(', ')}.`
      );
    }

    const baseline = this.deterministicExtraction(application, document);
    const enriched = this.llm.isEnabled()
      ? await this.enrichWithModel(baseline, document)
      : baseline;

    this.cache.set(cacheKey, enriched);
    return enriched;
  }

  /** Every extraction produced for an application, in document order. */
  getExtractions(applicationId: string): OcrExtractResult[] {
    const application = this.applications.getApplication(applicationId);
    return application.documents
      .map((document) => this.cache.get(`${applicationId}::${document.type}`))
      .filter((result): result is OcrExtractResult => result !== undefined);
  }

  /** Drop cached reads for one application — used when the pipeline is re-run. */
  reset(applicationId: string): void {
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(`${applicationId}::`)) this.cache.delete(key);
    }
  }

  // -------------------------------------------------------------------------
  // Deterministic path
  // -------------------------------------------------------------------------

  private deterministicExtraction(
    application: ReturnType<ApplicationService['getApplication']>,
    document: SeedDocument
  ): OcrExtractResult {
    const confidence = BASE_CONFIDENCE[document.type] ?? 0.85;

    // A document that states nothing for a field has NOT been read as blank —
    // the field is simply absent from that document. Omitting the key is the
    // honest encoding; a "" would be a read of an empty value.
    const name = document.statedName ?? (document.type === 'photograph' ? application.fullName : '');
    const address =
      document.statedAddress === undefined
        ? undefined
        : formatAddress({ ...application.address, ...document.statedAddress });

    const uncertainFields: string[] = [];
    const fieldConfidence: Record<string, number> = {};

    for (const field of EXTRACTED_FIELDS) {
      const present =
        (field === 'name' && name.length > 0) ||
        (field === 'dob' && document.statedDob !== undefined) ||
        (field === 'address' && address !== undefined) ||
        (field === 'documentNumber' && documentNumberFor(application, document) !== undefined) ||
        (field === 'parentNames' && document.type === 'birth_certificate');

      if (!present) continue;

      // A photograph carries no legible name; treating the form's name as a
      // high-confidence read off a photo would be a lie the score then trusts.
      const fieldScore =
        field === 'name' && document.type === 'photograph'
          ? 0.4
          : round2(confidence - (field === 'address' ? 0.04 : 0));

      fieldConfidence[field] = fieldScore;
      if (fieldScore < 0.75) uncertainFields.push(field);
    }

    const parentNames = document.type === 'birth_certificate' ? parentNamesFor(application) : undefined;
    const documentNumber = documentNumberFor(application, document);

    return {
      applicationId: application.applicationId,
      documentType: document.type,
      documentId: document.documentId,

      name,
      ...(document.statedDob !== undefined ? { dob: document.statedDob } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(documentNumber !== undefined ? { documentNumber } : {}),
      ...(parentNames !== undefined ? { parentNames } : {}),
      confidence: round2(confidence),
      ...(uncertainFields.length > 0 ? { uncertainFields } : {}),

      fieldConfidence,
      extractionMode: 'deterministic',
      model: null,
      imageHash: document.imageHash,
    };
  }

  // -------------------------------------------------------------------------
  // Model-assisted path
  // -------------------------------------------------------------------------

  /**
   * Ask the model to normalise the transcription and grade its own certainty.
   *
   * Every field it returns is treated as a SUGGESTION and merged conservatively:
   * a value is only accepted when it is a non-empty string, and dates must still
   * match ISO-8601, because a model that helpfully rewrites `1994-03-17` as
   * `17 March 1994` would break every downstream date comparison silently.
   *
   * On any failure the deterministic baseline is returned unchanged.
   */
  private async enrichWithModel(
    baseline: OcrExtractResult,
    document: SeedDocument
  ): Promise<OcrExtractResult> {
    const extraction = await this.llm.completeJson<LlmExtraction>({
      system:
        'You are a passport-office document transcription assistant. You normalise ' +
        'already-transcribed fields from an Indian identity document and report how ' +
        'certain each field is. Never invent a value that is not present in the input. ' +
        'Reply with JSON only.',
      prompt: buildExtractionPrompt(baseline, document),
      maxOutputTokens: 600,
      temperature: 0,
    });

    if (!extraction) return baseline;

    const fieldConfidence: Record<string, number> = { ...baseline.fieldConfidence };
    for (const [field, value] of Object.entries(extraction.fieldConfidence ?? {})) {
      if (typeof value === 'number' && value >= 0 && value <= 1 && field in fieldConfidence) {
        fieldConfidence[field] = round2(value);
      }
    }

    const uncertainFields = [
      ...new Set([
        ...(baseline.uncertainFields ?? []),
        ...(extraction.uncertainFields ?? []).filter((field) => field in fieldConfidence),
      ]),
    ];

    const scores = Object.values(fieldConfidence);
    const overall = scores.length > 0 ? round2(scores.reduce((a, b) => a + b, 0) / scores.length) : baseline.confidence;

    return {
      ...baseline,
      name: acceptString(extraction.name) ?? baseline.name,
      ...(isIsoDate(extraction.dob) ? { dob: extraction.dob } : {}),
      ...(acceptString(extraction.address) !== undefined
        ? { address: acceptString(extraction.address)! }
        : {}),
      ...(acceptString(extraction.documentNumber) !== undefined
        ? { documentNumber: acceptString(extraction.documentNumber)! }
        : {}),
      confidence: overall,
      ...(uncertainFields.length > 0 ? { uncertainFields } : {}),
      fieldConfidence,
      extractionMode: 'vision-llm',
      model: this.llm.getModel(),
    };
  }
}

function buildExtractionPrompt(baseline: OcrExtractResult, document: SeedDocument): string {
  return [
    `Document type: ${document.type}`,
    `Document id: ${document.documentId}`,
    'Transcribed fields (from the scanned document):',
    JSON.stringify(
      {
        name: baseline.name,
        dob: baseline.dob ?? null,
        address: baseline.address ?? null,
        documentNumber: baseline.documentNumber ?? null,
        parentNames: baseline.parentNames ?? null,
      },
      null,
      2
    ),
    '',
    'Tasks:',
    '1. Return each field exactly as transcribed unless it is malformed. Dates MUST stay YYYY-MM-DD.',
    '2. Add "fieldConfidence": an object mapping each field above to a number 0..1.',
    '3. Add "uncertainFields": an array naming any field a human should re-check.',
    '',
    'Respond with a single JSON object containing only those keys. No prose.',
  ].join('\n');
}

function documentNumberFor(
  application: ReturnType<ApplicationService['getApplication']>,
  document: SeedDocument
): string | undefined {
  // Only the passport number is modelled in the seed data. Fabricating an Aadhaar
  // number for the demo would be both wrong and, in India, a real disclosure risk.
  if (document.type === 'old_passport') return application.passport.number;
  return undefined;
}

function parentNamesFor(
  application: ReturnType<ApplicationService['getApplication']>
): string[] | undefined {
  // The seed data carries no parent names, so none are claimed. Returning
  // placeholder parents would make `check_identity_consistency` compare fiction.
  void application;
  return undefined;
}

/** 'line1, line2, city, state - pincode' — the officer-readable single line. */
export function formatAddress(address: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  return [address.line1, address.line2, address.city, address.state]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ')
    .concat(address.pincode ? ` - ${address.pincode}` : '');
}

function acceptString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
