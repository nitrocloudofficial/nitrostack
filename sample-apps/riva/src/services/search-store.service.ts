import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import type { RideSearchState } from '../domain/types.js';

const MAX_ENTRIES = 200;
const TTL_MS = 30 * 60 * 1000; // 30 minutes — generous for a demo/hackathon session

/**
 * SearchStoreService
 *
 * MCP tool calls are stateless requests, and this Phase 1 build has no user
 * accounts or persistent sessions. To let a rider say "find cheaper
 * options" or "tell me more about this Uber option" *after* an initial
 * find_rides call, each search result is cached in memory under a
 * generated `searchId` that is returned to the client and threaded through
 * subsequent tool calls (search_ride_options, recommend_best_ride,
 * get_ride_option_details, plan_return_trip).
 *
 * This is an in-memory, process-local cache — acceptable for a Phase 1
 * MVP demo. It is not a persistence layer and does not survive restarts.
 */
@Injectable()
export class SearchStoreService {
  private store = new Map<string, RideSearchState>();

  create(state: Omit<RideSearchState, 'searchId' | 'createdAt'>): RideSearchState {
    this.evictExpired();
    if (this.store.size >= MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    const searchId = randomUUID();
    const fullState: RideSearchState = { ...state, searchId, createdAt: Date.now() };
    this.store.set(searchId, fullState);
    return fullState;
  }

  get(searchId: string): RideSearchState | undefined {
    this.evictExpired();
    return this.store.get(searchId);
  }

  update(searchId: string, patch: Partial<RideSearchState>): RideSearchState | undefined {
    const existing = this.store.get(searchId);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.store.set(searchId, updated);
    return updated;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now - value.createdAt > TTL_MS) {
        this.store.delete(key);
      }
    }
  }
}
