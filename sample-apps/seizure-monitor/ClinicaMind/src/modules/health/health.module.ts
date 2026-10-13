import { Module } from '@nitrostack/core';
import { McpServerHealthCheck, ClinicalDatabaseHealthCheck, SupervisorAgentHealthCheck } from './clinical.health.js';

@Module({
  name: 'clinical-health',
  description: 'Module providing health check status monitors for MCP server, EHR data store, and Supervisor agent.',
  providers: [McpServerHealthCheck, ClinicalDatabaseHealthCheck, SupervisorAgentHealthCheck],
  exports: [McpServerHealthCheck, ClinicalDatabaseHealthCheck, SupervisorAgentHealthCheck]
})
export class HealthModule {}
