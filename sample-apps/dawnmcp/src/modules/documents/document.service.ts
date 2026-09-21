import { Injectable } from '@nitrostack/core';
import { VectorStoreService } from '../../database/vector-store.service.js';
import { FileStoreService } from '../../database/file-store.service.js';
import { EmbeddingService } from '../../shared/services/embedding.service.js';
import { randomUUID } from 'crypto';

export interface DocumentRecord {
  id: string;
  title: string;
  category: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  category: string;
  snippet: string;
  similarity: number;
}

const VECTOR_COLLECTION = 'documents_chunks';
const FILE_COLLECTION = 'documents_store';

@Injectable()
export class DocumentService {
  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly fileStore: FileStoreService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Add and index a new document.
   */
  async addDocument(
    title: string,
    content: string,
    category = 'general',
    metadata: Record<string, unknown> = {},
  ): Promise<DocumentRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const record: DocumentRecord = {
      id,
      title,
      category,
      content,
      metadata,
      createdAt: now,
    };

    // Store full record
    await this.fileStore.set(FILE_COLLECTION, id, record as unknown as Record<string, unknown>);

    // Embed content in chunks or whole
    const embedding = await this.embeddingService.createEmbedding(`${title}\n${content}`);
    await this.vectorStore.addDocuments(VECTOR_COLLECTION, [
      {
        id,
        content: `${title}\n${content.slice(0, 1500)}`,
        embedding,
        metadata: { ...metadata, title, category, docId: id, createdAt: now },
      },
    ]);

    return record;
  }

  /**
   * Search documents by semantic similarity.
   */
  async searchDocuments(query: string, limit = 5, category?: string): Promise<DocumentSearchResult[]> {
    const queryEmbedding = await this.embeddingService.createEmbedding(query);
    const filter = category ? { category } : undefined;

    const results = await this.vectorStore.query(VECTOR_COLLECTION, queryEmbedding, limit, filter);

    return results.map((r) => ({
      id: (r.metadata.docId as string) || r.id,
      title: (r.metadata.title as string) || 'Untitled',
      category: (r.metadata.category as string) || 'general',
      snippet: r.content,
      similarity: r.similarity,
    }));
  }

  /**
   * List all stored documents.
   */
  async listDocuments(): Promise<DocumentRecord[]> {
    return this.fileStore.list<DocumentRecord>(FILE_COLLECTION);
  }

  /**
   * Delete a document by ID.
   */
  async deleteDocument(id: string): Promise<boolean> {
    await this.vectorStore.deleteDocuments(VECTOR_COLLECTION, [id]);
    return this.fileStore.delete(FILE_COLLECTION, id);
  }
}
