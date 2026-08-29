import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AuditModule } from './audit/audit.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — Auditor Zero MCP server.
 * Registers the audit feature module and the system health check.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'auditor-zero',
    version: '1.0.0'
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
    AuditModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
