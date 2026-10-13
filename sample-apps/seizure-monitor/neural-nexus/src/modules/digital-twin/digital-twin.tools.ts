import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { DigitalTwinService } from './digital-twin.service.js';

/**
 * AI Workplace Digital Twin tools.
 *
 * These tools expose the multi-agent operational control center:
 *  - Monitoring Agent: start/stop monitoring, live status, trigger simulator
 *  - Engineering Agent: get engineering health metrics (weighted), root-cause analysis
 *  - Executive Agent: company health, incident reports, business impact, recommendations
 *  - Action Agent: approve / reject recommendation execution
 */
@Injectable({ deps: [DigitalTwinService] })
export class DigitalTwinTools {
  constructor(private readonly twin: DigitalTwinService) {}

  // --- Monitoring Controls ---

  @Tool({
    name: 'startMonitoring',
    description: 'Start continuous live polling of enterprise SaaS systems (GitHub, Jira, Datadog, Calendar) every 30 seconds.',
    inputSchema: z.object({}),
  })
  async startMonitoring(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Monitoring Agent starting live polling');
    this.twin.startMonitoring();
    return { success: true, message: 'Continuous monitoring started.' };
  }

  @Tool({
    name: 'stopMonitoring',
    description: 'Stop continuous live polling of enterprise SaaS systems.',
    inputSchema: z.object({}),
  })
  async stopMonitoring(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Monitoring Agent stopping live polling');
    this.twin.stopMonitoring();
    return { success: true, message: 'Continuous monitoring stopped.' };
  }

  @Tool({
    name: 'getMonitoringStatus',
    description: 'Get the active status of SaaS polling, last run timestamp, and recent Gmail/Slack alerts.',
    inputSchema: z.object({}),
  })
  @Widget('monitoring')
  async getMonitoringStatus(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Monitoring Agent fetching live status');
    return this.twin.getMonitoringStatus();
  }

  // --- Health Metrics ---

  @Tool({
    name: 'getCompanyHealth',
    description: 'Get the live AI Workplace Digital Twin dashboard: overall company health score, per-department health, open incidents, and top recommendations.',
    inputSchema: z.object({}),
  })
  @Widget('company-health')
  async getCompanyHealth(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Executive Agent aggregating company health');
    return this.twin.getCompanyHealth();
  }

