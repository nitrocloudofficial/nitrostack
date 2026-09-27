import { McpApp, Module, ConfigModule as NitroConfigModule } from '@nitrostack/core';
import { ConfigModule } from './config/config.module.js';
import { SharedModule } from './shared/shared.module.js';
import { DatabaseModule } from './database/database.module.js';
import { MemoryModule } from './modules/memory/memory.module.js';
import { RepositoryIntelligenceModule } from './modules/repository-intelligence/intelligence.module.js';
import { GithubModule } from './modules/github/github.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { DocumentModule } from './modules/documents/document.module.js';
import { ResourcesModule } from './resources/resources.module.js';
import { PromptsModule } from './prompts/prompts.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 *
 * Main module bootstrapping DawnMCP server.
 * Registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'dawn-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'DawnMCP Root Application Module',
  imports: [
    NitroConfigModule.forRoot(),
    ConfigModule,
    SharedModule,
    DatabaseModule,
    MemoryModule,
    RepositoryIntelligenceModule,
    //GithubModule,
    AgentsModule,
    DocumentModule,
    ResourcesModule,
    //PromptsModule,
  ],
  providers: [SystemHealthCheck],
})
export class AppModule { }
