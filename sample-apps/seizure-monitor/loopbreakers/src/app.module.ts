import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SecurityModule } from './modules/security/security.module.js';
import { ComplianceModule } from './modules/compliance/compliance.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { ArbitrationModule } from './modules/arbitration/arbitration.module.js';
import { CoordinatorModule } from './modules/coordinator/coordinator.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * Main module that bootstraps the NexusOS Enterprise Incident Response MCP Server.
 * Registers Security, Compliance, Mail, Arbitration, and Coordinator feature modules.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'nexus-os-mcp-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'NexusOS Enterprise Incident Response MCP Root Module',
  imports: [
    ConfigModule.forRoot(),
    SecurityModule,
    ComplianceModule,
    MailModule,
    ArbitrationModule,
    CoordinatorModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