  @Tool({
    name: 'getEngineeringHealth',
    description: 'Get the detailed engineering health report computed from weighted metrics (Deployment Success 25%, CI/CD Success 20%, Sprint Health 20%, Issue Rate 15%, Infrastructure 20%).',
    inputSchema: z.object({}),
  })
  @Widget('engineering-health')
  async getEngineeringHealth(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Engineering Agent calculating weighted health');
    const { engineeringHealthScore, breakdown } = this.twin.getEngineeringHealthMetrics();
    let status = 'healthy';
    if (engineeringHealthScore < 65) status = 'critical';
    else if (engineeringHealthScore < 85) status = 'warning';

    return {
      engineeringHealthScore,
      status,
      breakdown,
      metricsWeights: {
        deploymentSuccess: '25%',
        cicdSuccess: '20%',
        sprintHealth: '20%',
        issueRate: '15%',
        infrastructureHealth: '20%',
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // --- Incident Reports & Analysis ---

  @Tool({
    name: 'getIncidentReport',
    description: 'Get the complete analysis for one incident: timeline, root cause, confidence, affected systems, business impact and recommendations. Renders the incident detail view.',
    inputSchema: z.object({
      incidentId: z.string().describe('Incident ID, e.g. INC-1001'),
    }),
  })
  @Widget('incident-detail')
  async getIncidentReport(input: { incidentId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching incident report', { incidentId: input.incidentId });
    const inc = this.twin.getIncident(input.incidentId);
    if (!inc) {
      throw new Error(`Incident ${input.incidentId} not found`);
    }
    return inc;
  }

  @Tool({
    name: 'getRecommendations',
    description: 'Get prioritized AI recommendations (high/medium/low). Optionally scoped to one incident. Exposes Approve/Reject actions.',
    inputSchema: z.object({
      incidentId: z.string().optional().describe('Optional incident ID to scope recommendations, e.g. INC-1001'),
    }),
  })
  @Widget('recommendation')
  async getRecommendations(input: { incidentId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching recommendations', { incidentId: input.incidentId });
    return { recommendations: this.twin.getRecommendations(input.incidentId) };
  }

  // --- Action Approvals ---

  @Tool({
    name: 'approveRecommendation',
    description: 'Action Agent: approve and execute a recommended action through its designated MCP server.',
    inputSchema: z.object({
      recommendationId: z.string().describe('Recommendation ID, e.g. REC-1'),
    }),
  })
  async approveRecommendation(input: { recommendationId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Action Agent approving recommendation', { recommendationId: input.recommendationId });
    const result = this.twin.approveAction(input.recommendationId, true);
    if (!result.found) {
      throw new Error(`Recommendation ${input.recommendationId} not found`);
    }
    return result;
  }

  @Tool({
    name: 'rejectRecommendation',
    description: 'Action Agent: reject a recommended action, marking it as rejected in the timeline.',
    inputSchema: z.object({
      recommendationId: z.string().describe('Recommendation ID, e.g. REC-1'),
    }),
  })
  async rejectRecommendation(input: { recommendationId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Action Agent rejecting recommendation', { recommendationId: input.recommendationId });
    const result = this.twin.approveAction(input.recommendationId, false);
    if (!result.found) {
      throw new Error(`Recommendation ${input.recommendationId} not found`);
    }
    return result;
  }

  // --- Simulators & Copilot (Hackathon Demos) ---

  @Tool({
    name: 'triggerIncident',
    description: 'Hackathon Simulator: Trigger one of the 10 supported incident scenarios to observe how the LangGraph multi-agent pipeline reasons and mitigates in real-time.',
    inputSchema: z.object({
      incidentType: z.enum([
        'cicd_failure',
        'merge_failure',
        'deployment_failure',
        'issue_spike',
        'infra_cpu_spike',
        'sprint_risk',
        'feature_incomplete',
        'deadline_near',
        'employee_leave',
        'ooo_meeting_overlap'
      ]).describe('The specific scenario to simulate.'),
    }),
  })
  @Widget('trigger-incident')
  async triggerIncident(input: { incidentType: string }, ctx: ExecutionContext) {
    ctx.logger.info('Simulating scenario trigger', { type: input.incidentType });
    return this.twin.triggerScenario(input.incidentType);
  }

  @Tool({
    name: 'executiveChat',
    description: 'Executive Copilot: Ask natural-language operational questions like "Why is engineering health low?", "Summarize today\'s risks", etc.',
    inputSchema: z.object({
      question: z.string().describe('Operational question'),
    }),
  })
  @Widget('executive-chat')
  async executiveChat(input: { question: string }, ctx: ExecutionContext) {
    ctx.logger.info('Executive Copilot query', { question: input.question });
    return this.twin.answerExecutiveQuery(input.question);
  }

  @Tool({
    name: 'getAgentActivity',
    description: 'Show the live multi-agent execution pipeline (Monitoring -> Engineering -> Executive -> Action) and agent logs.',
    inputSchema: z.object({}),
  })
  @Widget('agent-activity')
  async getAgentActivity(_input: any, ctx: ExecutionContext) {
    ctx.logger.info('Rendering agent activity pipeline');
    return this.twin.getAgentActivity();
  }

  // ---------------------------------------------------------------------------
  // Backwards Compatibility / Legacy Tool Names
  // ---------------------------------------------------------------------------

  @Tool({
    name: 'get_company_health',
    description: 'Legacy alias for getCompanyHealth.',
    inputSchema: z.object({}),
  })
  @Widget('company-health')
  async get_company_health(input: any, ctx: ExecutionContext) {
    return this.getCompanyHealth(input, ctx);
  }

  @Tool({
    name: 'list_incidents',
    description: 'List active incidents.',
    inputSchema: z.object({}),
  })
  @Widget('list-incidents')
  async list_incidents(_input: any, ctx: ExecutionContext) {
    return { incidents: this.twin.listIncidents() };
  }

  @Tool({
    name: 'get_incident',
    description: 'Legacy alias for getIncidentReport.',
    inputSchema: z.object({ incidentId: z.string() }),
  })
  @Widget('incident-detail')
  async get_incident(input: { incidentId: string }, ctx: ExecutionContext) {
    return this.getIncidentReport(input, ctx);
  }

  @Tool({
    name: 'approve_action',
    description: 'Legacy alias for approveRecommendation.',
    inputSchema: z.object({
      recommendationId: z.string(),
      approve: z.boolean().default(true),
    }),
  })
  async approve_action(input: { recommendationId: string; approve?: boolean }, ctx: ExecutionContext) {
    const approve = input.approve ?? true;
    return this.twin.approveAction(input.recommendationId, approve);
  }

  @Tool({
    name: 'get_agent_activity',
    description: 'Legacy alias for getAgentActivity.',
    inputSchema: z.object({}),
  })
  @Widget('agent-activity')
  async get_agent_activity(input: any, ctx: ExecutionContext) {
    return this.getAgentActivity(input, ctx);
  }
}
