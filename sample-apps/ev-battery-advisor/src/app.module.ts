import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { RequirementAnalysisModule } from './modules/requirement-analysis/requirement-analysis.module.js';
import { MaterialRecommendationModule } from './modules/material-recommendation/material-recommendation.module.js';
import { DigitalTwinSimulationModule } from './modules/digital-twin-simulation/digital-twin-simulation.module.js';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module.js';
import { DecisionReportingModule } from './modules/decision-reporting/decision-reporting.module.js';

/**
 * Root Application Module
 *
 * EV Battery Material Advisor — Agentic decision-support for EV battery
 * material selection across 5 cooperating modules:
 * - RequirementAnalysisModule  : NLP → structured weighted requirements
 * - MaterialRecommendationModule: Pareto-optimal material ranking + SHAP explainability
 * - DigitalTwinSimulationModule : P2D-DFN electrochemical + thermal + mechanical simulation
 * - KnowledgeBaseModule         : Continuously-updated materials KB + feedback loop
 * - DecisionReportingModule     : TOPSIS final ranking + interactive dashboards
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'mcp-server',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'app',
    description: 'EV Battery Material Advisor MCP server',
    imports: [
        ConfigModule.forRoot(),
        // ── EV Battery Material Advisor modules (5-agent pipeline) ────────────
        RequirementAnalysisModule,
        MaterialRecommendationModule,
        DigitalTwinSimulationModule,
        KnowledgeBaseModule,
        DecisionReportingModule,
    ],
})
export class AppModule { }

