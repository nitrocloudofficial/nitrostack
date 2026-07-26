import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PipelineModule } from './modules/pipeline/pipeline.module.js';
import { IntentModule } from './modules/intent/intent.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';
import { DecisionModule } from './modules/decision/decision.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'aeios-x',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'AEIOS-X Root Application Module',
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    PipelineModule,
    IntentModule,
    AgentsModule,
    KnowledgeModule,
    DecisionModule,
  ],
})
export class AppModule {}
