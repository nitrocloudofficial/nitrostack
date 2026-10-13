import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { DigitalTwinService } from './digital-twin.service.js';
import { Injectable } from '@nitrostack/core';

@Injectable({ deps: [DigitalTwinService] })
export class DigitalTwinPrompts {
  constructor(private readonly twin: DigitalTwinService) {}

  @Prompt({
    name: 'digital_twin_dashboard',
    description: 'Get an overview of the company health dashboard and operational status',
    arguments: []
  })
  async getDashboardPrompt(_args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating digital twin dashboard prompt');
    const health = this.twin.getCompanyHealth();

    const deptLines = health.departments.map(
      (d) => `- **${d.departmentName}**: ${d.healthScore}% (${d.status.toUpperCase()}) — ${d.summary}`
    ).join('\n');

    const recLines = health.recommendations.length > 0
      ? health.recommendations.map(
          (r) => `- **[${r.recommendationId}]** ${r.title} (Incident: ${r.incidentId}, Priority: ${r.priority.toUpperCase()})`
        ).join('\n')
      : 'None';

    return [
      {
        role: 'user' as const,
        content: 'Show me the latest company health dashboard and active recommendations.'
      },
      {
        role: 'assistant' as const,
        content: `Here is the current AI Workplace Digital Twin operational dashboard:

### Overview:
- **Overall Company Health Score**: ${health.companyHealthScore}% (${health.status.toUpperCase()})
- **Open Incidents**: ${health.openIncidents}
- **Critical Risks**: ${health.criticalRisks}

### Department Health Breakdown:
${deptLines}

### Pending Recommendations:
${recLines}

If you want to investigate a specific incident, you can use the \`incident_investigation\` prompt with the corresponding Incident ID.`
      }
    ];
  }

