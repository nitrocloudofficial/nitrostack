import { Injectable } from '@nitrostack/core';
import { StandardEngineOutput } from '../../../shared/types/standard-engine-output.js';

export interface AggregatedDecisionResult {
  overallConfidence: number;
  engineSummaries: Record<string, string>;
  consolidatedFindings: Record<string, any>;
  allAssumptions: string[];
  allLimitations: string[];
  allRecommendations: string[];
  totalExecutionTimeMs: number;
}

@Injectable()
export class ResultAggregatorService {
  /**
   * Merges and aggregates outputs from all executed engines into a unified result.
   */
  public aggregate(engineOutputs: Record<string, StandardEngineOutput>): AggregatedDecisionResult {
    const engineIds = Object.keys(engineOutputs);
    if (engineIds.length === 0) {
      return {
        overallConfidence: 0,
        engineSummaries: {},
        consolidatedFindings: {},
        allAssumptions: [],
        allLimitations: [],
        allRecommendations: [],
        totalExecutionTimeMs: 0,
      };
    }

    let confidenceSum = 0;
    let totalTimeMs = 0;
    const engineSummaries: Record<string, string> = {};
    const consolidatedFindings: Record<string, any> = {};
    const assumptionsSet = new Set<string>();
    const limitationsSet = new Set<string>();
    const recommendationsSet = new Set<string>();

    for (const [engineId, output] of Object.entries(engineOutputs)) {
      confidenceSum += output.confidence;
      totalTimeMs += output.metadata?.executionTimeMs || 0;
      engineSummaries[engineId] = output.summary;

      // Merge structured findings under engine namespace
      consolidatedFindings[engineId] = output.structuredFindings;

      // Collect unique list items
      (output.assumptions || []).forEach((a) => assumptionsSet.add(a));
      (output.limitations || []).forEach((l) => limitationsSet.add(l));
      (output.recommendations || []).forEach((r) => recommendationsSet.add(r));
    }

    const overallConfidence = Math.round(confidenceSum / engineIds.length);

    return {
      overallConfidence,
      engineSummaries,
      consolidatedFindings,
      allAssumptions: Array.from(assumptionsSet),
      allLimitations: Array.from(limitationsSet),
      allRecommendations: Array.from(recommendationsSet),
      totalExecutionTimeMs: totalTimeMs,
    };
  }
}
