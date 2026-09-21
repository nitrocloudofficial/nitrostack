import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { DocumentService } from './document.service.js';

const docService = new DocumentService();

export class DocumentTools {
  @Tool({
    name: 'document_analyze',
    description: 'Analyze a document - extract keywords, entities, sentiment, categories, and generate a summary',
    parameters: z.object({
      text: z.string().describe('The document text to analyze'),
      title: z.string().optional().describe('Optional document title'),
    }),
  })
  async analyze(ctx: ExecutionContext) {
    const { text, title } = ctx.params as { text: string; title?: string };
    const analysis = await docService.analyze(text, title);
    return { content: [{ type: 'text' as const, text: JSON.stringify(analysis, null, 2) }] };
  }

  @Tool({
    name: 'document_summarize',
    description: 'Generate a concise summary of a document',
    parameters: z.object({
      text: z.string().describe('The document text to summarize'),
    }),
  })
  async summarize(ctx: ExecutionContext) {
    const { text } = ctx.params as { text: string };
    const summary = await docService.summarize(text);
    return { content: [{ type: 'text' as const, text: summary }] };
  }

  @Tool({
    name: 'document_extract_insights',
    description: 'Extract key findings, risks, recommendations, and action items from a document',
    parameters: z.object({
      text: z.string().describe('The document text to extract insights from'),
    }),
  })
  async extractInsights(ctx: ExecutionContext) {
    const { text } = ctx.params as { text: string };
    const insights = await docService.extractInsights(text);
    return { content: [{ type: 'text' as const, text: JSON.stringify(insights, null, 2) }] };
  }

  @Tool({
    name: 'document_extract_keywords',
    description: 'Extract the most important keywords from a document',
    parameters: z.object({
      text: z.string().describe('The text to extract keywords from'),
    }),
  })
  async extractKeywords(ctx: ExecutionContext) {
    const { text } = ctx.params as { text: string };
    const keywords = docService.extractKeywords(text);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ keywords }, null, 2) }] };
  }

  @Tool({
    name: 'document_compare',
    description: 'Compare two documents and find similarities and differences',
    parameters: z.object({
      text1: z.string().describe('First document text'),
      text2: z.string().describe('Second document text'),
    }),
  })
  async compare(ctx: ExecutionContext) {
    const { text1, text2 } = ctx.params as { text1: string; text2: string };
    const comparison = docService.compare(text1, text2);
    return { content: [{ type: 'text' as const, text: JSON.stringify(comparison, null, 2) }] };
  }

  @Tool({
    name: 'document_list',
    description: 'List all previously analyzed documents',
    parameters: z.object({}),
  })
  async listDocuments(ctx: ExecutionContext) {
    const docs = docService.listDocuments();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ count: docs.length, documents: docs }, null, 2) }] };
  }
}
