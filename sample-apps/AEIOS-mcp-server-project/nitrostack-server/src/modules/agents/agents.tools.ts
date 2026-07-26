import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { AgentFactory } from './agents.service.js';

@Injectable()
export class AgentsTools {
  private factory = new AgentFactory();

  @Tool({
    name: 'list_agent_roles',
    description:
      'List all available specialist AI agent roles in the AEIOS-X system. ' +
      'Each role represents an expert domain that can be dynamically instantiated.',
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
    },
  })
  async listAgentRoles(_input: Record<string, never>, ctx: any) {
    return {
      roles: [
        { name: 'Enterprise Assistant', domain: 'General enterprise queries' },
        { name: 'Math Agent', domain: 'Mathematical analysis and calculations' },
        { name: 'Coding Agent', domain: 'Software development and code review' },
        { name: 'Research Agent', domain: 'Research and investigation' },
        { name: 'Planning Agent', domain: 'Project planning and strategy' },
        { name: 'Business Agent', domain: 'Business analysis and metrics' },
        { name: 'Security Agent', domain: 'Security assessment and compliance' },
        { name: 'SQL Agent', domain: 'Database queries and optimization' },
        { name: 'Data Science Agent', domain: 'ML, data analysis, and predictions' },
        { name: 'DevOps Agent', domain: 'Infrastructure, CI/CD, and deployment' },
        { name: 'MCP Agent', domain: 'Model Context Protocol integration' },
      ],
    };
  }

  @Tool({
    name: 'create_agent',
    description:
      'Create a dynamic specialist AI agent by role name. ' +
      'Returns the agent configuration including system prompt and objective.',
    inputSchema: z.object({
      role: z.string().describe('The agent role to create (e.g., "Security Agent", "Coding Agent")'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async createAgent(input: { role: string }, ctx: any) {
    const agent = this.factory.createAgent(input.role);
    return {
      name: agent.name,
      role: agent.role,
      objective: agent.objective,
      systemPromptPreview: agent.systemPrompt.slice(0, 200) + '...',
    };
  }
}
