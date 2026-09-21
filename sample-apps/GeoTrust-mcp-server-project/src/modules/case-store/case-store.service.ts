import { Injectable } from '@nitrostack/core';
import type { CaseState, ToolResult } from '../../shared-types.js';

/**
 * Shared in-memory case store.
 * Every tool writes findings here so subsequent tools can read prior results.
 * Map<caseId, CaseState>
 */
@Injectable()
export class CaseStoreService {
    private readonly store = new Map<string, CaseState>();

    getOrCreate(caseId: string, businessName: string): CaseState {
        if (!this.store.has(caseId)) {
            const now = new Date().toISOString();
            this.store.set(caseId, {
                caseId,
                businessName,
                claims: [],
                rawToolResults: [],
                createdAt: now,
                updatedAt: now,
            });
        }
        return this.store.get(caseId)!;
    }

    get(caseId: string): CaseState | undefined {
        return this.store.get(caseId);
    }

    addToolResult(caseId: string, result: ToolResult): void {
        const state = this.store.get(caseId);
        if (!state) throw new Error(`Case ${caseId} not found in store`);
        state.rawToolResults.push(result);
        state.updatedAt = new Date().toISOString();
    }

    updateClaims(caseId: string, claims: CaseState['claims']): void {
        const state = this.store.get(caseId);
        if (!state) throw new Error(`Case ${caseId} not found in store`);
        state.claims = claims;
        state.updatedAt = new Date().toISOString();
    }

    list(): CaseState[] {
        return Array.from(this.store.values());
    }

    delete(caseId: string): boolean {
        return this.store.delete(caseId);
    }
}
