import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import type { VisaCaseRecord } from '../case/case.service.js';

/**
 * Document lifecycle status.
 *
 * TODO(document): the real Documents Module (docs/MODULES.md §3.4) owns a
 * richer lifecycle — Received -> Classified -> Extracted -> Under Review ->
 * Accepted / Rejected / Superseded — where acceptance is an Operations
 * decision recorded by the Approval Module, never an automatic outcome of
 * extraction. `VALIDATED` here means only "passed deterministic local
 * checks", not "accepted as evidence".
 */
export type DocumentStatus = 'UPLOADED' | 'OCR_COMPLETE' | 'VALIDATED' | 'INVALID';

/**
 * Canonical document type classification.
 *
 * TODO(document): replace this two-value classification with the canonical
 * document taxonomy owned by the Documents Module, cross-referenced against
 * the Policy Knowledge Module's per-jurisdiction evidence requirements
 * (docs/MODULES.md §3.5). RequirementService currently expresses required
 * documents as free-text checklist strings ("Valid passport"), not as
 * canonical type tokens, so the two cannot be reconciled programmatically
 * yet — that reconciliation is the reason this enum is local for now.
 */
export type DocumentKind = 'passport' | 'visa_letter' | 'unknown';

/**
 * In-memory document record.
 *
 * TODO(document): the real record per docs/MODULES.md §3.4 also owns tenant
 * ownership, uploader identity, checksum, MIME type, virus-scan state,
 * storage URI, retention class, and supersession history.
 */
/**
 * [LLD] Document model — target shape
 * `{ _id, caseId, clientId, type, fileRef, extracted:{...}, confidence:{...},
 * status, expiry?, inVault }`. `inVault=true` means the validated document
 * may be reused by the same client in another application.
 *
 * The fields below implement only the demo-safe local storage and extraction
 * slice; neither the vault nor a human acceptance state exists yet.
 */
export interface DocumentRecord {
    documentId: string;
    caseId: string;
    documentType: string;
    filename: string;
    uploadTime: string;
    status: DocumentStatus;
    /**
     * TODO(document): raw content must never live in process memory in a
     * real deployment. It belongs in encrypted object storage with a
     * retention policy, referenced here only by storage URI and checksum
     * (docs/ARCHITECTURE.md §16). Keeping bytes in a Map is acceptable only
     * for this in-memory vertical slice.
     */
    rawContentBase64: string;
    ocr?: OcrResult;
}

