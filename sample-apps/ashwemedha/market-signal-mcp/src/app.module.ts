import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ScoutModule }                from './modules/scout/scout.module.js';
import { AnalystModule }              from './modules/analyst/analyst.module.js';
import { SkepticModule }              from './modules/skeptic/skeptic.module.js';
import { VideoIngestModule }          from './modules/video-ingest/video-ingest.module.js';
import { SignalValidationModule }     from './modules/signal-validation/signal-validation.module.js';
import { PredictorCredibilityModule } from './modules/predictor-credibility/predictor-credibility.module.js';
import { VideoVerdictModule }         from './modules/video-verdict/video-verdict.module.js';
import { SystemHealthCheck }          from './health/system.health.js';

/**
 * Root Application Module — Multi-Agent Market Signal MCP Server
 *
 * Three-agent adversarial pipeline (blackboard architecture):
 *   Scout  → findings_board  → Analyst → signal_log → Skeptic → verdict_log → Widget
 *
 * All agents communicate through shared MCP Resources, NOT direct calls.
 * This is a deliberate "blackboard architecture" pattern — mention this to judges.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'market-signal-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Multi-agent market signal MCP server — Scout, Analyst, Skeptic agents coordinated through shared Resources',
  imports: [
    ConfigModule.forRoot(),
    ScoutModule,        // Phase 1 — Scout: news ingestion + findings_board
    AnalystModule,      // Phase 1 — Analyst: price/volume cross-check + signal_log
    SkepticModule,      // Phase 1 — Skeptic: adversarial checks + verdict_log
    VideoIngestModule,          // Phase 2 — Person 1: URL → transcript → StockClaim
    SignalValidationModule,     // Phase 2 — Person 2: calendar events + historical correlation
    PredictorCredibilityModule, // Phase 2 — Person 3: social profile + backtest accuracy
    VideoVerdictModule,         // Phase 2 — Person 4: aggregate all scores → VideoVerdict
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}

