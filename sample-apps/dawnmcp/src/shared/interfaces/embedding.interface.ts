/**
 * Embedding Service Interface
 *
 * Provider-agnostic contract for generating vector embeddings.
 * Implementations can wrap Ollama, OpenAI, or local models.
 */

/** Provider-agnostic embedding service contract. */
export interface IEmbeddingService {
  /** Generate a single embedding vector for the given text. */
  createEmbedding(text: string): Promise<number[]>;

  /** Generate embedding vectors for multiple texts in a single call. */
  createBatchEmbedding(texts: string[]): Promise<number[][]>;

  /** Return the dimensionality of the embedding model (e.g. 768, 1024). */
  getDimension(): Promise<number>;
}
