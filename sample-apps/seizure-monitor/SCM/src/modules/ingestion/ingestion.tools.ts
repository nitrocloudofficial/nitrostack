import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ResourceDecorator,
  ExecutionContext,
  UseGuards,
  UseFilters,
  RateLimit,
  z,
} from '@nitrostack/core';
import { ClaudeClient } from '../../shared/claude.client.js';
import {
  ExtractedInvoiceSchema,
  InvoiceLineItemSchema,
  type ExtractedInvoice,
  type InvoiceLineItem,
} from '../../shared/schemas.js';

import { IngestionExceptionFilter } from './ingestion.exception.filter.js';

// ─── System Prompts ───────────────────────────────────────────────────────────

const CLASSIFY_SYSTEM = `You are a document classification engine for a supply-chain management platform.
Analyse the document content and return ONLY valid JSON — no prose, no markdown fences — matching this schema exactly:
{"docType":"invoice"|"po"|"packing_list"|"unknown","confidence":0.0}
confidence must be a float between 0.0 and 1.0.`;

const EXTRACT_SYSTEM = (schema: string) =>
  `You are a structured-data extraction engine for invoice documents.
Return ONLY valid JSON — no prose, no markdown fences — matching this schema exactly:
${schema}`;

// ─── Base64 decoder (supports data-URL and raw Base64) ───────────────────────

