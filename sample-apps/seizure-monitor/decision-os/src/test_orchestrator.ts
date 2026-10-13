import { AIService } from './core/ai/ai.service.js';
import { ContextService } from './engines/context/context.service.js';
import { ResearchService } from './engines/research/research.service.js';
import { MarketService } from './engines/market/market.service.js';
import { FinanceService } from './engines/finance/finance.service.js';
import { RiskService } from './engines/risk/risk.service.js';
import { RecommendationBuilderService } from './core/decision-orchestrator/services/recommendation-builder.service.js';
import { DecisionOrchestratorService } from './core/decision-orchestrator/decision-orchestrator.service.js';

async function testOrchestrator() {
  const ai = new AIService();
  const contextService = new ContextService(ai);
  const researchService = new ResearchService();
  const marketService = new MarketService();
  const financeService = new FinanceService();
  const riskService = new RiskService();
  const recBuilder = new RecommendationBuilderService();

  const orchestrator = new DecisionOrchestratorService(
    contextService,
    researchService,
    marketService,
    financeService,
    riskService,
    recBuilder
  );

  console.error('[TEST] Running analyzeDecision...');
  const report = await orchestrator.analyzeDecision({
    request: 'Should I quit my software job and start a SaaS company?'
  });

  console.error('[TEST] DecisionReport Output:');
  console.error(JSON.stringify(report, null, 2));
}

testOrchestrator();