export interface UploadDocumentInput {
    caseId: string;
    documentType: string;
    fileName: string;
    contentBase64: string;
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
 * Discriminated union so callers can tell a structured extraction from the
 * plain-text fallback without inspecting the document type again.
 */
export type OcrResult =
    | { kind: 'passport'; extractedFields: PassportFields; extractedAt: string }
    | { kind: 'visa_letter'; extractedFields: VisaLetterFields; extractedAt: string }
    | { kind: 'unknown'; extractedText: string; extractedAt: string };

export interface ValidationResult {
    status: 'VALID' | 'INVALID';
    confidence: number;
    passedChecks: string[];
    failedChecks: string[];
    extractedFields: Record<string, unknown>;
}

/**
 * TODO(document): duplicated intentionally from requirement.service.ts.
 * Both copies should collapse into the Policy Knowledge Module's
 * authoritative jurisdiction reference (docs/RESOURCES.md
 * `policy://jurisdiction/{destination}`). Importing the Requirement
 * Module's private helper instead would couple two vertical slices through
 * an unexported implementation detail, so the duplication is deliberate
 * until that shared reference exists.
 */
const COUNTRY_ALIASES: Record<string, string> = {
    usa: 'united states',
    us: 'united states',
    'united states of america': 'united states',
    'united states': 'united states',
    uk: 'united kingdom',
    'great britain': 'united kingdom',
    'united kingdom': 'united kingdom',
    deutschland: 'germany',
    germany: 'germany',
    canada: 'canada',
    india: 'india',
    indian: 'india',
    german: 'germany',
    canadian: 'canada',
    american: 'united states',
    british: 'united kingdom'
};

function normalizeCountry(value: string): string {
    const cleaned = value.trim().toLowerCase().replace(/\.+/g, '');
    return COUNTRY_ALIASES[cleaned] || cleaned;
}

/**
 * Label aliases used by the OCR stub's line parser. Ordered by specificity:
 * the first alias that matches a line wins, so "passport number" is checked
 * before the looser "number".
 */
const PASSPORT_LABELS: Record<keyof PassportFields, string[]> = {
    fullName: ['full name', 'name', 'holder', 'surname and given names'],
    nationality: ['nationality', 'citizenship'],
    passportNumber: ['passport number', 'passport no', 'document number', 'passport'],
    expiryDate: ['date of expiry', 'expiry date', 'expiration date', 'valid until', 'expires']
};

const VISA_LETTER_LABELS: Record<keyof VisaLetterFields, string[]> = {
    university: ['university', 'institution', 'school', 'college'],
    country: ['country', 'destination', 'destination country'],
    intake: ['intake', 'semester', 'term', 'start date', 'commencement']
};

/**
 * Parses `Label: value` / `Label = value` lines out of decoded text.
 *
 * Deterministic and dependency-free: the same bytes always produce the same
 * fields. Values are never synthesized — a label that is absent yields
 * null, so downstream validation can report "not found" honestly rather
 * than validating against invented data.
 */
function parseLabelledFields<T extends string>(
    text: string,
    labels: Record<T, string[]>
): Record<T, string | null> {
    const lines = text.split(/\r?\n/);
    const result = {} as Record<T, string | null>;

    for (const field of Object.keys(labels) as T[]) {
        result[field] = null;
    }

    for (const rawLine of lines) {
        const match = rawLine.match(/^\s*([^:=]{1,60})\s*[:=]\s*(.+?)\s*$/);
        if (!match) continue;

        const label = match[1].trim().toLowerCase().replace(/\s+/g, ' ');
        const value = match[2].trim();
        if (!value) continue;

        for (const field of Object.keys(labels) as T[]) {
            if (result[field] !== null) continue;
            if (labels[field].some(alias => label === alias)) {
                result[field] = value;
                break;
            }
        }
    }

    return result;
}

/**
 * Classifies a caller-supplied document type string into a canonical kind.
 * Substring matching per the slice's specification: a type containing
 * "passport" is a passport, one containing "visa_letter" is a visa letter.
 */
function classifyDocumentType(documentType: string): DocumentKind {
    const normalized = documentType.trim().toLowerCase();
    if (normalized.includes('passport')) return 'passport';
    if (normalized.includes('visa_letter') || normalized.includes('visa letter')) return 'visa_letter';
    return 'unknown';
}

/**
 * Decodes base64 to UTF-8 text. Returns an empty string when the payload is
 * not valid base64 or not text, so the OCR stub degrades to "no fields
 * found" instead of throwing on binary input (a real PDF/JPEG upload).
 */
function decodeBase64ToText(contentBase64: string): string {
    try {
        return Buffer.from(contentBase64, 'base64').toString('utf8');
    } catch {
        return '';
    }
}

/**
 * DocumentService
 *
 * Fourth vertical slice of the Documents Module described in
 * docs/MODULES.md §3.4. Owns document upload, a deterministic OCR stub, and
 * deterministic validation against a visa case.
 *
 * Storage: in-memory Map, intentionally non-persistent. Data is lost on
 * process restart, exactly like VisaCaseService and RequirementService.
 *
 * No LLM, no OCR vendor, no MongoDB, no object storage, no queue, and no
 * network call anywhere in this class.
 *
 * TODO(document): replace the in-memory Map with the MongoDB-backed
 * Documents store plus encrypted object storage described in
 * docs/ARCHITECTURE.md §7.
 * TODO(document): every mutation must eventually carry tenant ID, actor
 * identity, and correlation ID per docs/ARCHITECTURE.md §16, enforce tenant
 * isolation, record an audit entry, and emit `document.uploaded` /
 * `document.extracted` events per docs/EVENTS.md.
 * TODO(document): uploads must be virus-scanned and MIME-verified before
 * any extraction runs. This slice does neither and must not be exposed to
 * untrusted input as-is.
 */
@Injectable()
export class DocumentService {
    private readonly documents = new Map<string, DocumentRecord>();

    /**
     * Store an uploaded document in memory against a case.
     *
     * The caller is responsible for having verified the case exists — the
     * tool layer does this via VisaCaseService before calling in, which
     * keeps this service free of any cross-module dependency.
     */
    async uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord> {
        const record: DocumentRecord = {
            documentId: randomUUID(),
            caseId: input.caseId,
            documentType: input.documentType,
            filename: input.fileName,
            uploadTime: new Date().toISOString(),
            status: 'UPLOADED',
            rawContentBase64: input.contentBase64
        };

        this.documents.set(record.documentId, record);
        return record;
    }

    /**
     * Retrieve a previously uploaded document.
     *
     * TODO(document): normalize this into a stable application error
     * (e.g. DocumentNotFoundError) once the error taxonomy from
     * docs/ARCHITECTURE.md §16 exists, instead of a plain Error.
     */
    async getDocument(documentId: string): Promise<DocumentRecord> {
        const record = this.documents.get(documentId);
        if (!record) {
            throw new Error(`Document not found: ${documentId}`);
        }
        return record;
    }

