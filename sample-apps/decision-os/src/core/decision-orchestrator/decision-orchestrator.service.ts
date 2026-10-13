import { Injectable } from '@nitrostack/core';
import { ContextService } from '../../engines/context/context.service.js';
import { ResearchService } from '../../engines/research/research.service.js';
import { MarketService } from '../../engines/market/market.service.js';
import { FinanceService } from '../../engines/finance/finance.service.js';
import { RiskService } from '../../engines/risk/risk.service.js';
import { RecommendationBuilderService } from './services/recommendation-builder.service.js';
import { EngineRegistryService } from './services/engine-registry.service.js';
import { EngineDispatcherService } from './services/engine-dispatcher.service.js';
import { ResultAggregatorService } from './services/result-aggregator.service.js';
import { DecisionReport } from '../../shared/contracts/decision-report.js';
import { ExecutionPlan, ExecutionPlanNode } from '../../shared/contracts/execution-plan.js';
import { 
  ClassifyDecisionArgs, 
  CreateExecutionPlanArgs, 
  ValidateExecutionPlanArgs,
  ExecuteDecisionPipelineArgs,
  AnalyzeDecisionArgs
} from './decision-orchestrator.types.js';

@Injectable({
  deps: [
    ContextService,
    ResearchService,
    MarketService,
    FinanceService,
    RiskService,
    RecommendationBuilderService,
    EngineRegistryService,
    EngineDispatcherService,
    ResultAggregatorService
  ]
})
export class DecisionOrchestratorService {
  constructor(
    private readonly contextService: ContextService,
    private readonly researchService: ResearchService,
    private readonly marketService: MarketService,
    private readonly financeService: FinanceService,
    private readonly riskService: RiskService,
    private readonly recommendationService: RecommendationBuilderService,
    private readonly engineRegistry?: EngineRegistryService,
    private readonly engineDispatcher?: EngineDispatcherService,
    private readonly resultAggregator?: ResultAggregatorService
  ) {}

