import { Injectable } from '@nitrostack/core';
import { AIService } from '../../core/ai/ai.service.js';
import { IEnginePlugin, EngineMetadata, EngineRequest } from '../../shared/contracts/engine.interface.js';
import { StandardEngineOutput } from '../../shared/types/standard-engine-output.js';
import { AnalyzeMarketArgs, IdentifyCompetitorsArgs, EstimateDemandArgs } from './market.types.js';

export interface MarketEngineResult {
  targetIndustry: string; demand: string; competition: string; growth: string;
  TAM: string; SAM: string; SOM: string; growthRate: string; competitorAnalysis: string[];
  demandScore: number; confidence: number; estimatesAreApproximate: boolean; assumptions: string[]; uncertainties: string[];
}

@Injectable({ deps: [AIService] })
export class MarketService implements IEnginePlugin {
  constructor(private readonly aiService?: AIService) {}
  public getMetadata(): EngineMetadata { return { engineId: 'market-engine', capabilities: ['market-analysis', 'competitor-analysis', 'demand-estimation'], supportedDomains: ['market', 'business', 'sales'], requiredInputs: ['objective'], producedOutputs: ['marketSize', 'competitors', 'demandScore'], executionPriority: 20, dependencies: [], parallelExecutionCapability: true, version: '1.0.0', healthStatus: 'HEALTHY' }; }

  public async analyze(context: any): Promise<MarketEngineResult> {
    const ai = this.aiService || new AIService();
    const prompt = `Assess the market implications of this decision context. Infer industry, demand, competition, growth, TAM, SAM, and SOM only from the context and transparent assumptions. All market sizes and growth figures must be explicitly marked as estimates; use ranges or 'insufficient data' where appropriate. Context:\n${JSON.stringify(context, null, 2)}`;
    const result = await ai.generateStructuredJson<MarketEngineResult>(prompt, 'You are DecisionOS Market Engine. Return only valid JSON. Never present an estimate as a verified fact and never fabricate certainty or live market data.', this.schema());
    return { ...result, TAM: this.markEstimate(result.TAM), SAM: this.markEstimate(result.SAM), SOM: this.markEstimate(result.SOM), competitorAnalysis: result.competitorAnalysis || [], assumptions: result.assumptions || [], uncertainties: result.uncertainties || [], demandScore: this.score(result.demandScore), confidence: this.score(result.confidence), estimatesAreApproximate: true };
  }

  public async execute(request: EngineRequest): Promise<StandardEngineOutput> { const started = Date.now(); const a = await this.analyze(request.context); return { engineName: 'market-engine', confidence: a.confidence, summary: `Estimated market analysis completed for ${a.targetIndustry}.`, structuredFindings: { industry: a.targetIndustry, demand: a.demand, competition: a.competition, growth: a.growth, TAM: a.TAM, SAM: a.SAM, SOM: a.SOM, competitors: a.competitorAnalysis, demandScore: a.demandScore, estimatesAreApproximate: true }, assumptions: a.assumptions, limitations: a.uncertainties, recommendations: [], metadata: { executionTimeMs: Date.now() - started, toolsUsed: ['Gemini'], version: '1.0.0' } }; }
  public async analyzeMarket(args: AnalyzeMarketArgs) {
    const ai = this.aiService || new AIService();
    return ai.generateStructuredJson(
      `Analyze the market for the ${args.industry} industry${args.location ? ` in ${args.location}` : ''}. Provide a decision-oriented qualitative assessment and assumptions that need validation.`,
      'You are a market analyst. Return only valid JSON. Do not claim live market research, current statistics, or local facts. Label all estimates and uncertainty.',
      {
        type: 'OBJECT', properties: {
          industry: { type: 'STRING' }, location: { type: 'STRING', nullable: true }, marketAssessment: { type: 'STRING' },
          demandSignals: { type: 'ARRAY', items: { type: 'STRING' } }, competitiveFactors: { type: 'ARRAY', items: { type: 'STRING' } },
          opportunities: { type: 'ARRAY', items: { type: 'STRING' } }, assumptionsToValidate: { type: 'ARRAY', items: { type: 'STRING' } }, confidence: { type: 'INTEGER' },
        }, required: ['industry', 'location', 'marketAssessment', 'demandSignals', 'competitiveFactors', 'opportunities', 'assumptionsToValidate', 'confidence'],
      },
    );
  }

  public async identifyCompetitors(args: IdentifyCompetitorsArgs) {
    const ai = this.aiService || new AIService();
    return ai.generateStructuredJson(
      `List competitor categories and likely competitive alternatives for ${args.industry}${args.location ? ` in ${args.location}` : ''}.`,
      'You are a market analyst. Return only valid JSON. Do not name real companies unless supplied by the user. Describe categories and how to verify local competitors.',
      {
        type: 'OBJECT', properties: {
          industry: { type: 'STRING' }, location: { type: 'STRING', nullable: true }, competitorCategories: { type: 'ARRAY', items: { type: 'STRING' } },
          differentiationIdeas: { type: 'ARRAY', items: { type: 'STRING' } }, verificationSteps: { type: 'ARRAY', items: { type: 'STRING' } }, limitations: { type: 'ARRAY', items: { type: 'STRING' } },
        }, required: ['industry', 'location', 'competitorCategories', 'differentiationIdeas', 'verificationSteps', 'limitations'],
      },
    );
  }

  public async estimateDemand(args: EstimateDemandArgs) {
    const ai = this.aiService || new AIService();
    return ai.generateStructuredJson(
      `Assess demand qualitatively for ${args.productType} aimed at ${JSON.stringify(args.targetDemographics)}. Identify signals, barriers, and validation experiments.`,
      'You are a market analyst. Return only valid JSON. Do not invent a numerical demand score or claim access to live customer data.',
      {
        type: 'OBJECT', properties: {
          productType: { type: 'STRING' }, targetDemographics: { type: 'ARRAY', items: { type: 'STRING' } }, demandAssessment: { type: 'STRING' },
          demandSignals: { type: 'ARRAY', items: { type: 'STRING' } }, barriers: { type: 'ARRAY', items: { type: 'STRING' } }, validationExperiments: { type: 'ARRAY', items: { type: 'STRING' } }, confidence: { type: 'INTEGER' },
        }, required: ['productType', 'targetDemographics', 'demandAssessment', 'demandSignals', 'barriers', 'validationExperiments', 'confidence'],
      },
    );
  }

  private schema(): Record<string, any> { return { type: 'OBJECT', properties: { targetIndustry: { type: 'STRING' }, demand: { type: 'STRING' }, competition: { type: 'STRING' }, growth: { type: 'STRING' }, TAM: { type: 'STRING' }, SAM: { type: 'STRING' }, SOM: { type: 'STRING' }, growthRate: { type: 'STRING' }, competitorAnalysis: { type: 'ARRAY', items: { type: 'STRING' } }, demandScore: { type: 'INTEGER' }, confidence: { type: 'INTEGER' }, estimatesAreApproximate: { type: 'BOOLEAN' }, assumptions: { type: 'ARRAY', items: { type: 'STRING' } }, uncertainties: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['targetIndustry', 'demand', 'competition', 'growth', 'TAM', 'SAM', 'SOM', 'growthRate', 'competitorAnalysis', 'demandScore', 'confidence', 'estimatesAreApproximate', 'assumptions', 'uncertainties'] }; }
  private markEstimate(value: string): string { return value?.toLowerCase().includes('estimate') || value?.toLowerCase().includes('insufficient') ? value : `Estimated: ${value}`; }
  private score(value: number): number { return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0)); }
}
