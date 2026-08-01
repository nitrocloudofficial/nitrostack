import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { KnowledgeService } from './knowledge.service.js';

const SearchSchema = z.object({
  query: z.string().describe('The search query or question to ask the knowledge base'),
});

const CreateDocumentSchema = z.object({
  title: z.string().describe('Title of the document'),
  source: z.string().describe('Source reference of the document (e.g. manual-upload)'),
  content: z.string().describe('Markdown or plain text content, or base64-encoded string for PDF/Docx'),
  format: z.enum(['markdown', 'pdf', 'docx', 'txt', 'json', 'yaml']).describe('Format of the document'),
});

const UpdateDocumentSchema = z.object({
  id: z.string().describe('The ID of the document to update'),
  content: z.string().describe('The new updated content of the document'),
});

const DocumentIdSchema = z.object({
  id: z.string().describe('The document ID'),
});

const EntityIdSchema = z.object({
  id: z.string().describe('The entity ID in the graph'),
});

const DocumentVersionSchema = z.object({
  id: z.string().describe('The document ID'),
  version: z.number().describe('The version number to retrieve'),
});

@Injectable({ deps: [KnowledgeService] })
export class KnowledgeTools {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Tool({
    name: 'search_knowledge_base',
    description: 'Query the knowledge base using hybrid semantic and graph-based retrieval',
    inputSchema: SearchSchema,
  })
  async search(input: z.infer<typeof SearchSchema>, ctx: ExecutionContext) {
    return this.knowledgeService.search(input.query);
  }

  @Tool({
    name: 'create_document',
    description: 'Ingest and process a new document (chunking, vector indexing, and graph entity extraction)',
    inputSchema: CreateDocumentSchema,
  })
  async createDocument(input: z.infer<typeof CreateDocumentSchema>, ctx: ExecutionContext) {
    return this.knowledgeService.createDocument(input);
  }

  @Tool({
    name: 'update_document',
    description: 'Update the content of an existing document and re-process chunks/indexes',
    inputSchema: UpdateDocumentSchema,
  })
  async updateDocument(input: z.infer<typeof UpdateDocumentSchema>, ctx: ExecutionContext) {
    return this.knowledgeService.updateDocument(input.id, input.content);
  }

  @Tool({
    name: 'delete_document',
    description: 'Delete a document, removing its chunks, vectors, and graph relationships',
    inputSchema: DocumentIdSchema,
  })
  async deleteDocument(input: z.infer<typeof DocumentIdSchema>, ctx: ExecutionContext) {
    return this.knowledgeService.deleteDocument(input.id);
  }

  @Tool({
    name: 'get_full_graph',
    description: 'Retrieve all extracted entities and relationships in the knowledge graph',
    inputSchema: z.object({}),
  })
  async getFullGraph(input: any, ctx: ExecutionContext) {
    return this.knowledgeService.getGraph();
  }

  @Tool({
    name: 'get_entity_neighbors',
    description: 'Get details of a specific entity, its direct relationships, and its 1-step neighbor entities',
    inputSchema: EntityIdSchema,
  })
  async getEntityNeighbors(input: z.infer<typeof EntityIdSchema>, ctx: ExecutionContext) {
    return this.knowledgeService.getEntity(input.id);
  }

  @Tool({
    name: 'get_document_history',
    description: 'Retrieve the revision history (versions and timestamps) for a document',
    inputSchema: DocumentIdSchema,
  })
  async getDocumentHistory(input: z.infer<typeof DocumentIdSchema>, ctx: ExecutionContext) {
    return this.knowledgeService.getHistory(input.id);
  }

  @Tool({
    name: 'get_document_version',
    description: 'Retrieve the complete document state for a specific historical version number',
    inputSchema: DocumentVersionSchema,
  })
  async getDocumentVersion(input: z.infer<typeof DocumentVersionSchema>, ctx: ExecutionContext) {
    return this.knowledgeService.getVersion(input.id, input.version);
  }
}
