import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PipelineModule } from './modules/pipeline/pipeline.module.js';
import { IntentModule } from './modules/intent/intent.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';
import { DecisionModule } from './modules/decision/decision.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'aeios-x-server',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'AEIOS-X Autonomous Enterprise Intelligence Operating System',
  imports: [
    ConfigModule.forRoot(),
    PipelineModule,
    IntentModule,
    AgentsModule,
    KnowledgeModule,
    DecisionModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