function decodeBase64(content: string): string {
  const dataUrlMatch = content.match(/^data:[A-Za-z-+/]+;base64,(.+)$/s);
  const raw = dataUrlMatch ? dataUrlMatch[1] : content;
  return Buffer.from(raw, 'base64').toString('utf-8');
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * IngestionTools — MCP controller for the Ingestion module.
 *
 * Exposed tools (all protected by API-key guard):
 *   • ingestion_classify_document          — classify doc type via Claude Haiku
 *   • ingestion_extract_invoice_line_items — extract line items array
 *   • ingestion_extract_document_data      — extract full invoice object
 *   • ingestion_ingest_document            — full pipeline: upload → classify → extract
 *
 * Exposed resources:
 *   • ingestion://status                   — health / capability summary
 */
@Controller('ingestion')
export class IngestionTools {
  constructor(private readonly claude: ClaudeClient) {}

  // ── classify_document ──────────────────────────────────────────────────────

  @Tool({
    name: 'classify_document',
    description:
      'Classify an uploaded document as invoice, po, packing_list, or unknown. ' +
      'Uses the first 2 000 characters for speed. Returns docType and a confidence score.',
    inputSchema: z.object({
      filename: z.string().describe('Original file name (e.g. invoice_001.pdf)'),
      content: z.string().describe('Plain-text document content'),
    }),
    outputSchema: z.object({
      docType: z.enum(['invoice', 'po', 'packing_list', 'unknown']),
      confidence: z.number().min(0).max(1),
    }),
  })

  @UseFilters(IngestionExceptionFilter)
  @RateLimit({ requests: 60, window: '1m' })
  async classifyDocument(
    input: { filename: string; content: string },
    ctx: ExecutionContext,
  ): Promise<{ docType: 'invoice' | 'po' | 'packing_list' | 'unknown'; confidence: number }> {
    ctx.logger?.info(`[classify_document] Classifying "${input.filename}"`);

    const snippet = input.content.slice(0, 2000);
    const raw = await this.claude.complete(
      CLASSIFY_SYSTEM,
      `Classify this document (filename: ${input.filename}):\n\n${snippet}`,
      'claude-haiku-20240307',
      0.1,
    );

    const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as { docType: string; confidence: number };

    ctx.logger?.info(
      `[classify_document] Result: ${parsed.docType} (confidence: ${parsed.confidence})`,
    );

    return {
      docType: parsed.docType as 'invoice' | 'po' | 'packing_list' | 'unknown',
      confidence: Number(parsed.confidence),
    };
  }

  // ── extract_invoice_line_items ─────────────────────────────────────────────

  @Tool({
    name: 'extract_invoice_line_items',
    description:
      'Extract individual line items from invoice plain-text. ' +
      'Returns an array of objects with sku, description, quantity, unitPrice, and total. ' +
      'Typically called internally by extract_document_data.',
    inputSchema: z.object({
      content: z.string().describe('Plain-text invoice content'),
    }),
    outputSchema: z.array(InvoiceLineItemSchema),
  })

  @UseFilters(IngestionExceptionFilter)
  @RateLimit({ requests: 60, window: '1m' })
  async extractInvoiceLineItems(
    input: { content: string },
    ctx: ExecutionContext,
  ): Promise<InvoiceLineItem[]> {
    ctx.logger?.info('[extract_invoice_line_items] Extracting line items');

    const schema = JSON.stringify([
      {
        sku: 'string',
        description: 'string',
        quantity: 'number',
        unitPrice: 'number',
        total: 'number',
      },
    ]);

    return this.claude.completeAndParse(
      z.array(InvoiceLineItemSchema),
      EXTRACT_SYSTEM(schema),
      `Extract ALL line items from the following invoice text:\n\n${input.content}`,
      'claude-haiku-20240307',
    );
  }

  // ── extract_document_data ──────────────────────────────────────────────────

  @Tool({
    name: 'extract_document_data',
    description:
      'Extract full structured invoice data from plain-text document content. ' +
      'Returns invoiceNumber, poNumber, vendor, invoiceDate, totalAmount, and lineItems.',
    inputSchema: z.object({
      content: z.string().describe('Full plain-text document content'),
      mimeType: z
        .string()
        .default('text/plain')
        .describe('MIME type of the source file (e.g. text/plain, application/pdf)'),
    }),
    outputSchema: ExtractedInvoiceSchema,
  })

  @UseFilters(IngestionExceptionFilter)
  @RateLimit({ requests: 30, window: '1m' })
  async extractDocumentData(
    input: { content: string; mimeType: string },
    ctx: ExecutionContext,
  ): Promise<ExtractedInvoice> {
    ctx.logger?.info(`[extract_document_data] Extracting data (mime: ${input.mimeType})`);

    const schema = JSON.stringify({
      invoiceNumber: 'string',
      poNumber: 'string',
      vendor: 'string',
      invoiceDate: 'ISO 8601 date string',
      totalAmount: 'number',
      lineItems: [
        {
          sku: 'string',
          description: 'string',
          quantity: 'number',
          unitPrice: 'number',
          total: 'number',
        },
      ],
    });

    const result = await this.claude.completeAndParse(
      ExtractedInvoiceSchema,
      EXTRACT_SYSTEM(schema),
      `Extract all invoice fields from the following document:\n\n${input.content}`,
      'claude-haiku-20240307',
    );

    ctx.logger?.info(
      `[extract_document_data] Extracted invoice #${result.invoiceNumber} with ${result.lineItems.length} line item(s)`,
    );

    return result;
  }

  // ── ingest_document ────────────────────────────────────────────────────────

  @Tool({
    name: 'ingest_document',
    description:
      'Full ingestion pipeline: upload a Base64-encoded document (PDF, TXT, or similar), ' +
      'classify it, and — if it is an invoice — extract all structured data in one call. ' +
      'Pass file_content as a raw Base64 string or a data-URL (data:<mime>;base64,<data>). ' +
      'Returns { docType, confidence, invoice? } where invoice is populated for invoice documents.',
    inputSchema: z.object({
      file_name: z
        .string()
        .describe('Original file name including extension, e.g. invoice_2024_001.pdf'),
      file_type: z
        .string()
        .describe('MIME type of the file, e.g. text/plain, application/pdf'),
      file_content: z
        .string()
        .describe('Base64-encoded file content (raw or data-URL format)'),
    }),
    outputSchema: z.object({
      docType: z.enum(['invoice', 'po', 'packing_list', 'unknown']),
      confidence: z.number().min(0).max(1),
      invoice: ExtractedInvoiceSchema.optional(),
      message: z.string().optional(),
    }),
  })

  @UseFilters(IngestionExceptionFilter)
  @RateLimit({ requests: 20, window: '1m' })
  async ingestDocument(
    input: { file_name: string; file_type: string; file_content: string },
    ctx: ExecutionContext,
  ): Promise<{
    docType: 'invoice' | 'po' | 'packing_list' | 'unknown';
    confidence: number;
    invoice?: ExtractedInvoice;
    message?: string;
  }> {
    ctx.logger?.info(
      `[ingest_document] Received "${input.file_name}" (${input.file_type})`,
    );

    // 1. Decode base64 → plain text
    let textContent: string;
    try {
      textContent = decodeBase64(input.file_content);
    } catch {
      throw new Error(
        `Failed to decode file_content for "${input.file_name}". ` +
          'Ensure it is a valid Base64 string or data-URL.',
      );
    }

    if (!textContent.trim()) {
      throw new Error(`Decoded content for "${input.file_name}" is empty.`);
    }

    // 2. Classify
    const classification = await this.classifyDocument(
      { filename: input.file_name, content: textContent },
      ctx,
    );

    ctx.logger?.info(
      `[ingest_document] Classified as "${classification.docType}" ` +
        `(confidence: ${classification.confidence})`,
    );

    // 3. Extract if invoice
    if (classification.docType === 'invoice' && classification.confidence >= 0.5) {
      const invoice = await this.extractDocumentData(
        { content: textContent, mimeType: input.file_type },
        ctx,
      );

      ctx.logger?.info(
        `[ingest_document] Extraction complete — invoice #${invoice.invoiceNumber}`,
      );

      return {
        docType: classification.docType,
        confidence: classification.confidence,
        invoice,
      };
    }

    // 4. Non-invoice: return classification only
    const message =
      classification.docType === 'unknown'
        ? 'Document type could not be determined. Manual review recommended.'
        : `Document identified as "${classification.docType}". ` +
          'Extraction is only performed on invoice documents.';

    return {
      docType: classification.docType,
      confidence: classification.confidence,
      message,
    };
  }

  // ── Resource: ingestion://status ──────────────────────────────────────────

  @ResourceDecorator({
    uri: 'ingestion://status',
    name: 'Ingestion Module Status',
    description:
      'Returns the current status and capability summary of the Ingestion module.',
    mimeType: 'application/json',
  })
  async getStatus(_ctx: ExecutionContext) {
    return {
      module: 'IngestionModule',
      version: '1.0.0',
      status: 'operational',
      tools: [
        'ingestion_classify_document',
        'ingestion_extract_invoice_line_items',
        'ingestion_extract_document_data',
        'ingestion_ingest_document',
      ],
      supportedDocTypes: ['invoice', 'po', 'packing_list'],
      model: 'claude-haiku-20240307',
      timestamp: new Date().toISOString(),
    };
  }
}
