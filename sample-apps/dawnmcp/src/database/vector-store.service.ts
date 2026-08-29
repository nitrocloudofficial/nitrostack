import { Injectable, OnModuleInit } from '@nitrostack/core';
import type {
  IVectorStore,
  VectorDocument,
  VectorSearchResult,
} from '../shared/interfaces/storage.interface.js';
import { AppConfigService } from '../config/app.config.js';
import { ChromaClient, Collection } from 'chromadb';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hybrid Vector Store Service
 *
 * Primary vector backend: ChromaDB via HTTP client (`CHROMA_URL`).
 * Fallback backend: Local in-process cosine similarity engine.
 *
 * Implements IVectorStore — consumer code is decoupled from the vector storage engine.
 */
@Injectable()
export class VectorStoreService implements IVectorStore, OnModuleInit {
  private chromaClient: ChromaClient | null = null;
  private chromaCollections = new Map<string, Collection>();
  private useChroma = false;

  // Local fallback memory & disk persistence
  private localCollections = new Map<string, Map<string, VectorDocument>>();
  private readonly vectorDir: string;

  constructor(private readonly config: AppConfigService) {
    this.vectorDir = path.resolve(config.dataDir, 'vectors');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    fs.mkdirSync(this.vectorDir, { recursive: true });

    if (this.config.vectorDb === 'chromadb') {
      try {
        const url = new URL(this.config.chromaUrl);
        this.chromaClient = new ChromaClient({
          path: `${url.protocol}//${url.hostname}:${url.port}`,
        });

        // Heartbeat check
        await this.chromaClient.heartbeat();
        this.useChroma = true;
        console.error(`✅ Connected to ChromaDB server at ${this.config.chromaUrl}`);
      } catch (error) {
        console.error(`⚠️  ChromaDB server not reachable at ${this.config.chromaUrl}.`);
        console.error('   To start ChromaDB, run: npm run chroma:start');
        console.error('   Falling back to local in-process vector store.');
        this.useChroma = false;
      }
    }

    if (!this.useChroma) {
      await this.loadLocalFromDisk();
      const totalDocs = Array.from(this.localCollections.values()).reduce(
        (sum, col) => sum + col.size,
        0,
      );
      console.error(`✅ Local Vector Store loaded — ${this.localCollections.size} collection(s), ${totalDocs} document(s)`);
    }
  }

  // ── IVectorStore implementation ────────────────────────────────────

  async createCollection(name: string): Promise<void> {
    const safeName = this.sanitizeCollectionName(name);

    if (this.useChroma && this.chromaClient) {
      try {
        const collection = await this.chromaClient.getOrCreateCollection({
          name: safeName,
          metadata: { embedding_model: this.config.embedModel },
        });
        this.chromaCollections.set(name, collection);
        return;
      } catch (err) {
        console.error(`⚠️ Failed to create Chroma collection "${safeName}", using local fallback:`, err);
      }
    }

    if (!this.localCollections.has(name)) {
      this.localCollections.set(name, new Map());
    }
  }

  async addDocuments(collection: string, documents: VectorDocument[]): Promise<void> {
    if (documents.length === 0) return;

    if (this.useChroma && this.chromaClient) {
      try {
        const col = await this.getOrFetchChromaCollection(collection);
        if (col) {
          const ids = documents.map((d) => d.id);
          const embeddings = documents.map((d) => d.embedding);
          const documentsText = documents.map((d) => d.content);
          const metadatas = documents.map((d) => ({
            ...d.metadata,
            embedding_model: this.config.embedModel,
          }));

          await col.add({
            ids,
            embeddings,
            documents: documentsText,
            metadatas,
          });
          return;
        }
      } catch (err) {
        console.error(`⚠️ Chroma addDocuments failed for "${collection}", using local fallback:`, err);
      }
    }

    // Local fallback
    if (!this.localCollections.has(collection)) {
      this.localCollections.set(collection, new Map());
    }
    const col = this.localCollections.get(collection)!;
    for (const doc of documents) {
      col.set(doc.id, {
        ...doc,
        metadata: { ...doc.metadata, embedding_model: this.config.embedModel },
      });
    }
    await this.persistLocalCollection(collection);
  }

