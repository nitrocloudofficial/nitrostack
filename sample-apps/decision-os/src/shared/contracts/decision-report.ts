import { DecisionContext } from './decision-context.js';
import { GeminiContextOutput } from '../../engines/context/context.service.js';
import { ResearchEngineResult } from '../../engines/research/research.service.js';
import { MarketEngineResult } from '../../engines/market/market.service.js';
import { FinanceEngineResult } from '../../engines/finance/finance.service.js';
import { RiskEngineResult } from '../../engines/risk/risk.service.js';
import { RecommendationEngineResult } from '../../core/decision-orchestrator/services/recommendation-builder.service.js';

export interface DecisionReportMetadata {
  executionTime: number;
  enginesExecuted: string[];
  failedEngines?: string[];
  errors?: Record<string, string>;
  failedEngine?: string;
  errorMessage?: string;
  stack?: string;
  failureDetails?: Record<string, { file?: string; line?: number; column?: number; message: string; stack: string }>;
  confidence: number;
}

export interface DecisionReport {
  context: DecisionContext & GeminiContextOutput;
  research: ResearchEngineResult;
  market: MarketEngineResult;
  finance: FinanceEngineResult;
  risk: RiskEngineResult;
  recommendation: RecommendationEngineResult;
  metadata: DecisionReportMetadata;
}
