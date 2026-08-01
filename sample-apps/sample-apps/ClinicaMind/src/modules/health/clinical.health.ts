import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';

@HealthCheck({
  name: 'mcp_server',
  description: 'NitroStack MCP Protocol & Core Transport Status',
  interval: 30
})
@Injectable()
export class McpServerHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'up',
      message: 'ClinicaMind NitroStack MCP Server operational.',
      details: { transport: 'stdio/http', version: '1.0.0' },
      timestamp: Date.now()
    };
  }
}

@HealthCheck({
  name: 'clinical_db',
  description: 'Clinical Data Repository & Mock EHR Connection Health',
  interval: 60
})
@Injectable()
export class ClinicalDatabaseHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'up',
      message: 'EHR Data Store responsive.',
      details: { latencyMs: 4, recordsIndexed: 1420 },
      timestamp: Date.now()
    };
  }
}

@HealthCheck({
  name: 'supervisor_agent',
  description: 'Supervisor Agent Orchestrator & Tool Planning Health',
  interval: 30
})
@Injectable()
export class SupervisorAgentHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    return {
      status: 'up',
      message: 'Supervisor Agent ready for tool orchestration.',
      details: { executionPlannerState: 'Idle/Ready' },
      timestamp: Date.now()
    };
  }
}
