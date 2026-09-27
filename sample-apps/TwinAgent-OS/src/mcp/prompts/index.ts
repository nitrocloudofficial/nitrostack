export interface MCPPromptDefinition {
  name: string;
  description: string;
  arguments?: {
    name: string;
    description: string;
    required?: boolean;
  }[];
}

export const mcpPromptDefinitions: MCPPromptDefinition[] = [
  {
    name: 'summarize_project_risk',
    description: 'Generates an executive risk mitigation briefing for a project based on telemetry scores and dependency bottlenecks',
    arguments: [
      { name: 'projectId', description: 'Unique Project UUID', required: true },
    ],
  },
  {
    name: 'recommend_workload_rebalance',
    description: 'Generates actionable task rebalancing recommendations for employees experiencing burnout risk',
    arguments: [
      { name: 'organizationId', description: 'Unique Organization UUID', required: true },
    ],
  },
  {
    name: 'query_organizational_memory',
    description: 'Synthesizes past decisions, meeting outcomes, and historical patterns for a specific topic',
    arguments: [
      { name: 'topic', description: 'Topic or decision query keyword', required: true },
    ],
  },
];

export class MCPPromptHandlers {
  getPrompt(name: string, args: Record<string, string>) {
    if (name === 'summarize_project_risk') {
      return {
        description: 'Executive Risk Mitigation Briefing',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze project risk metrics for Project ID: ${args.projectId || 'N/A'}. Use the 'predictProjectRisk' and 'summarizeProject' MCP tools to evaluate delivery confidence, identify blocked dependencies, and provide a 3-step mitigation strategy.`,
            },
          },
        ],
      };
    }
    if (name === 'recommend_workload_rebalance') {
      return {
        description: 'Employee Workload Rebalancing Plan',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Scan organization ID: ${args.organizationId || 'N/A'} using 'predictBurnout' and 'recommendAssignee' MCP tools. Identify employees operating at over 120% capacity and suggest optimal task reallocations to prevent burnout.`,
            },
          },
        ],
      };
    }
    if (name === 'query_organizational_memory') {
      return {
        description: 'Organizational Memory Synthesis',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Query enterprise memory for '${args.topic || 'general decisions'}' using 'searchKnowledge' and 'twinagent://memory/timeline' resource. Synthesize key architectural/strategic decisions and lessons learned.`,
            },
          },
        ],
      };
    }
    throw new Error(`Prompt template not found: ${name}`);
  }
}

export const mcpPromptHandlers = new MCPPromptHandlers();
