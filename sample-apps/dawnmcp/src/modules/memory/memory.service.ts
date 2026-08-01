import { Injectable } from '@nitrostack/core';
import { VectorStoreService } from '../../database/vector-store.service.js';
import { FileStoreService } from '../../database/file-store.service.js';
import { EmbeddingService } from '../../shared/services/embedding.service.js';
import { randomUUID } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────

/** Allowed memory categories. */
export type MemoryCategory =
  | 'user_preferences'
  | 'project_info'
  | 'technical_decisions'
  | 'conversations'
  | 'events';

/** A stored memory record. */
export interface MemoryRecord {
  id: string;
  content: string;
  category: MemoryCategory;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Result returned by similarity search. */
export interface MemorySearchResult {
  id: string;
  content: string;
  category: MemoryCategory;
  metadata: Record<string, unknown>;
  similarity: number;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const VECTOR_COLLECTION = 'memories';
const FILE_COLLECTION = 'memories';

// ─── Service ──────────────────────────────────────────────────────────

/**
 * Memory Service
 *
 * Persistent AI memory engine.  Combines vector similarity search (for
 * semantic retrieval) with structured file storage (for full record data).
 *
 * Pipeline:
 *   User input → embedding → vector store + file store → semantic search → context
 */
@Injectable()
export class MemoryService {
  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly fileStore: FileStoreService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────

  /**
   * Store a new memory with embedding for semantic retrieval.
   */
  async createMemory(
    content: string,
    category: MemoryCategory,
    metadata: Record<string, unknown> = {},
  ): Promise<MemoryRecord> {
    const id = randomUUID();
    const now = new Date().toISOString();

    // Generate embedding
    const embedding = await this.embeddingService.createEmbedding(content);

    // Build the full record
    const record: MemoryRecord = {
      id,
      content,
      category,
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Store the embedding for similarity search
    await this.vectorStore.addDocuments(VECTOR_COLLECTION, [
      {
        id,
        content,
        embedding,
        metadata: { ...metadata, category, createdAt: now },
      },
    ]);

    // Store the full record for direct retrieval
    await this.fileStore.set(FILE_COLLECTION, id, record as unknown as Record<string, unknown>);

    return record;
  }

  // ── Retrieve ───────────────────────────────────────────────────────

  /**
   * Retrieve a single memory by ID.
   */
  async retrieveMemory(id: string): Promise<MemoryRecord | null> {
    return this.fileStore.get<MemoryRecord>(FILE_COLLECTION, id);
  }

  // ── Search ─────────────────────────────────────────────────────────

  /**
   * Search memories by semantic similarity.
   * Optionally filter by category.
   */
  async searchMemory(
    query: string,
    limit = 10,
    category?: MemoryCategory,
  ): Promise<MemorySearchResult[]> {
    // Embed the query
    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    // Build metadata filter
    const filter = category ? { category } : undefined;

    // Vector similarity search
    const results = await this.vectorStore.query(VECTOR_COLLECTION, queryEmbedding, limit, filter);

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      category: (r.metadata.category as MemoryCategory) ?? 'conversations',
      metadata: r.metadata,
      similarity: r.similarity,
      createdAt: (r.metadata.createdAt as string) ?? '',
    }));
  }

  // ── Update ─────────────────────────────────────────────────────────

  /**
   * Update a memory's content.  Re-generates the embedding.
   */
  async updateMemory(
    id: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<MemoryRecord | null> {
    const existing = await this.fileStore.get<MemoryRecord>(FILE_COLLECTION, id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newEmbedding = await this.embeddingService.createEmbedding(content);

    const updated: MemoryRecord = {
      ...existing,
      content,
      metadata: metadata ?? existing.metadata,
      updatedAt: now,
    };

    // Update vector store
    await this.vectorStore.updateDocuments(VECTOR_COLLECTION, [
      {
        id,
        content,
        embedding: newEmbedding,
        metadata: { ...updated.metadata, category: updated.category, createdAt: updated.createdAt },
      },
    ]);

    // Update file store
    await this.fileStore.set(FILE_COLLECTION, id, updated as unknown as Record<string, unknown>);

    return updated;
  }

  // ── Delete ─────────────────────────────────────────────────────────

  /**
   * Delete a memory by ID.
   */
  async deleteMemory(id: string): Promise<boolean> {
    await this.vectorStore.deleteDocuments(VECTOR_COLLECTION, [id]);
    return this.fileStore.delete(FILE_COLLECTION, id);
  }

  // ── Listing ────────────────────────────────────────────────────────

  /**
   * Return the most recent memories (for the memory://history resource).
   */
  async getRecentMemories(limit = 50): Promise<MemoryRecord[]> {
    const all = await this.fileStore.list<MemoryRecord>(FILE_COLLECTION);

    return all
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Return memories filtered by category.
   */
  async getMemoriesByCategory(category: MemoryCategory): Promise<MemoryRecord[]> {
    return this.fileStore.query<MemoryRecord>(FILE_COLLECTION, (m) => m.category === category);
  }
}
