import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { KnowledgeIntegrityModule } from './modules/knowledge/knowledge.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'knowledge-integrity-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Enterprise Knowledge Integrity MCP Server — detects knowledge contradictions, traces dependencies, and manages remediation with human approval.',
  imports: [
    ConfigModule.forRoot(),
    KnowledgeIntegrityModule,
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
