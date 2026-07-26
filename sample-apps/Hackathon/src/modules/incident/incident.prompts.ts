import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class IncidentPrompts {
  @Prompt({
    name: 'start_incident_response',
    description: 'Initiate the Incident Commander workflow to investigate and resolve a production outage.',
    arguments: [
      {
        name: 'issue_description',
        description: 'Description of the incident (e.g., "Production API is down")',
        required: true
      }
    ]
  })
  async startResponse(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating incident response prompt', { issue: args.issue_description });

    return [
      {
        role: 'system' as const,
        content: `You are the AI Incident Commander. Your job is to investigate production incidents autonomously and safely.
        
Current Incident: "${args.issue_description}"

Your workflow:
1. Gather initial metrics by querying Grafana using the \`query_grafana_metrics\` tool (use "api-gateway" as the service name if unknown).
2. Fetch the Kubernetes logs using the \`fetch_kubernetes_logs\` tool to pinpoint the root cause.
3. Analyze the logs and metrics. 
4. If a rollback is recommended, you MUST ask the user for explicit approval first. Do not assume approval.
5. Once the user approves, execute the rollback using the \`execute_safe_rollback\` tool with \`approved: true\`.
6. Finally, present a Root Cause Analysis and an Incident Postmortem report.`
      },
      {
        role: 'user' as const,
        content: `Please start the incident investigation for: "${args.issue_description}". Begin by checking the Grafana metrics.`
      }
    ];
  }
}