  async query(
    collection: string,
    queryEmbedding: number[],
    nResults = 5,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    if (this.useChroma && this.chromaClient) {
      try {
        const col = await this.getOrFetchChromaCollection(collection);
        if (col) {
          const response = await col.query({
            queryEmbeddings: [queryEmbedding],
            nResults,
            where: filter ? (filter as any) : undefined,
          });

          const results: VectorSearchResult[] = [];
          const ids = response.ids[0] || [];
          const docs = response.documents[0] || [];
          const metadatas = response.metadatas[0] || [];
          const distances = response.distances?.[0] || [];

          for (let i = 0; i < ids.length; i++) {
            // Distance in Chroma cosine space: distance = 1 - similarity
            const distance = distances[i] ?? 1.0;
            const similarity = Math.max(0, 1 - distance);

            results.push({
              id: ids[i],
              content: docs[i] ?? '',
              metadata: (metadatas[i] as Record<string, unknown>) ?? {},
              similarity,
            });
          }
          return results;
        }
      } catch (err) {
        console.error(`⚠️ Chroma query failed for "${collection}", using local fallback:`, err);
      }
    }

    // Local fallback query
    const col = this.localCollections.get(collection);
    if (!col || col.size === 0) return [];

    const scored: VectorSearchResult[] = [];
    for (const doc of col.values()) {
      if (filter && !this.matchesFilter(doc.metadata, filter)) continue;

      const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
      scored.push({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        similarity,
      });
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, nResults);
  }

  async deleteDocuments(collection: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    if (this.useChroma && this.chromaClient) {
      try {
        const col = await this.getOrFetchChromaCollection(collection);
        if (col) {
          await col.delete({ ids });
          return;
        }
      } catch (err) {
        console.error(`⚠️ Chroma delete failed for "${collection}":`, err);
      }
    }

    const col = this.localCollections.get(collection);
    if (!col) return;
    for (const id of ids) {
      col.delete(id);
    }
    await this.persistLocalCollection(collection);
  }

  async updateDocuments(collection: string, documents: VectorDocument[]): Promise<void> {
    await this.addDocuments(collection, documents);
  }

  async getDocument(collection: string, id: string): Promise<VectorDocument | null> {
    if (this.useChroma && this.chromaClient) {
      try {
        const col = await this.getOrFetchChromaCollection(collection);
        if (col) {
          const res = await col.get({ ids: [id] });
          if (res.ids && res.ids.length > 0) {
            return {
              id: res.ids[0],
              content: res.documents[0] ?? '',
              embedding: res.embeddings?.[0] ?? [],
              metadata: (res.metadatas[0] as Record<string, unknown>) ?? {},
            };
          }
        }
      } catch {
        // Fallback
      }
    }

    const col = this.localCollections.get(collection);
    return col?.get(id) ?? null;
  }

  async countDocuments(collection: string): Promise<number> {
    if (this.useChroma && this.chromaClient) {
      try {
        const col = await this.getOrFetchChromaCollection(collection);
        if (col) {
          return await col.count();
        }
      } catch {
        // Fallback
      }
    }

    return this.localCollections.get(collection)?.size ?? 0;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async getOrFetchChromaCollection(name: string): Promise<Collection | null> {
    if (this.chromaCollections.has(name)) {
      return this.chromaCollections.get(name)!;
    }
    if (!this.chromaClient) return null;

    try {
      const safeName = this.sanitizeCollectionName(name);
      const col = await this.chromaClient.getOrCreateCollection({
        name: safeName,
        metadata: { embedding_model: this.config.embedModel },
      });
      this.chromaCollections.set(name, col);
      return col;
    } catch {
      return null;
    }
  }

  private sanitizeCollectionName(name: string): string {
    // Chroma collection names must be 3-63 chars, alphanumeric or underscores/hyphens
    let safe = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (safe.length < 3) safe = `${safe}_col`;
    if (safe.length > 63) safe = safe.slice(0, 63);
    return safe;
  }

  private async persistLocalCollection(name: string): Promise<void> {
    const col = this.localCollections.get(name);
    if (!col) return;

    const filePath = path.join(this.vectorDir, `${name}.json`);
    const records = Array.from(col.values());
    fs.writeFileSync(filePath, JSON.stringify(records), 'utf-8');
  }

  private async loadLocalFromDisk(): Promise<void> {
    if (!fs.existsSync(this.vectorDir)) return;

    const files = fs.readdirSync(this.vectorDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const collectionName = path.basename(file, '.json');
      const filePath = path.join(this.vectorDir, file);

      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const records = JSON.parse(raw) as VectorDocument[];
        const map = new Map<string, VectorDocument>();
        for (const doc of records) {
          map.set(doc.id, doc);
        }
        this.localCollections.set(collectionName, map);
      } catch (error) {
        console.error(`⚠️ Failed to load local vector collection "${collectionName}":`, error);
      }
    }
  }

  private matchesFilter(
    metadata: Record<string, unknown>,
    filter: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) return false;
    }
    return true;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}
