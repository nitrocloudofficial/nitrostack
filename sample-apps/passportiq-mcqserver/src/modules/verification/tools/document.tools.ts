/**
 * Stages 1-2 — `document_validate` and `ocr_extract`.
 *
 * Thin by design: every tool in this file parses its input, delegates to a
 * service, emits `pipeline.stage_completed`, and returns. No verification logic
 * lives in a tool class, so the same logic is reachable from the agent loop, the
 * orchestrator and a direct MCP call without three copies of it.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY TOOL PARSES ITS OWN INPUT
 * ---------------------------------------------------------------------------
 * @nitrostack/core@1.0.14 does NOT validate tool input against `inputSchema`.
 * The schema is converted to JSON Schema purely to advertise the tool in
 * tools/list (dist/core/tool.js:181); nothing calls `.parse()` on the way in. The
 * caller here is an LLM choosing arguments, so an unvalidated handler will
 * eventually be handed `{}` and fail deep inside a service with an unhelpful
 * message. `safeParse` at the boundary turns that into one clear sentence.
 */
import { Injectable, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  DocumentTypeSchema,
  DocumentValidateResultSchema,
  OcrExtractResultSchema,
  type DocumentValidateResult,
  type OcrExtractResult,
} from '../../../contracts/index.js';
import { PipelineEventsService } from '../../pipeline/services/pipeline-events.service.js';
import { DocumentService } from '../services/document.service.js';
import { OcrService } from '../services/ocr.service.js';

const DocumentValidateInputSchema = z.object({
  applicationId: z.string().min(1).describe('Passport application ID to check the document set for'),
});

const OcrExtractInputSchema = z.object({
  applicationId: z.string().min(1).describe('Passport application ID'),
  documentType: DocumentTypeSchema.describe(
    'Which submitted document to read. Must be a document actually attached to this application.'
  ),
});

/**
 * @Injectable({ deps: [...] }) — the deps array is MANDATORY, not documentation.
 *
 * DIContainer.getDependencies() prefers explicit `nitrostack:deps` metadata and
 * only falls back to TypeScript's `design:paramtypes`, which is empty under ESM
 * unless reflect-metadata was loaded before the decorator ran. Without the
 * explicit list, this class is constructed with NO arguments and every injected
 * field is `undefined`. Order must match the constructor.
 */
@Injectable({ deps: [DocumentService, OcrService, PipelineEventsService] })
export class DocumentVerificationTools {
  constructor(
    private readonly documents: DocumentService,
    private readonly ocr: OcrService,
    private readonly events: PipelineEventsService
  ) {}

  @Tool({
    name: 'document_validate',
    title: 'Validate submitted documents',
    description:
      'Check the document set against the statutory checklist for this application type: which ' +
      'required documents are absent, which submitted documents have expired, and which expire ' +
      'inside the processing window. Returns a full per-document checklist, so the officer sees ' +
      'what was checked and not only what failed. Deterministic — no model involved.',
    inputSchema: DocumentValidateInputSchema,
    outputSchema: DocumentValidateResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Checking the document checklist...',
      invoked: 'Document checklist complete',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-1001' },
      response: {
        applicationId: 'PIQ-2026-1001',
        applicationType: 'renewal',
        missingDocuments: [],
        expiredDocuments: [],
        complete: true,
        requiredDocuments: ['aadhaar', 'old_passport', 'address_proof', 'photograph'],
      },
    },
  })
  async documentValidate(
    rawInput: unknown,
    ctx: ExecutionContext
  ): Promise<DocumentValidateResult> {
    const input = parse(DocumentValidateInputSchema, rawInput, 'document_validate');
    const result = this.documents.validate(input.applicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'document_validate', result);
    return result;
  }

  @Tool({
    name: 'ocr_extract',
    title: 'Extract fields from a document',
    description:
      'AI-assisted field extraction from ONE submitted document: name, date of birth, address, ' +
      'document number and parent names where present, each with its own confidence. Reports ' +
      "`extractionMode` so the caller can see whether a model read the scan ('vision-llm') or " +
      "the fields came from the deterministic path ('deterministic'). Call once per document " +
      'type; the consistency stages then diff the results against each other.',
    inputSchema: OcrExtractInputSchema,
    outputSchema: OcrExtractResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      // A model call reaches outside the process when credentials are configured.
      openWorldHint: true,
    },
    invocation: {
      invoking: 'Reading the document...',
      invoked: 'Document fields extracted',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-1001', documentType: 'aadhaar' },
      response: {
        applicationId: 'PIQ-2026-1001',
        documentType: 'aadhaar',
        name: 'Rohan Sharma',
        dob: '1994-03-17',
        confidence: 0.96,
        extractionMode: 'deterministic',
      },
    },
  })
  async ocrExtract(rawInput: unknown, ctx: ExecutionContext): Promise<OcrExtractResult> {
    const input = parse(OcrExtractInputSchema, rawInput, 'ocr_extract');
    const result = await this.ocr.extract(input.applicationId, input.documentType);

    this.events.stageCompleted(ctx, input.applicationId, 'ocr_extract', result);
    return result;
  }
}

/**
 * Parse tool input or throw a message an LLM caller can act on.
 *
 * Shared by every Backend A tool. Kept here rather than in a util file so the
 * reason it exists stays next to the tools that need it.
 */
export function parse<T extends z.ZodTypeAny>(
  schema: T,
  rawInput: unknown,
  toolName: string
): z.infer<T> {
  const parsed = schema.safeParse(rawInput);

  if (!parsed.success) {
    throw new Error(
      `${toolName} received invalid input: ` +
        parsed.error.issues
          .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
          .join('; ')
    );
  }

  return parsed.data;
}
