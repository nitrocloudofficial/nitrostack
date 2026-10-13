import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { ParserService } from './parser.service.js';

@Injectable({ deps: [ParserService] })
export class IngestTools {
  constructor(private parserService: ParserService) {}

  @Tool({
    name: 'ingest_document',
    description: 'Ingest a contract document from a URL (e.g. ChatGPT file URL) or raw text. Parses PDF or Word documents and returns the extracted text.',
    inputSchema: z.object({
      url: z.string().optional().describe('URL to the uploaded PDF or Word document (if available)'),
      filename: z.string().optional().describe('Original filename (required if url is used)'),
      text: z.string().optional().describe('The raw text of the document (use this if url is not available)')
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
  })
  async ingestDocument(input: any, ctx: ExecutionContext) {
    if (!input.url && !input.text) {
      return { error: 'Must provide either url or text to ingest the document.' };
    }

    if (input.url && input.filename) {
      ctx.logger.info('Parsing document from URL', { filename: input.filename });
      return await this.parserService.parse(input.url, input.filename);
    }
    
    return {
      text: input.text,
      pageCount: Math.max(1, Math.ceil(input.text.length / 3000)),
      source: 'text',
      lowTextDensity: false
    };
  }
}
