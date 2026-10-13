import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { DocumentService } from './document.service.js';

/**
 * Document & Knowledge Management MCP Tools
 */
@Controller('documents')
export class DocumentTools {
  constructor(private readonly documentService: DocumentService) {}

  @Tool({
    name: 'add_document',
    description: 'Store and index a project document, spec, or architecture guide for semantic retrieval.',
    inputSchema: z.object({
      title: z.string().min(1).describe('Document title.'),
      content: z.string().min(1).describe('Document content markdown or plain text.'),
      category: z.string().default('general').describe('Document category (e.g. "architecture", "api_spec", "onboarding").'),
      metadata: z.record(z.unknown()).optional().describe('Optional key-value metadata.'),
    }),
  })
  async addDocument(
    input: { title: string; content: string; category?: string; metadata?: Record<string, unknown> },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Adding document', { title: input.title, category: input.category });

    try {
      const doc = await this.documentService.addDocument(
        input.title,
        input.content,
        input.category ?? 'general',
        input.metadata ?? {},
      );
      return { success: true, message: `Document "${doc.title}" added successfully`, documentId: doc.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'search_documents',
    description: 'Search stored project documentation by semantic similarity.',
    inputSchema: z.object({
      query: z.string().min(1).describe('Search query.'),
      category: z.string().optional().describe('Filter by category.'),
      limit: z.number().int().min(1).max(20).default(5).describe('Maximum results to return.'),
    }),
  })
  async searchDocuments(
    input: { query: string; category?: string; limit?: number },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Searching documents', { query: input.query });

    try {
      const results = await this.documentService.searchDocuments(input.query, input.limit ?? 5, input.category);
      return { success: true, count: results.length, documents: results };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'list_documents',
    description: 'List all stored project documents and specs.',
    inputSchema: z.object({}),
  })
  async listDocuments(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Listing documents');

    try {
      const docs = await this.documentService.listDocuments();
      return {
        success: true,
        count: docs.length,
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          createdAt: d.createdAt,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'delete_document',
    description: 'Delete a stored document by its UUID.',
    inputSchema: z.object({
      id: z.string().min(1).describe('Document UUID to delete.'),
    }),
  })
  async deleteDocument(input: { id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Deleting document', { id: input.id });

    try {
      const deleted = await this.documentService.deleteDocument(input.id);
      return { success: deleted, message: deleted ? `Deleted document ${input.id}` : 'Document not found' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
