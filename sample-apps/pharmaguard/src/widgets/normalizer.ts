/**
 * Normalizer: Converts individual tool outputs into unified PharmaGuardPayload
 */

import type { PharmaGuardPayload, DrugInfo, AdverseReaction, Recall } from './types.js';

interface NdcToolOutput {
  found: boolean;
  productNdc?: string;
  genericName?: string;
  brandName?: string;
  dosageForm?: string;
  manufacturer?: string;
  message?: string;
}

interface AdverseEventsToolOutput {
  found: boolean;
  topReactions?: Array<{ reaction: string; count: number }>;
}

interface RecallStatusToolOutput {
  hasActiveRecalls: boolean;
  recallCount: number;
  recalls?: Array<{
    classification: string;
    reason: string;
    status: string;
    initiationDate: string;
  }>;
}

/**
 * Normalize tool outputs into a single PharmaGuardPayload
 * Handles partial data gracefully (e.g., only NDC data available)
 */
export function normalizePharmaGuardData(
  ndcOutput?: NdcToolOutput,
  adverseEventsOutput?: AdverseEventsToolOutput,
  recallStatusOutput?: RecallStatusToolOutput,
): PharmaGuardPayload {
  // Build drug info from NDC output
  const drug: DrugInfo = {
    name: ndcOutput?.brandName || ndcOutput?.genericName || 'Unknown Drug',
    ndc: ndcOutput?.productNdc || 'N/A',
    manufacturer: ndcOutput?.manufacturer || 'Unknown',
    dosageForm: ndcOutput?.dosageForm,
  };

  // Extract adverse reactions
  const adverseEvents: AdverseReaction[] = adverseEventsOutput?.topReactions || [];

  // Extract recalls
  const recalls: Recall[] = recallStatusOutput?.recalls || [];

  return {
    drug,
    adverseEvents,
    recalls,
  };
}

/**
 * Merge multiple partial payloads (e.g., from streaming tool calls)
 */
export function mergePharmaGuardPayloads(
  ...payloads: Partial<PharmaGuardPayload>[]
): PharmaGuardPayload {
  const merged: PharmaGuardPayload = {
    drug: {
      name: 'Unknown Drug',
      ndc: 'N/A',
      manufacturer: 'Unknown',
    },
    adverseEvents: [],
    recalls: [],
  };

  for (const payload of payloads) {
    if (payload.drug) {
      merged.drug = { ...merged.drug, ...payload.drug };
    }
    if (payload.adverseEvents && payload.adverseEvents.length > 0) {
      merged.adverseEvents = payload.adverseEvents;
    }
    if (payload.recalls && payload.recalls.length > 0) {
      merged.recalls = payload.recalls;
    }
    if (payload.error) {
      merged.error = payload.error;
    }
  }

  return merged;
}
