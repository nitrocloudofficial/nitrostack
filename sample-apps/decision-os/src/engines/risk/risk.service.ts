import { Injectable } from '@nitrostack/core';
import { AIService } from '../../core/ai/ai.service.js';
import { IEnginePlugin, EngineMetadata, EngineRequest } from '../../shared/contracts/engine.interface.js';
import { StandardEngineOutput } from '../../shared/types/standard-engine-output.js';
import { IdentifyRisksArgs, CalculateRiskScoreArgs, GenerateMitigationPlanArgs } from './risk.types.js';

export interface IdentifiedRisk { hazard: string; probability: 'LOW' | 'MEDIUM' | 'HIGH'; impact: 'LOW' | 'MEDIUM' | 'HIGH'; mitigation: string; }
export interface RiskEngineResult { overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; riskScore: number; identifiedRisks: IdentifiedRisk[]; mitigationPlan: string[]; confidence: number; }

@Injectable({ deps: [AIService] })
export class RiskService implements IEnginePlugin {
  constructor(private readonly aiService?: AIService) {}
  public getMetadata(): EngineMetadata { return { engineId: 'risk-engine', capabilities: ['identify-risks', 'calculate-risk-score', 'generate-mitigations'], supportedDomains: ['risk', 'business', 'legal'], requiredInputs: ['objective'], producedOutputs: ['riskScore', 'mitigationPlan'], executionPriority: 50, dependencies: ['finance-engine', 'market-engine'], parallelExecutionCapability: false, version: '1.0.0', healthStatus: 'HEALTHY' }; }
  public async analyze(context: any): Promise<RiskEngineResult> { const ai = this.aiService || new AIService(); const prompt = `Identify decision-specific risks and practical mitigations. Consider the decision type, objective, entities, constraints, location, budget, timeframe, stakeholders, and missing information. Do not use generic boilerplate; every risk must be traceable to this context. Context:\n${JSON.stringify(context, null, 2)}`; const result = await ai.generateStructuredJson<RiskEngineResult>(prompt, 'You are DecisionOS Risk Engine. Return only valid JSON. Generate dynamic risks for this exact decision, score them conservatively, and explain uncertainty.', this.schema()); return { ...result, identifiedRisks: result.identifiedRisks || [], mitigationPlan: result.mitigationPlan || [], riskScore: this.score(result.riskScore), confidence: this.score(result.confidence) }; }
  public async execute(request: EngineRequest): Promise<StandardEngineOutput> { const started = Date.now(); const a = await this.analyze(request.context); return { engineName: 'risk-engine', confidence: a.confidence, summary: `Risk assessment completed. Overall risk: ${a.overallRiskLevel}`, structuredFindings: { overallRiskLevel: a.overallRiskLevel, riskScore: a.riskScore, identifiedRisks: a.identifiedRisks, mitigationPlan: a.mitigationPlan }, assumptions: [], limitations: [], recommendations: a.mitigationPlan, metadata: { executionTimeMs: Date.now() - started, toolsUsed: ['Gemini'], version: '1.0.0' } }; }
  public async identifyRisks(args: IdentifyRisksArgs) {
    const ai = this.aiService || new AIService();
    return ai.generateStructuredJson(
      `Identify practical risks in ${args.domain} considering these factors: ${JSON.stringify(args.factors)}.`,
      'You are a risk analyst. Return only valid JSON. Make each risk traceable to the supplied factors and do not present legal, financial, or safety advice as professional advice.',
      {
        type: 'OBJECT', properties: {
          domain: { type: 'STRING' }, identifiedRisks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { risk: { type: 'STRING' }, likelihood: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] }, impact: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] }, rationale: { type: 'STRING' } }, required: ['risk', 'likelihood', 'impact', 'rationale'] } },
          assumptions: { type: 'ARRAY', items: { type: 'STRING' } }, limitations: { type: 'ARRAY', items: { type: 'STRING' } },
        }, required: ['domain', 'identifiedRisks', 'assumptions', 'limitations'],
      },
    );
  }

  public calculateRiskScore(args: CalculateRiskScoreArgs) {
    const defaultWeight = 3;
    const weights = args.identifiedRisks.map((risk) => args.severityWeights?.[risk] ?? defaultWeight);
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    const averageWeight = weights.length ? totalWeight / weights.length : 0;
    const riskScore = Math.min(100, Math.round((averageWeight / 5) * 100));
    return {
      identifiedRisks: args.identifiedRisks,
      riskScore,
      level: riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
      methodology: 'Average severity weight on a 0-5 scale, normalized to 0-100. Risks without an explicit weight use 3 (medium).',
      totalWeight,
    };
  }

  public async generateMitigationPlan(args: GenerateMitigationPlanArgs) {
    const ai = this.aiService || new AIService();
    return ai.generateStructuredJson(
      `Create a prioritized mitigation plan for these risks: ${JSON.stringify(args.risks)}.`,
      'You are a risk analyst. Return only valid JSON. Give actionable, proportional mitigations and state when specialist review is required.',
      {
        type: 'OBJECT', properties: {
          mitigations: { type: 'ARRAY', items: { type: 'OBJECT', properties: { risk: { type: 'STRING' }, action: { type: 'STRING' }, priority: { type: 'STRING', enum: ['HIGH', 'MEDIUM', 'LOW'] }, owner: { type: 'STRING' } }, required: ['risk', 'action', 'priority', 'owner'] } },
          monitoringIndicators: { type: 'ARRAY', items: { type: 'STRING' } }, specialistReviewNeeded: { type: 'ARRAY', items: { type: 'STRING' } },
        }, required: ['mitigations', 'monitoringIndicators', 'specialistReviewNeeded'],
      },
    );
  }
  private schema(): Record<string, any> { return { type: 'OBJECT', properties: { overallRiskLevel: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, riskScore: { type: 'INTEGER' }, identifiedRisks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { hazard: { type: 'STRING' }, probability: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] }, impact: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] }, mitigation: { type: 'STRING' } }, required: ['hazard', 'probability', 'impact', 'mitigation'] } }, mitigationPlan: { type: 'ARRAY', items: { type: 'STRING' } }, confidence: { type: 'INTEGER' } }, required: ['overallRiskLevel', 'riskScore', 'identifiedRisks', 'mitigationPlan', 'confidence'] }; }
  private score(value: number): number { return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0)); }
}
