import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SecurityModule } from './modules/security/security.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 *
 * Bootstraps the TASIE MCP server: a thin MCP surface over the TASIE
 * FastAPI security backend (detection + live exploit + human-gated remediation).
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'tasie-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [ConfigModule.forRoot(), SecurityModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}
