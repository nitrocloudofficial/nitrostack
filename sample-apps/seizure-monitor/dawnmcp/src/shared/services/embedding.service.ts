import { Injectable, OnModuleInit } from '@nitrostack/core';
import type { IEmbeddingService } from '../interfaces/embedding.interface.js';
import { AppConfigService } from '../../config/app.config.js';
import { sharedAiQueue } from '../utils/request-queue.js';

/**
 * Local Embedding Service (Ollama)
 *
 * Generates vector embeddings using a local Ollama model (nomic-embed-text).
 * Queues requests via sharedAiQueue to prevent local GPU/CPU thrashing.
 */
@Injectable()
export class EmbeddingService implements IEmbeddingService, OnModuleInit {
  private readonly baseUrl: string;
  private readonly model: string;
  private dimension: number | null = null;
  private embedEndpoint: '/api/embed' | '/api/embeddings' = '/api/embed';

  constructor(private readonly config: AppConfigService) {
    this.baseUrl = this.config?.ollamaUrl ?? 'http://127.0.0.1:11434';
    this.model = this.config?.embedModel ?? 'nomic-embed-text';
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return;

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const modelNames = data.models?.map((m) => m.name) ?? [];
      const modelBase = this.model.split(':')[0];

      if (modelNames.some((n) => n.startsWith(modelBase))) {
        console.error(`✅ Embedding model "${this.model}" available`);

        // Probe endpoint path (/api/embed vs /api/embeddings) & dimensionality
        await this.probeEndpointAndDimension();
      } else {
        console.error(`⚠️  Embedding model "${this.model}" not found. Run: ollama pull ${this.model}`);
      }
    } catch {
      console.error('⚠️  Cannot verify embedding model (Ollama not available)');
    }
  }

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Generate a single embedding vector for the given text.
   */
  async createEmbedding(text: string): Promise<number[]> {
    return sharedAiQueue.enqueue(async () => {
      return this.fetchEmbeddingSingle(text);
    });
  }

  /**
   * Generate embeddings for multiple texts.
   */
  async createBatchEmbedding(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (texts.length === 1) return [await this.createEmbedding(texts[0])];

    return sharedAiQueue.enqueue(async () => {
      const trimmed = texts.map((t) => t.slice(0, 8_000));

      try {
        if (this.embedEndpoint === '/api/embed') {
          const response = await fetch(`${this.baseUrl}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, input: trimmed }),
            signal: AbortSignal.timeout(120_000),
          });

          if (response.ok) {
            const data = (await response.json()) as { embeddings?: number[][] };
            if (data.embeddings && data.embeddings.length === texts.length) {
              return data.embeddings;
            }
          }
        }
      } catch {
        // Fall back to sequential
      }

      // Sequential fallback
      const results: number[][] = [];
      for (const text of trimmed) {
        results.push(await this.fetchEmbeddingSingle(text));
      }
      return results;
    });
  }

  /**
   * Return the dimensionality of embeddings produced by the current model.
   */
  async getDimension(): Promise<number> {
    if (this.dimension !== null) return this.dimension;

    const probe = await this.createEmbedding('dimension probe');
    this.dimension = probe.length;
    return this.dimension;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async fetchEmbeddingSingle(text: string): Promise<number[]> {
    const trimmed = text.slice(0, 8_000);

    const payload =
      this.embedEndpoint === '/api/embed'
        ? { model: this.model, input: trimmed }
        : { model: this.model, prompt: trimmed };

    const response = await fetch(`${this.baseUrl}${this.embedEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Embedding error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as { embeddings?: number[][]; embedding?: number[] };
    const embedding = data.embeddings?.[0] ?? data.embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding returned from Ollama');
    }

    return embedding;
  }

  private async probeEndpointAndDimension(): Promise<void> {
    try {
      // First try /api/embed
      const res = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input: 'probe' }),
        signal: AbortSignal.timeout(5_000),
      });

      if (res.ok) {
        this.embedEndpoint = '/api/embed';
        const data = (await res.json()) as { embeddings?: number[][] };
        if (data.embeddings?.[0]) {
          this.dimension = data.embeddings[0].length;
          console.error(`   Embedding endpoint: /api/embed (dimension: ${this.dimension})`);
          return;
        }
      }
    } catch {
      // Try /api/embeddings
    }

    try {
      const res2 = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: 'probe' }),
        signal: AbortSignal.timeout(5_000),
      });

      if (res2.ok) {
        this.embedEndpoint = '/api/embeddings';
        const data = (await res2.json()) as { embedding?: number[] };
        if (data.embedding) {
          this.dimension = data.embedding.length;
          console.error(`   Embedding endpoint: /api/embeddings (dimension: ${this.dimension})`);
          return;
        }
      }
    } catch {
      console.error('   ⚠️ Could not verify embedding endpoint with probe');
    }
  }
}
