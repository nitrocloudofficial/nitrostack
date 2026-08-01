import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { EodModule } from './modules/eod/eod.module.js';
import { GitHubModule } from './modules/github/github.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { InsightsModule } from './modules/insights/insights.module.js';
import { DemoModule } from './modules/demo/demo.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { GitHubHealthCheck } from './health/github.health.js';
import { StorageHealthCheck } from './health/storage.health.js';

/**
 * GroundTruth — AI agent for EOD-driven team intelligence.
 *
 * Modules, split by what each is responsible for:
 *   eod       — what employees say they did, plus the agent's review loop
 *   github    — what actually happened, per the GitHub API
 *   alerts    — how the agent escalates to a human
 *   insights  — analysis spanning days and people (trends, search, Q&A)
 *   demo      — seeding helpers; the one module a real deployment would drop
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'groundtruth',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'GroundTruth root application module',
  imports: [
    ConfigModule.forRoot(),
    EodModule,
    GitHubModule,
    AlertsModule,
    InsightsModule,
    DemoModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
    GitHubHealthCheck,
    StorageHealthCheck,
  ]
})
export class AppModule {}
