import { Tool } from '../../tool.js';
import { tokenize } from './tokenizer.js';
import { BM25Document, BM25SearchResult, IndexDocumentInput } from './types.js';

export interface BM25EngineOptions {
  k1?: number; // Term frequency saturation (default: 1.5)
  b?: number; // Document length normalization (default: 0.75)
  nameBoost?: number; // Multiplier for tool name (default: 3.0)
  titleBoost?: number; // Multiplier for tool title (default: 2.0)
  paramBoost?: number; // Multiplier for parameter names/descriptions (default: 1.5)
  descBoost?: number; // Multiplier for tool description (default: 1.0)
}

export class BM25Engine<T = Tool> {
  private readonly k1: number;
  private readonly b: number;
  private readonly nameBoost: number;
  private readonly titleBoost: number;
  private readonly paramBoost: number;
  private readonly descBoost: number;

  private documents: BM25Document<T>[] = [];
  private df: Map<string, number> = new Map(); // Document frequency per term
  private avgDocLength: number = 0;
  private contentHash: string = '';

  constructor(options: BM25EngineOptions = {}) {
    this.k1 = options.k1 ?? 1.5;
    this.b = options.b ?? 0.75;
    this.nameBoost = options.nameBoost ?? 3.0;
    this.titleBoost = options.titleBoost ?? 2.0;
    this.paramBoost = options.paramBoost ?? 1.5;
    this.descBoost = options.descBoost ?? 1.0;
  }

  /**
   * Builds the in-memory inverted index from generic document inputs.
   * If a matching content hash is provided and index exists, indexing is skipped.
   */
  buildIndex(docs: IndexDocumentInput<T>[], hash?: string): void {
    if (hash && this.contentHash === hash && this.documents.length > 0) {
      return; // Cache hit: catalog has not mutated
    }

    this.documents = [];
    this.df.clear();

    let totalLength = 0;

    for (const doc of docs) {
      const termFrequencies = new Map<string, number>();

      // 1. Extract tokens with field boosts
      const nameTokens = tokenize(doc.name);
      const titleTokens = tokenize(doc.title || '');
      const descTokens = tokenize(doc.description || '');
      const paramTokens = tokenize(doc.parametersText || '');

      const addTokens = (tokens: string[], boost: number) => {
        for (const token of tokens) {
          termFrequencies.set(token, (termFrequencies.get(token) || 0) + boost);
        }
      };

      addTokens(nameTokens, this.nameBoost);
      addTokens(titleTokens, this.titleBoost);
      addTokens(descTokens, this.descBoost);
      addTokens(paramTokens, this.paramBoost);

      // Compute weighted document length
      let docLength = 0;
      for (const freq of termFrequencies.values()) {
        docLength += freq;
      }
      totalLength += docLength;

      // Update document frequencies (DF) for each unique token in doc
      for (const token of termFrequencies.keys()) {
        this.df.set(token, (this.df.get(token) || 0) + 1);
      }

      this.documents.push({
        id: doc.id,
        item: doc.item,
        length: docLength,
        termFrequencies,
      });
    }

    this.avgDocLength = this.documents.length > 0 ? totalLength / this.documents.length : 1;
    this.contentHash = hash ?? '';
  }

  /**
   * Helper to build index directly from Tool instances.
   */
  indexTools(tools: Tool[], hash?: string): void {
    const docs: IndexDocumentInput<T>[] = tools.map((tool) => {
      let paramsText = '';
      const schema = tool.inputSchema as any;
      if (schema) {
        if (schema.properties && typeof schema.properties === 'object') {
          for (const [key, prop] of Object.entries(schema.properties)) {
            paramsText += ` ${key}`;
            if (prop && typeof prop === 'object' && (prop as any).description) {
              paramsText += ` ${(prop as any).description}`;
            }
          }
        } else {
          const shape =
            typeof schema._def?.shape === 'function'
              ? schema._def.shape()
              : schema.shape || schema._def?.shape;
          if (shape && typeof shape === 'object') {
            for (const [key, prop] of Object.entries(shape)) {
              paramsText += ` ${key}`;
              if (prop && typeof prop === 'object' && (prop as any).description) {
                paramsText += ` ${(prop as any).description}`;
              }
            }
          }
        }
      }

      return {
        id: tool.name,
        name: tool.name,
        title: (tool as any).title,
        description: tool.description,
        parametersText: paramsText,
        item: tool as unknown as T,
      };
    });

    this.buildIndex(docs, hash);
  }

  /**
   * Searches the indexed documents using Lucene BM25 Okapi non-negative scoring.
   */
  search(query: string, limit: number = 5): BM25SearchResult<T>[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.documents.length === 0) {
      return [];
    }

    const N = this.documents.length;
    const results: BM25SearchResult<T>[] = [];

    for (const doc of this.documents) {
      let score = 0;

      for (const q of queryTokens) {
        const tf = doc.termFrequencies.get(q) || 0;
        const n_q = this.df.get(q) || 0;

        if (tf === 0 || n_q === 0) {
          continue;
        }

        // Non-negative Lucene BM25 IDF: ln(1 + (N - n(q) + 0.5) / (n(q) + 0.5))
        const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));

        // Length-normalized TF: tf * (k1 + 1) / (tf + k1 * (1 - b + b * (|D| / avgdl)))
        const tfNorm =
          (tf * (this.k1 + 1)) /
          (tf + this.k1 * (1 - this.b + this.b * (doc.length / this.avgDocLength)));

        score += idf * tfNorm;
      }

      if (score > 0) {
        results.push({ item: doc.item, score });
      }
    }

    // Sort descending by relevance score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Diagnostic statistics for debugging and NitroStudio telemetry.
   */
  getStats(): { docCount: number; avgDocLength: number; vocabSize: number; contentHash: string } {
    return {
      docCount: this.documents.length,
      avgDocLength: this.avgDocLength,
      vocabSize: this.df.size,
      contentHash: this.contentHash,
    };
  }
}