  @Prompt({
    name: 'incident_investigation',
    description: 'Analyze and summarize details for a specific incident',
    arguments: [
      {
        name: 'incidentId',
        description: 'Incident ID, e.g. INC-1001',
        required: true
      }
    ]
  })
  async getIncidentPrompt(args: { incidentId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Generating incident prompt for ${args.incidentId}`);
    
    const incident = this.twin.getIncident(args.incidentId);
    if (!incident) {
      return [
        {
          role: 'user' as const,
          content: `Investigate incident ${args.incidentId}`
        },
        {
          role: 'assistant' as const,
          content: `Incident **${args.incidentId}** was not found in the Digital Twin. Please run the \`list_incidents\` tool to see available incidents.`
        }
      ];
    }

    const affectedSystems = incident.affectedSystems.join(', ');
    const affectedDepts = incident.affectedDepartments.join(', ');
    const recs = incident.recommendations.map(
      (r) => `- **[${r.recommendationId}]** ${r.title} (Priority: ${r.priority.toUpperCase()}, Status: ${r.status})`
    ).join('\n');

    return [
      {
        role: 'user' as const,
        content: `Give me a full root-cause and business impact analysis for incident ${incident.incidentId}.`
      },
      {
        role: 'assistant' as const,
        content: `Here is the analysis report for incident **${incident.incidentId}** ("${incident.title}"):

### Incident Details:
- **Category**: ${incident.category}
- **Severity**: ${incident.severity.toUpperCase()}
- **Status**: ${incident.status.toUpperCase()}
- **Confidence Score**: ${incident.confidenceScore}%
- **Affected Systems**: ${affectedSystems || 'None'}
- **Affected Departments**: ${affectedDepts || 'None'}

### Root Cause Analysis (Engineering Agent):
- **Trigger**: ${incident.trigger}
- **Details**: ${incident.rootCause}

### Business Impact Analysis (Executive Agent):
- **Summary**: ${incident.businessImpact.summary}
- **Engineering Risk**: ${incident.businessImpact.engineeringRisk.toUpperCase()}
- **Launch Delay Probability**: ${incident.businessImpact.launchDelay.toUpperCase()}
- **Customer Impact**: ${incident.businessImpact.customerImpact.toUpperCase()}
- **Revenue Risk**: ${incident.businessImpact.revenueRisk.toUpperCase()}
- **Projected Department Health**: ${incident.businessImpact.projectedHealthScore}%

### Actionable Recommendations:
${recs || 'No recommendations generated.'}

Would you like to approve any of these recommendations? Use the \`approveRecommendation\` tool with the recommendation ID to execute the action.`
      }
    ];
  }

  @Prompt({
    name: 'recommendation_review',
    description: 'Get details on a specific recommendation and advice on whether to approve or reject it',
    arguments: [
      {
        name: 'recommendationId',
        description: 'Recommendation ID, e.g. REC-1',
        required: true
      }
    ]
  })
  async getRecommendationPrompt(args: { recommendationId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Generating recommendation review prompt for ${args.recommendationId}`);

    const recs = this.twin.getRecommendations();
    const rec = recs.find(r => r.recommendationId.toLowerCase() === args.recommendationId.toLowerCase());

    if (!rec) {
      return [
        {
          role: 'user' as const,
          content: `Review recommendation ${args.recommendationId}`
        },
        {
          role: 'assistant' as const,
          content: `Recommendation **${args.recommendationId}** was not found. Please review the dashboard or retrieve all recommendations using the \`getRecommendations\` tool.`
        }
      ];
    }

    const incident = this.twin.getIncident(rec.incidentId);

    return [
      {
        role: 'user' as const,
        content: `Should I approve recommendation ${rec.recommendationId}?`
      },
      {
        role: 'assistant' as const,
        content: `Here is the assessment for recommendation **${rec.recommendationId}**:

### Recommendation Summary:
- **Title**: ${rec.title}
- **Incident Scope**: ${rec.incidentId} ${incident ? `("${incident.title}")` : ''}
- **Priority**: ${rec.priority.toUpperCase()}
- **Current Status**: ${rec.status.toUpperCase()}
- **Automated Execution**: Yes (via MCP server: \`${rec.mcpServer}\`)

### Impact of Approval:
- **Remediation**: ${rec.description}
- **Target MCP Server**: \`${rec.mcpServer}\`

### Rationale:
Given the priority is **${rec.priority.toUpperCase()}**, executing this action will help restore the health of affected systems and departments. 
${rec.businessImpact ? `\n**Expected Business Impact**: ${rec.businessImpact}\n` : ''}
Would you like to proceed?
- **To Approve**: Run \`approveRecommendation(recommendationId: "${rec.recommendationId}")\`
- **To Reject**: Run \`rejectRecommendation(recommendationId: "${rec.recommendationId}")\``
      }
    ];
  }

  @Prompt({
    name: 'run_simulation_drill',
    description: 'Get guidance on triggering a simulated incident drill to test the multi-agent pipeline',
    arguments: [
      {
        name: 'scenario',
        description: 'The incident scenario to simulate (optional, e.g., cicd_failure, deployment_failure, etc.)',
        required: false
      }
    ]
  })
  async getSimulationPrompt(args: { scenario?: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Generating simulation drill prompt. Scenario: ${args.scenario || 'None'}`);

    const scenarios = [
      { id: 'cicd_failure', label: 'CI/CD Failure', desc: 'Simulates a broken build in GitHub Actions.' },
      { id: 'merge_failure', label: 'Merge Failure', desc: 'Simulates conflicts and check failures on PR merge.' },
      { id: 'deployment_failure', label: 'Deployment Failure', desc: 'Simulates a bad Kubernetes deployment rolling back.' },
      { id: 'issue_spike', label: 'Issue Spike', desc: 'Simulates a surge of user issues reported in Jira.' },
      { id: 'infra_cpu_spike', label: 'Infra CPU Spike', desc: 'Simulates Datadog host CPU spike alerting.' },
      { id: 'sprint_risk', label: 'Sprint Risk', desc: 'Simulates sprint scope creep risking the deadline.' },
      { id: 'feature_incomplete', label: 'Feature Incomplete', desc: 'Simulates critical blocker issues blocking feature completion.' },
      { id: 'deadline_near', label: 'Deadline Near', desc: 'Simulates calendar meeting scheduling conflicts close to deadline.' },
      { id: 'employee_leave', label: 'Employee Leave', desc: 'Simulates emergency OOO leave of a key engineer.' },
      { id: 'ooo_meeting_overlap', label: 'OOO Meeting Overlap', desc: 'Simulates key meeting overlaps causing review delays.' }
    ];

    const scenario = args.scenario;
    if (scenario) {
      const match = scenarios.find(s => s.id === scenario || s.id.replace(/_/g, '') === scenario.replace(/_/g, ''));
      if (match) {
        return [
          {
            role: 'user' as const,
            content: `How do I run the simulated drill for ${match.label}?`
          },
          {
            role: 'assistant' as const,
            content: `To trigger the **${match.label}** simulation drill, call the \`triggerIncident\` tool:

\`\`\`json
{
  "incidentType": "${match.id}"
}
\`\`\`

**What to expect**:
1. The **Monitoring Agent** will detect the event and push an alert to Gmail/Slack.
2. The **Engineering Agent** will perform root-cause analysis (computing a new weighted health score).
3. The **Executive Agent** will determine business impact and compile prioritized recommendations.
4. The **Action Agent** will prepare the remediation commands, waiting for your approval.`
          }
        ];
      }
    }

    const scenarioList = scenarios.map(s => `- **${s.id}** (${s.label}): ${s.desc}`).join('\n');

    return [
      {
        role: 'user' as const,
        content: 'How do I start a simulated operational drill?'
      },
      {
        role: 'assistant' as const,
        content: `You can initiate simulated drills to see how the multi-agent pipeline responds to various incidents.

Here is the list of available scenarios you can trigger:
${scenarioList}

To trigger one, run the \`triggerIncident\` tool with the corresponding scenario ID (e.g. \`triggerIncident(incidentType: "cicd_failure")\`).`
      }
    ];
  }
}