    /**
     * Deterministic OCR stub.
     *
     * Decodes the stored base64 payload and parses `Label: value` lines out
     * of it. Passport and visa-letter documents yield their structured
     * field sets; anything else yields the plain decoded text. The same
     * upload always produces the same result — there is no model, no
     * sampling, and no randomness.
     *
     * TODO(document): replace with the Unstructured API OCR integration.
     * The real pipeline is classify -> extract -> confidence-score ->
     * human review for low-confidence fields (docs/MODULES.md §3.4). The
     * OcrResult union is the contract callers depend on, so swapping the
     * implementation behind it should not change document_validate or the
     * tool surface.
     */
    async runOcr(documentId: string): Promise<OcrResult> {
        const record = await this.getDocument(documentId);
        const text = decodeBase64ToText(record.rawContentBase64);
        const extractedAt = new Date().toISOString();

        let result: OcrResult;
        switch (classifyDocumentType(record.documentType)) {
            case 'passport':
                result = {
                    kind: 'passport',
                    extractedFields: parseLabelledFields(text, PASSPORT_LABELS),
                    extractedAt
                };
                break;
            case 'visa_letter':
                result = {
                    kind: 'visa_letter',
                    extractedFields: parseLabelledFields(text, VISA_LETTER_LABELS),
                    extractedAt
                };
                break;
            default:
                result = { kind: 'unknown', extractedText: text, extractedAt };
                break;
        }

        record.ocr = result;
        if (record.status === 'UPLOADED') {
            record.status = 'OCR_COMPLETE';
        }

        return result;
    }

    /**
     * Returns the stored OCR result, running extraction first if it has not
     * been run yet. Service-level reuse so `document_validate` works
     * whether or not `document_ocr` was called first — the tools never call
     * each other.
     */
    async ensureOcr(documentId: string): Promise<OcrResult> {
        const record = await this.getDocument(documentId);
        return record.ocr ?? this.runOcr(documentId);
    }

    /**
     * Deterministic validation of a document's extracted fields against its
     * visa case.
     *
     * Checks performed:
     * - nationality matches the case (passport only)
     * - destination country is present on the case, and matches the letter's
     *   stated country (visa letter only)
     * - the document type is a recognized required type
     * - the expiry date is present, parseable, and in the future (passport only)
     *
     * Confidence is the fraction of applicable checks that passed — a plain
     * ratio, not a model score.
     *
     * TODO(document): a passing result here is NOT document acceptance.
     * Acceptance is an Operations decision owned by the Approval Module
     * (docs/MODULES.md §3.8); this service must never simulate that
     * outcome, and its result must not be shown to an applicant as
     * confirmation that their evidence is sufficient.
     */
    async validateAgainstCase(documentId: string, visaCase: VisaCaseRecord): Promise<ValidationResult> {
        const record = await this.getDocument(documentId);
        const ocr = await this.ensureOcr(documentId);

        const passedChecks: string[] = [];
        const failedChecks: string[] = [];
        const check = (name: string, ok: boolean) => {
            (ok ? passedChecks : failedChecks).push(name);
        };

        // Check: the document type is one this slice recognizes as required
        // evidence. Unknown types cannot be validated field-by-field.
        const kind = classifyDocumentType(record.documentType);
        check('required_document_type_recognized', kind !== 'unknown');

        // Check: the case carries a destination country to validate against.
        const destination = visaCase.destinationCountry?.trim() ?? '';
        check('case_destination_present', destination.length > 0);

        if (ocr.kind === 'passport') {
            const { nationality, expiryDate } = ocr.extractedFields;

            // Check: passport nationality matches the case's nationality.
            check(
                'nationality_matches_case',
                nationality !== null &&
                normalizeCountry(nationality) === normalizeCountry(visaCase.nationality)
            );

            // Check: passport carries an expiry date that parses and is in
            // the future. Reported as a single check so a missing date and
            // an expired date are equally disqualifying.
            const expiryTimestamp = expiryDate ? Date.parse(expiryDate) : Number.NaN;
            check(
                'passport_not_expired',
                Number.isFinite(expiryTimestamp) && expiryTimestamp > Date.now()
            );
        }

        if (ocr.kind === 'visa_letter') {
            const { country } = ocr.extractedFields;

            // Check: the letter's stated country matches the case destination.
            check(
                'letter_country_matches_destination',
                country !== null &&
                destination.length > 0 &&
                normalizeCountry(country) === normalizeCountry(destination)
            );
        }

        const totalChecks = passedChecks.length + failedChecks.length;
        const confidence = totalChecks === 0
            ? 0
            : Math.round((passedChecks.length / totalChecks) * 100) / 100;

        const status: ValidationResult['status'] = failedChecks.length === 0 ? 'VALID' : 'INVALID';
        record.status = status === 'VALID' ? 'VALIDATED' : 'INVALID';

        return {
            status,
            confidence,
            passedChecks,
            failedChecks,
            extractedFields: ocr.kind === 'unknown'
                ? { extractedText: ocr.extractedText }
                : { ...ocr.extractedFields }
        };
    }
}
