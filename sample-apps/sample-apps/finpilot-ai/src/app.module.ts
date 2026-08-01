import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IngestionModule } from './modules/ingestion/ingestion.module.js';
import { CategorizeModule } from './modules/categorize/categorize.module.js';
import { AnalysisModule } from './modules/analysis/analysis.module.js';
import { RiskModule } from './modules/risk/risk.module.js';
import { SavingsModule } from './modules/savings/savings.module.js';
import { GoalsModule } from './modules/goals/goals.module.js';
import { InvestmentModule } from './modules/investment/investment.module.js';
import { HealthScoreModule } from './modules/health-score/health-score.module.js';
import { InsightsModule } from './modules/insights/insights.module.js';
import { GroupExpensesModule } from './modules/group-expenses/group-expenses.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { BehaviourModule } from './modules/behaviour/behaviour.module.js';
import { HealthInsuranceModule } from './modules/health-insurance/health-insurance.module.js';
import { SimulationModule } from './modules/simulation/simulation.module.js';
import { PromptsModule } from './modules/prompts/prompts.module.js';

import { DecisionModule } from './modules/decision/decision.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';
import { ReflectionModule } from './modules/reflection/reflection.module.js';
import { PlannerModule } from './modules/planner/planner.module.js';

import { DecisionService } from './modules/decision/decision.service.js';
import { WorkflowService } from './modules/workflow/workflow.service.js';
import { ReflectionService } from './modules/reflection/reflection.service.js';
import { PlannerService } from './modules/planner/planner.service.js';
import { FinanceStore } from './services/finance-store.service.js';

/**
 * Root Application Module — FinPilot AI Agentic Architecture (v2)
 *
 * Configured with dynamic transport for NitroStack Cloud & Local STDIO:
 * - Local: Defaults to dual/stdio mode.
 * - NitroStack Cloud: Automatically binds to process.env.PORT on 0.0.0.0.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'finpilot-ai',
    version: '2.0.0',
  },
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'error',
  },
  transport: {
    type: (process.env.NITROSTACK_TRANSPORT as any) || (process.env.PORT ? 'dual' : 'stdio'),
    http: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      host: '0.0.0.0',
    },
  },
})
@Module({
  name: 'app',
  description: 'FinPilot AI — Agentic Architecture root module',
  imports: [
    ConfigModule.forRoot(),
    IngestionModule,
    CategorizeModule,
    AnalysisModule,
    RiskModule,
    SavingsModule,
    GoalsModule,
    InvestmentModule,
    HealthScoreModule,
    InsightsModule,
    GroupExpensesModule,
    NotificationModule,
    CalendarModule,
    MarketplaceModule,
    BehaviourModule,
    HealthInsuranceModule,
    SimulationModule,
    PromptsModule,
    DecisionModule,
    WorkflowModule,
    ReflectionModule,
    PlannerModule,
  ],
  providers: [FinanceStore, DecisionService, WorkflowService, ReflectionService, PlannerService],
})
export class AppModule {}
