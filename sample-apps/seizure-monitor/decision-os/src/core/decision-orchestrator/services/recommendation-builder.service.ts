import { Injectable } from '@nitrostack/core';
import { AIService } from '../../../core/ai/ai.service.js';
import { DecisionContext } from '../../../shared/contracts/decision-context.js';
import { ExecutionPlan } from '../../../shared/contracts/execution-plan.js';
import { AggregatedDecisionResult } from './result-aggregator.service.js';

export interface EngineExplanation {
  engineId: string;
  reasonForSelection: string;
  dependsOn: string[];
  executionPriority: number;
}

export interface RecommendationEngineResult {
  verdict: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED' | 'NEEDS_MORE_DATA';
  executiveSummary: string;
  pros: string[];
  cons: string[];
  nextSteps: string[];
  alternativeOptions: string[];
  overallScore: number;
  overallConfidence: number;
}

export interface FinalDecisionResponse {
  request: string;
  objective: string;
  decisionType: string;
  recommendationSummary: string;
  verdict: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED' | 'NEEDS_MORE_DATA';
  confidenceScore: number;
  explainability: {
    selectedEngines: EngineExplanation[];
    executionPlanId: string;
    stageBreakdown: string[];
  };
  aggregatedResult: AggregatedDecisionResult;
  timestamp: string;
}

@Injectable({ deps: [AIService] })
export class RecommendationBuilderService {
  constructor(private readonly aiService?: AIService) {}
  /**
   * Primary analysis interface for the Decision Orchestrator.
   */
  public async analyze(context: any, engineResults: any): Promise<RecommendationEngineResult> {
    const ai = this.aiService || new AIService();
    const prompt = `Synthesize a recommendation for the decision context using all four upstream analyses. Do not independently invent evidence. Reconcile contradictions, cite uncertainty in the executive summary, and make next steps actionable. Context:\n${JSON.stringify(context, null, 2)}\nUpstream outputs:\n${JSON.stringify(engineResults, null, 2)}`;
    const result = await ai.generateStructuredJson<RecommendationEngineResult>(prompt, 'You are DecisionOS Recommendation Engine. Return only valid JSON. Base the verdict on the supplied research, market, finance, and risk outputs. If key information is missing, use NEEDS_MORE_DATA.', this.schema());
    const confidence = this.score(result.overallConfidence ?? result.overallScore);
    return { ...result, pros: result.pros || [], cons: result.cons || [], nextSteps: result.nextSteps || [], alternativeOptions: result.alternativeOptions || [], overallScore: this.score(result.overallScore), overallConfidence: confidence };
  }

  private schema(): Record<string, any> {
    return { type: 'OBJECT', properties: { verdict: { type: 'STRING', enum: ['PROCEED', 'PROCEED_WITH_CAUTION', 'DO_NOT_PROCEED', 'NEEDS_MORE_DATA'] }, executiveSummary: { type: 'STRING' }, pros: { type: 'ARRAY', items: { type: 'STRING' } }, cons: { type: 'ARRAY', items: { type: 'STRING' } }, nextSteps: { type: 'ARRAY', items: { type: 'STRING' } }, alternativeOptions: { type: 'ARRAY', items: { type: 'STRING' } }, overallScore: { type: 'INTEGER' }, overallConfidence: { type: 'INTEGER' } }, required: ['verdict', 'executiveSummary', 'pros', 'cons', 'nextSteps', 'alternativeOptions', 'overallScore', 'overallConfidence'] };
  }

  private score(value: number): number { return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0)); }

  /**
   * Synthesizes the final decision response complete with explainability details.
   */
  public buildRecommendation(
    rawRequest: string,
    context: DecisionContext,
    plan: ExecutionPlan,
    aggregatedResult: AggregatedDecisionResult,
    engineExplanations: EngineExplanation[]
  ): FinalDecisionResponse {
    let verdict: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED' | 'NEEDS_MORE_DATA' = 'PROCEED';

    if (aggregatedResult.overallConfidence < 50) {
      verdict = 'NEEDS_MORE_DATA';
    } else if (aggregatedResult.allLimitations.length > 3 || aggregatedResult.overallConfidence < 80) {
      verdict = 'PROCEED_WITH_CAUTION';
    }

    const summaryParts: string[] = [
      `Decision Analysis for: "${rawRequest}"`,
      `Verdict: ${verdict} (Confidence: ${aggregatedResult.overallConfidence}%)`,
      `Engines Analyzed: ${engineExplanations.map((e) => e.engineId).join(', ')}.`
    ];

    if (aggregatedResult.allRecommendations.length > 0) {
      summaryParts.push(`Key Recommendations: ${aggregatedResult.allRecommendations.slice(0, 3).join('; ')}.`);
    }

    const stageBreakdown = plan.steps.map(
      (s) => `${s.engineId} (Depends on: [${s.dependsOn.join(', ')}], Parallel: ${s.runInParallel})`
    );

    return {
      request: rawRequest,
      objective: context.objective,
      decisionType: context.decisionType,
      recommendationSummary: summaryParts.join(' '),
      verdict,
      confidenceScore: aggregatedResult.overallConfidence,
      explainability: {
        selectedEngines: engineExplanations,
        executionPlanId: plan.planId,
        stageBreakdown,
      },
      aggregatedResult,
      timestamp: new Date().toISOString(),
    };
  }
}
