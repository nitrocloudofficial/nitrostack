import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { DatasetsModule } from './modules/datasets/datasets.module.js';
import { MlClientModule } from './modules/ml-client/ml-client.module.js';
import { AnalysisModule } from './modules/analysis/analysis.module.js';
import { HelpModule } from './modules/help/help.module.js';

/**
 * Root module for the Seer MCP server.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'seer',
    version: '0.1.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    MlClientModule,
    DatasetsModule,
    AnalysisModule,
    HelpModule,
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
