import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PacsModule } from './modules/pacs/pacs.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 *
 * Bootstraps the MCP server for the Autonomous Medical Imaging Diagnosis
 * & Clinical Decision Agent. The only feature module is PacsModule --
 * the typescript-starter calculator boilerplate (arithmetic tools,
 * temperature conversion, its resources, prompts, and result widget) has
 * been removed so the tool surface this server advertises is exactly the
 * one the clinical agent uses. An MCP client discovers tools by calling
 * list_tools; leaving demo tools registered would have offered a
 * clinical agent a calculator it has no business calling.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'medagent-pacs-server',
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
    // PACS bridge -- prior-imaging lookup for the clinical agent.
    PacsModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
