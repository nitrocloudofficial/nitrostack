import { Injectable } from '@nitrostack/core';
import { AIService } from '../../core/ai/ai.service.js';
import { IEnginePlugin, EngineMetadata, EngineRequest } from '../../shared/contracts/engine.interface.js';
import { StandardEngineOutput } from '../../shared/types/standard-engine-output.js';
import { EstimateCostArgs, CalculateROIArgs, EstimateRevenueArgs } from './finance.types.js';

export interface FinanceEngineResult {
  estimatedCost: string; estimatedRevenue: string; netRoi: string; breakEvenMonths: number | null;
  capitalRequired: string; startupCost: string; operatingCost: string; revenue: string; roi: string;
  assumptions: string[]; additionalInformationRequired: string[]; confidence: number;
}

@Injectable({ deps: [AIService] })
export class FinanceService implements IEnginePlugin {
  constructor(private readonly aiService?: AIService) {}
  public getMetadata(): EngineMetadata { return { engineId: 'finance-engine', capabilities: ['calculate-roi', 'estimate-cost', 'estimate-revenue'], supportedDomains: ['finance', 'business', 'investment'], requiredInputs: ['budget', 'objective'], producedOutputs: ['roi', 'estimatedCost', 'estimatedRevenue'], executionPriority: 20, dependencies: [], parallelExecutionCapability: true, version: '1.0.0', healthStatus: 'HEALTHY' }; }

  public async analyze(context: any): Promise<FinanceEngineResult> {
    const ai = this.aiService || new AIService();
    const budgetNote = context?.budget == null ? 'Budget is missing. Do not invent exact amounts; return assumptions and the additional information required.' : `Available budget: ${context.budget}`;
    const prompt = `Analyze financial feasibility for this decision context. Estimate startup cost, operating cost, revenue, ROI, break-even, and capital required using ranges or clearly labeled scenarios. ${budgetNote} Every numeric estimate must state its assumptions and confidence. Context:\n${JSON.stringify(context, null, 2)}`;
    const result = await ai.generateStructuredJson<FinanceEngineResult>(prompt, 'You are DecisionOS Finance Engine. Return only valid JSON. Never invent exact financial values without assumptions. If inputs are insufficient, say so explicitly and list what is needed.', this.schema());
    const missingBudget = context?.budget == null;
    return { ...result, startupCost: result.startupCost || result.estimatedCost, operatingCost: result.operatingCost || 'Insufficient data', revenue: result.revenue || result.estimatedRevenue, roi: result.roi || result.netRoi, estimatedCost: result.estimatedCost || result.startupCost, estimatedRevenue: result.estimatedRevenue || result.revenue, netRoi: result.netRoi || result.roi, breakEvenMonths: typeof result.breakEvenMonths === 'number' ? result.breakEvenMonths : null, assumptions: result.assumptions || [], additionalInformationRequired: missingBudget ? [...new Set([...(result.additionalInformationRequired || []), 'Available budget or funding limit'])] : (result.additionalInformationRequired || []), confidence: this.score(result.confidence) };
  }

  public async execute(request: EngineRequest): Promise<StandardEngineOutput> { const started = Date.now(); const a = await this.analyze(request.context); return { engineName: 'finance-engine', confidence: a.confidence, summary: `Financial feasibility analysis completed. ROI: ${a.roi}`, structuredFindings: { startupCost: a.startupCost, operatingCost: a.operatingCost, revenue: a.revenue, roi: a.roi, breakEvenMonths: a.breakEvenMonths, capitalRequired: a.capitalRequired }, assumptions: a.assumptions, limitations: a.additionalInformationRequired, recommendations: [], metadata: { executionTimeMs: Date.now() - started, toolsUsed: ['Gemini'], version: '1.0.0' } }; }
  public async estimateCost(args: EstimateCostArgs) {
    const ai = this.aiService || new AIService();
    return ai.generateStructuredJson(
      `Estimate project costs for this scope: ${args.projectScope}. Required resources: ${JSON.stringify(args.resourcesRequired)}. Provide ranges, assumptions, and items that need a real quote.`,
      'You are a finance analyst. Return only valid JSON. Do not present estimates as quotes or verified prices. State the currency only when supplied; otherwise use currency-neutral ranges.',
      {
        type: 'OBJECT', properties: {
          projectScope: { type: 'STRING' }, estimatedCostRange: { type: 'STRING' }, costDrivers: { type: 'ARRAY', items: { type: 'STRING' } },
          assumptions: { type: 'ARRAY', items: { type: 'STRING' } }, itemsToQuote: { type: 'ARRAY', items: { type: 'STRING' } }, confidence: { type: 'INTEGER' },
        }, required: ['projectScope', 'estimatedCostRange', 'costDrivers', 'assumptions', 'itemsToQuote', 'confidence'],
      },
    );
  }

  public calculateROI(args: CalculateROIArgs) {
    const netProfit = args.projectedRevenue - args.totalInvestment;
    const roiPercentage = (netProfit / args.totalInvestment) * 100;
    return {
      totalInvestment: args.totalInvestment,
      projectedRevenue: args.projectedRevenue,
      netProfit,
      roiPercentage: Number(roiPercentage.toFixed(2)),
      breakEvenRevenue: args.totalInvestment,
      profitable: netProfit > 0,
    };
  }

  public estimateRevenue(args: EstimateRevenueArgs) {
    const projectedRevenue = args.marketSize * args.expectedMarketShare;
    return {
      marketSize: args.marketSize,
      expectedMarketShare: args.expectedMarketShare,
      projectedRevenue: Number(projectedRevenue.toFixed(2)),
      assumption: 'This is market size multiplied by expected share; it is not a forecast and excludes timing, costs, and addressability constraints.',
    };
  }
  private schema(): Record<string, any> { return { type: 'OBJECT', properties: { estimatedCost: { type: 'STRING' }, estimatedRevenue: { type: 'STRING' }, netRoi: { type: 'STRING' }, breakEvenMonths: { type: 'INTEGER', nullable: true }, capitalRequired: { type: 'STRING' }, startupCost: { type: 'STRING' }, operatingCost: { type: 'STRING' }, revenue: { type: 'STRING' }, roi: { type: 'STRING' }, assumptions: { type: 'ARRAY', items: { type: 'STRING' } }, additionalInformationRequired: { type: 'ARRAY', items: { type: 'STRING' } }, confidence: { type: 'INTEGER' } }, required: ['estimatedCost', 'estimatedRevenue', 'netRoi', 'breakEvenMonths', 'capitalRequired', 'startupCost', 'operatingCost', 'revenue', 'roi', 'assumptions', 'additionalInformationRequired', 'confidence'] }; }
  private score(value: number): number { return Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0)); }
}
