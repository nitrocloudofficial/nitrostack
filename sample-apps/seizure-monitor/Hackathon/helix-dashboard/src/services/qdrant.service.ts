import { Injectable, ConfigService } from '@nitrostack/core';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * QdrantService
 * Handles vector storage and retrieval using Qdrant Cloud.
 */
@Injectable({ deps: [ConfigService] })
export class QdrantService {
  private readonly client: AxiosInstance;
  private readonly collectionName = 'helix-documents';
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('QDRANT_URL') || 'http://localhost:6333';
    this.apiKey = this.configService.get('QDRANT_API_KEY') || '';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize collection if it doesn't exist
   */
  async initializeCollection(vectorSize = 1536): Promise<void> {
    try {
      // Check if collection exists
      await this.client.get(`/collections/${this.collectionName}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Create collection
        await this.client.put(`/collections/${this.collectionName}`, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Upsert a point (document with embedding) into Qdrant
   */
  async upsertPoint(point: { id: string; vector: number[]; payload: any }): Promise<void> {
    await this.client.put(`/collections/${this.collectionName}/points`, {
      points: [
        {
          id: point.id,
          vector: point.vector,
          payload: point.payload,
        },
      ],
    });
  }

  /**
   * Upsert multiple points in batch
   */
  async upsertBatch(points: { id: string; vector: number[]; payload: any }[]): Promise<void> {
    if (points.length === 0) return;
    await this.client.put(`/collections/${this.collectionName}/points`, {
      points: points.map(p => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  /**
   * Search for similar vectors
   */
  async search(vector: number[], limit = 5, scoreThreshold = 0.5): Promise<any[]> {
    const response = await this.client.post(`/collections/${this.collectionName}/points/search`, {
      vector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });
    return response.data.result.map((item: any) => ({
      id: item.id,
      score: item.score,
      payload: item.payload,
    }));
  }

  /**
   * Delete a point by ID
   */
  async deletePoint(id: string): Promise<void> {
    await this.client.post(`/collections/${this.collectionName}/points/delete`, {
      points_selector: {
        ids: [id],
      },
    });
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<any> {
    const response = await this.client.get(`/collections/${this.collectionName}`);
    return response.data;
  }

  /**
   * Generate a unique ID for a point
   */
  generateId(): string {
    return uuidv4();
  }
}
