import { Injectable } from '@nitrostack/core';
import { MongoService } from '../services/mongo.service.js';

export interface TrialSearchHistoryDocument {
  patientId: string;
  searchedAt: string;
  disease: string;
  numberOfTrials: number;
  selectedTrials: any[];
  llmUsed: 'Gemini' | 'Grok' | 'RuleEngine';
}

/**
 * Clinical Copilot MCP Server - Trial Repository
 *
 * Persists trial matching and search history logs into MongoDB ('trial_search_history' collection).
 */
@Injectable({ deps: [MongoService] })
export class TrialRepository {
  constructor(private readonly mongoService: MongoService) {}

  async saveSearchHistory(history: TrialSearchHistoryDocument): Promise<TrialSearchHistoryDocument> {
    try {
      const db = await this.mongoService.getDb();
      const collection = db.collection('trial_search_history');
      await collection.insertOne(history as any);
      return history;
    } catch (err: any) {
      console.error(`[TrialRepository] Error saving trial search history: ${err.message}`);
      return history;
    }
  }
}
