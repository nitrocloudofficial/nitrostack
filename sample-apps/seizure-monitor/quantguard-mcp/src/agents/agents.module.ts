import { Module } from '@nitrostack/core';
import { ScaffoldNitrostackProjectTools } from './scaffold-nitrostack-project.tool.js';
import { StartDevServerTools } from './start-dev-server.tool.js';
import { LlmService } from './llm.service.js';
import { OrchestratorService } from './orchestrator.service.js';
import { AgentsTools } from './agents.tools.js';
import { AgentsPrompts } from './agents.prompts.js';

import { DbModule } from '../db/db.module.js';
import { MarketModule } from '../market/market.module.js';
import { OrderbookModule } from '../orderbook/orderbook.module.js';
import { RiskModule } from '../risk/risk.module.js';
import { NewsModule } from '../news/news.module.js';
import { StrategyModule } from '../strategy/strategy.module.js';

/**
 * AgentsModule — multi-agent orchestration and decision-making
 */
@Module({
  name: 'agents',
  description: 'Multi-agent orchestration, decision-making, and coordination',
  imports: [
    DbModule,
    MarketModule,
    OrderbookModule,
    RiskModule,
    NewsModule,
    StrategyModule
  ],
  providers: [LlmService, OrchestratorService],
  controllers: [
    AgentsTools,
    AgentsPrompts,
    ScaffoldNitrostackProjectTools,
    StartDevServerTools
  ],
  exports: [OrchestratorService]
})
export class AgentsModule {}
