import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class IncidentTools {
  @Tool({
    name: 'fetch_kubernetes_logs',
    description: 'Fetch recent logs from Kubernetes pods for a given service.',
    inputSchema: z.object({
      service_name: z.string().describe('The name of the service to fetch logs for'),
      lines: z.number().default(100).describe('Number of log lines to fetch')
    })
  })
  async fetchKubernetesLogs(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching Kubernetes logs', { service: input.service_name });
    
    // Simulated Kubernetes integration
    return {
      service: input.service_name,
      status: 'CRITICAL',
      logs: `
[ERROR] 2026-07-17 14:30:12 - ConnectionRefusedError: Unable to connect to database postgres-main:5432
[ERROR] 2026-07-17 14:30:15 - ConnectionRefusedError: Unable to connect to database postgres-main:5432
[FATAL] 2026-07-17 14:30:18 - Max connection retries exceeded. Pod crashing.
      `,
      analysis: 'The service is failing to connect to the main Postgres database, resulting in a crash loop.'
    };
  }

  @Tool({
    name: 'query_grafana_metrics',
    description: 'Query Grafana for recent metrics (CPU, Memory, Error Rates) for a service.',
    inputSchema: z.object({
      service_name: z.string().describe('The name of the service to query')
    })
  })
  async queryGrafanaMetrics(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Querying Grafana metrics', { service: input.service_name });
    
    // Simulated Grafana integration
    return {
      service: input.service_name,
      metrics: {
        cpu_usage: '98%',
        memory_usage: '85%',
        error_rate: '45.2%',
        active_connections: 0
      },
      alert_status: 'FIRING',
      recent_changes: 'Deployment v2.4.1 occurred 5 minutes ago.'
    };
  }

  @Tool({
    name: 'execute_safe_rollback',
    description: 'Execute a safe Kubernetes rollback to the previous stable version.',
    inputSchema: z.object({
      service_name: z.string().describe('The name of the service to rollback'),
      approved: z.boolean().describe('Must be explicitly true. NEVER execute without asking the human user for approval first!')
    })
  })
  async executeSafeRollback(input: any, ctx: ExecutionContext) {
    if (!input.approved) {
      return {
        status: 'BLOCKED',
        message: 'Rollback requires explicit human approval. Please ask the user for permission.'
      };
    }

    ctx.logger.info('Executing rollback', { service: input.service_name });
    
    // Simulated Rollback
    return {
      status: 'SUCCESS',
      message: `Successfully rolled back ${input.service_name} to version v2.4.0. The system is stabilizing.`,
      incident_report: `Auto-generated Incident Report: Rollback initiated due to database connection failures in v2.4.1.`
    };
  }
}