  /**
   * Main Orchestrator method: Accepts raw request, extracts context, executes clean pipeline,
   * aggregates engine outputs, and returns one structured DecisionReport.
   */
  public async analyzeDecision(args?: AnalyzeDecisionArgs): Promise<DecisionReport> {
    const rawReq =
      args?.request ||
      (typeof args === 'string' ? args : '') ||
      (args && typeof (args as any).query === 'string' ? (args as any).query : '') ||
      (args && typeof (args as any).input === 'string' ? (args as any).input : '') ||
      'General Decision Request';
    const startTime = Date.now();
    const enginesExecuted: string[] = [];
    const failedEngines: string[] = [];
    const errors: Record<string, string> = {};
    let context!: Awaited<ReturnType<ContextService['extractContext']>>;
    let researchResult: Awaited<ReturnType<ResearchService['analyze']>> = this.emptyResearch();
    let marketResult: Awaited<ReturnType<MarketService['analyze']>> = this.emptyMarket();
    let financeResult: Awaited<ReturnType<FinanceService['analyze']>> = this.emptyFinance();
    let riskResult: Awaited<ReturnType<RiskService['analyze']>> = this.emptyRisk();
    let recommendationResult: Awaited<ReturnType<RecommendationBuilderService['analyze']>> = this.emptyRecommendation(rawReq);

    const toErrorMessage = (error: unknown) =>
      error instanceof Error ? error.message : String(error);

    const logEngineFailure = (engineName: string, error: unknown) => {
      console.error(`${engineName} FAILED`);
      console.error('Error message');
      console.error(toErrorMessage(error));
      console.error('Stack trace');
      console.error(error instanceof Error ? error.stack : undefined);
      console.error(error);
      failedEngines.push(engineName);
      errors[engineName] = toErrorMessage(error);
    };

    try {
      console.error('===== Decision Started =====');

      try {
        console.error('Running Context Engine...');
        context = await this.contextService.extractContext({ request: rawReq });
        if (!context.objective) {
          throw new Error('Extracted decision context is invalid: Missing objective.');
        }
        enginesExecuted.push('context-engine');
      } catch (error: unknown) {
        logEngineFailure('Context Engine', error);
        throw error;
      }

      // Independent engines run in parallel to reduce NitroStudio timeout risk.
      console.error('Running Research / Market / Finance engines in parallel...');
      const [researchOutcome, marketOutcome, financeOutcome] = await Promise.all([
        this.researchService.analyze(context).then(
          (result) => ({ ok: true as const, result }),
          (error: unknown) => ({ ok: false as const, error })
        ),
        this.marketService.analyze(context).then(
          (result) => ({ ok: true as const, result }),
          (error: unknown) => ({ ok: false as const, error })
        ),
        this.financeService.analyze(context).then(
          (result) => ({ ok: true as const, result }),
          (error: unknown) => ({ ok: false as const, error })
        ),
      ]);

      if (researchOutcome.ok) {
        researchResult = researchOutcome.result;
        enginesExecuted.push('research-engine');
      } else {
        logEngineFailure('Research Engine', researchOutcome.error);
      }

      if (marketOutcome.ok) {
        marketResult = marketOutcome.result;
        enginesExecuted.push('market-engine');
      } else {
        logEngineFailure('Market Engine', marketOutcome.error);
      }

      if (financeOutcome.ok) {
        financeResult = financeOutcome.result;
        enginesExecuted.push('finance-engine');
      } else {
        logEngineFailure('Finance Engine', financeOutcome.error);
      }

      try {
        console.error('Running Risk Engine...');
        riskResult = await this.riskService.analyze(context);
        enginesExecuted.push('risk-engine');
      } catch (error: unknown) {
        logEngineFailure('Risk Engine', error);
      }

      try {
        console.error('Running Recommendation Engine...');
        recommendationResult = await this.recommendationService.analyze(context, {
          research: researchResult,
          market: marketResult,
          finance: financeResult,
          risk: riskResult,
        });
        enginesExecuted.push('recommendation-engine');
      } catch (error: unknown) {
        logEngineFailure('Recommendation Engine', error);
        recommendationResult = this.emptyRecommendation(
          context.objective || rawReq,
          `Upstream engine failures: ${failedEngines.join(', ') || 'unknown'}. ${toErrorMessage(error)}`
        );
      }

      const executionTime = Date.now() - startTime;
      const confidences = [
        context.confidenceScore || context.confidence,
        researchResult.confidence,
        marketResult.confidence,
        financeResult.confidence,
        riskResult.confidence,
        recommendationResult.overallConfidence,
      ].filter((confidence): confidence is number => typeof confidence === 'number');

      return {
        context,
        research: researchResult,
        market: marketResult,
        finance: financeResult,
        risk: riskResult,
        recommendation: recommendationResult,
        metadata: {
          executionTime,
          enginesExecuted,
          failedEngines: failedEngines.length > 0 ? failedEngines : undefined,
          errors: Object.keys(errors).length > 0 ? errors : undefined,
          confidence: confidences.length > 0
            ? Math.round(confidences.reduce((total, confidence) => total + confidence, 0) / confidences.length)
            : 0,
        },
      };
    } catch (error: unknown) {
      console.error(error);
      console.error(error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      console.error('===== Decision Finished =====');
    }
  }

  private emptyResearch(): Awaited<ReturnType<ResearchService['analyze']>> {
    return {
      summary: 'Research engine unavailable for this run.',
      industryOverview: 'Unavailable',
      currentTrends: [],
      supportingFacts: [],
      opportunities: [],
      uncertainties: ['Research engine failed or was skipped.'],
      confidence: 0,
      keyFindings: [],
      sourcesCount: 0,
      verifiedClaims: [],
      dataGaps: ['research'],
    };
  }

  private emptyMarket(): Awaited<ReturnType<MarketService['analyze']>> {
    return {
      targetIndustry: 'Unavailable',
      demand: 'Unavailable',
      competition: 'Unavailable',
      growth: 'Unavailable',
      TAM: 'Unavailable',
      SAM: 'Unavailable',
      SOM: 'Unavailable',
      growthRate: 'Unavailable',
      competitorAnalysis: [],
      demandScore: 0,
      confidence: 0,
      estimatesAreApproximate: true,
      assumptions: [],
      uncertainties: ['Market engine failed or was skipped.'],
    };
  }

  private emptyFinance(): Awaited<ReturnType<FinanceService['analyze']>> {
    return {
      estimatedCost: 'Unavailable',
      estimatedRevenue: 'Unavailable',
      netRoi: 'Unavailable',
      breakEvenMonths: null,
      capitalRequired: 'Unavailable',
      startupCost: 'Unavailable',
      operatingCost: 'Unavailable',
      revenue: 'Unavailable',
      roi: 'Unavailable',
      assumptions: [],
      additionalInformationRequired: ['Finance engine failed or was skipped.'],
      confidence: 0,
    };
  }

  private emptyRisk(): Awaited<ReturnType<RiskService['analyze']>> {
    return {
      overallRiskLevel: 'HIGH',
      riskScore: 0,
      identifiedRisks: [],
      mitigationPlan: [],
      confidence: 0,
    };
  }

  private emptyRecommendation(objective: string, reason?: string): Awaited<ReturnType<RecommendationBuilderService['analyze']>> {
    return {
      verdict: 'NEEDS_MORE_DATA',
      executiveSummary: reason
        ? `Could not fully synthesize a recommendation for "${objective}". ${reason}`
        : `Could not fully synthesize a recommendation for "${objective}".`,
      pros: [],
      cons: [],
      nextSteps: ['Retry analyzeDecision after the AI provider rate limit resets.', 'Provide any missing budget, location, or timeframe details.'],
      alternativeOptions: ['Gather more data', 'Re-run with a narrower question'],
      overallScore: 0,
      overallConfidence: 0,
    };
  }

  public async classifyDecision(args: ClassifyDecisionArgs): Promise<{ type: string; domains: string[]; objective: string; confidence: number }> {
    const context = await this.contextService.extractContext({ request: args.request });
    return {
      type: context.decisionType,
      domains: this.domainsForDecision(context.decisionType),
      objective: context.objective,
      confidence: context.confidence,
    };
  }

  public createExecutionPlan(args: CreateExecutionPlanArgs): ExecutionPlan {
    const registeredEngines = this.engineRegistry?.listAvailableEngines() || [];
    const requestedDomains = new Set((args.domains?.length ? args.domains : ['research', 'market', 'finance', 'risk']).map((domain) => domain.toLowerCase()));
    const engineDomainMap: Record<string, string[]> = {
      'research-engine': ['research', 'general', 'business'],
      'market-engine': ['market', 'sales', 'business'],
      'finance-engine': ['finance', 'investment', 'business'],
      'risk-engine': ['risk', 'legal', 'business'],
    };
    const selectedIds = Object.entries(engineDomainMap)
      .filter(([, domains]) => domains.some((domain) => requestedDomains.has(domain)))
      .map(([engineId]) => engineId);
    const allIds = selectedIds.length ? selectedIds : ['research-engine', 'market-engine', 'finance-engine', 'risk-engine'];
    const sortedEngines = registeredEngines
      .filter((engine) => allIds.includes(engine.engineId))
      .sort((a, b) => a.executionPriority - b.executionPriority);
    
    const steps: ExecutionPlanNode[] = sortedEngines.map((engine) => ({
      engineId: engine.engineId,
      dependsOn: engine.dependencies || [],
      runInParallel: (engine.parallelExecutionCapability ?? true) && (engine.dependencies || []).length === 0,
    }));

    return {
      planId: `plan-${Date.now()}`,
      steps: steps.length > 0 ? steps : allIds.map((engineId) => ({
        engineId,
        dependsOn: engineId === 'risk-engine'
          ? ['finance-engine', 'market-engine'].filter((dependency) => allIds.includes(dependency))
          : [],
        runInParallel: engineId !== 'risk-engine',
      })),
      isValid: true,
    };
  }

  public validateExecutionPlan(args: ValidateExecutionPlanArgs): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!args.steps || args.steps.length === 0) {
      errors.push('Execution plan must contain at least one step.');
    }
    const engineIds = new Set(args.steps.map((step) => step.engineId));
    if (engineIds.size !== args.steps.length) {
      errors.push('Execution plan contains duplicate engine IDs.');
    }
    for (const step of args.steps) {
      for (const dependency of step.dependsOn || []) {
        if (!engineIds.has(dependency)) {
          errors.push(`Engine ${step.engineId} depends on missing engine ${dependency}.`);
        }
        if (dependency === step.engineId) {
          errors.push(`Engine ${step.engineId} cannot depend on itself.`);
        }
      }
    }
    if (!errors.length && this.hasCycle(args.steps)) {
      errors.push('Execution plan contains a circular dependency.');
    }
    return { isValid: errors.length === 0, errors };
  }

  private domainsForDecision(decisionType: string): string[] {
    const normalized = decisionType.toLowerCase();
    if (normalized.includes('financial') || normalized.includes('investment')) return ['finance', 'risk', 'research'];
    if (normalized.includes('market') || normalized.includes('sales')) return ['market', 'research', 'risk'];
    if (normalized.includes('legal')) return ['risk', 'research'];
    return ['research', 'market', 'finance', 'risk'];
  }

  private hasCycle(steps: ValidateExecutionPlanArgs['steps']): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const dependencies = new Map(steps.map((step) => [step.engineId, step.dependsOn || []]));
    const visit = (engineId: string): boolean => {
      if (visiting.has(engineId)) return true;
      if (visited.has(engineId)) return false;
      visiting.add(engineId);
      for (const dependency of dependencies.get(engineId) || []) {
        if (dependencies.has(dependency) && visit(dependency)) return true;
      }
      visiting.delete(engineId);
      visited.add(engineId);
      return false;
    };
    return steps.some((step) => visit(step.engineId));
  }

  public async executePipeline(args?: ExecuteDecisionPipelineArgs): Promise<any> {
    return this.analyzeDecision(args);
  }
}
