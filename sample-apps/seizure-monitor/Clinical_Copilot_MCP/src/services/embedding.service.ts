import { Injectable } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Embedding Service
 *
 * Generates vector embeddings for medical text, summaries, and diagnostic notes.
 */
@Injectable()
export class EmbeddingService {
  /**
   * Generates a 1536-dimensional vector embedding for clinical text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // In production: Send text to OpenAI / Gemini embedding endpoint
      // Generate deterministic normalized mock embedding vector for development
      const vectorSize = 1536;
      const embedding: number[] = new Array(vectorSize);
      
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }

      for (let i = 0; i < vectorSize; i++) {
        const val = Math.sin(hash + i) * 10000;
        embedding[i] = (val - Math.floor(val)) * 2 - 1;
      }

      return embedding;
    } catch (error: any) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }
}
