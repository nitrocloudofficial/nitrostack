/**
 * Storage Interfaces
 *
 * Abstractions for vector storage and structured file storage.
 * MVP: local JSON files + in-process cosine similarity.
 * Future: ChromaDB, PostgreSQL + pgvector.
 */

// ─── Vector Store ──────────────────────────────────────────────────────

/** A document with its embedding vector and metadata. */
export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

/** A vector search result with similarity score. */
export interface VectorSearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  /** Cosine similarity score (0–1, higher = more similar). */
  similarity: number;
}

/** Vector store contract — swap implementations without changing consumers. */
export interface IVectorStore {
  /** Ensure a named collection exists. */
  createCollection(name: string): Promise<void>;

  /** Add documents with pre-computed embeddings to a collection. */
  addDocuments(collection: string, documents: VectorDocument[]): Promise<void>;

  /** Find the most similar documents to a query embedding. */
  query(
    collection: string,
    queryEmbedding: number[],
    nResults?: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]>;

  /** Remove documents by ID from a collection. */
  deleteDocuments(collection: string, ids: string[]): Promise<void>;

  /** Replace documents (re-embed before calling). */
  updateDocuments(collection: string, documents: VectorDocument[]): Promise<void>;

  /** Retrieve a single document by ID. */
  getDocument(collection: string, id: string): Promise<VectorDocument | null>;

  /** Count documents in a collection. */
  countDocuments(collection: string): Promise<number>;
}

// ─── File Store ────────────────────────────────────────────────────────

/** Structured file store contract for JSON-serializable records. */
export interface IFileStore {
  /** Retrieve a record by collection and ID. */
  get<T>(collection: string, id: string): Promise<T | null>;

  /** Upsert a record into a collection. */
  set<T extends Record<string, unknown>>(collection: string, id: string, data: T): Promise<void>;

  /** Delete a record. Returns true if the record existed. */
  delete(collection: string, id: string): Promise<boolean>;

  /** List all records in a collection. */
  list<T>(collection: string): Promise<T[]>;

  /** Query records with a predicate function. */
  query<T>(collection: string, predicate: (item: T) => boolean): Promise<T[]>;
}
