import { Module } from '@nitrostack/core';
import { DocumentTools } from './document.tools.js';
import { DocumentService } from './document.service.js';
import { CaseModule } from '../case/case.module.js';

/**
 * Document Module
 *
 * Fourth vertical slice. Responsibilities per this iteration's scope:
 * - `document_upload`: verifies a case exists via VisaCaseService (imported
 *   from CaseModule via NitroStack DI, not HTTP, not tool-to-tool), then
 *   stores the document in memory with its raw base64 content and an
 *   `UPLOADED` status.
 * - `document_ocr`: deterministic local field extraction. Passports yield
 *   fullName, nationality, passportNumber, and expiryDate; visa letters
 *   yield university, country, and intake; any other type yields plain
 *   extracted text. Implemented entirely behind DocumentService.
 * - `document_validate`: compares extracted fields against the case
 *   (nationality match, destination present, recognized document type,
 *   passport expiry) and returns status, confidence, passed/failed checks,
 *   and the extracted fields.
 *
 * Storage is in-memory only — no persistence, no events, no widgets.
 *
 * Explicitly out of scope for this slice: MongoDB, RabbitMQ, Redis,
 * Firecrawl, Qdrant, RAG, n8n, Notifications, Dashboard, object storage,
 * and any OCR vendor or LLM provider.
 *
 * TODO(document): the real analog in the target architecture is the
 * Documents Module (docs/MODULES.md §3.4) — encrypted object storage,
 * virus scanning, MIME verification, Unstructured API extraction with
 * per-field confidence, human review of low-confidence fields, and
 * supersession history. See document.service.ts for the per-capability
 * TODOs.
 * TODO(document): a `VALID` result is a local check outcome, never
 * document acceptance. Acceptance is an Operations decision owned by the
 * Approval Module (docs/MODULES.md §3.8) and must not be simulated here.
 */
@Module({
    name: 'document',
    description: 'Document Module (fourth vertical slice): in-memory document upload, deterministic OCR stub, and deterministic validation against a visa case. No object storage, OCR vendor, or LLM calls.',
    imports: [CaseModule],
    controllers: [DocumentTools],
    providers: [DocumentService]
})
export class DocumentModule { }
