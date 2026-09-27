import { GroqClient, type ChatMessage } from '../../llm/groq-client.js';
import { Blackboard } from '../knowledge/blackboard.js';
import { KnowledgeService } from '../knowledge/knowledge.service.js';

export interface DynamicAgent {
  name: string;
  role: string;
  objective: string;
  systemPrompt: string;
}

export interface AgentResult {
  agent: string;
  role: string;
  success: boolean;
  output: string;
  executionTime: number;
  error?: string;
}

export class AgentFactory {
  createAgent(role: string): DynamicAgent {
    const name = role.replace(/\s+/g, '_').toLowerCase();
    const objective = `Provide expert ${role.toLowerCase()} analysis and recommendations for enterprise queries.`;
    const systemPrompt = [
      `You are ${role}, an expert AI agent in the AEIOS-X Enterprise Intelligence System.`,
      `Your role: ${role}`,
      `Your objective: ${objective}`,
      '',
      'Guidelines:',
      '- Provide clear, actionable enterprise-grade analysis',
      '- Identify risks, opportunities, and recommendations',
      '- Be specific and data-driven where possible',
      '- Consider enterprise context and best practices',
      '- Format responses with clear structure',
    ].join('\n');

    return { name, role, objective, systemPrompt };
  }

  createMany(roles: string[]): DynamicAgent[] {
    return roles.map((role) => this.createAgent(role));
  }
}

export class AgentExecutor {
  private llm = new GroqClient();

  async execute(
    agent: DynamicAgent,
    task: string,
    context: string,
    blackboard: Blackboard,
    knowledgeService: KnowledgeService
  ): Promise<AgentResult> {
    const start = Date.now();

    try {
      const knowledge = knowledgeService.formatContext(blackboard);

      const messages: ChatMessage[] = [
        { role: 'system', content: agent.systemPrompt },
        {
          role: 'user',
          content: [
            `## Task\n${task}`,
            context ? `## Context\n${context}` : '',
            knowledge !== 'No enterprise knowledge available.'
              ? `## Enterprise Knowledge\n${knowledge}`
              : '',
            '',
            `Provide your expert ${agent.role} analysis.`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ];

      const output = await this.llm.chat(messages);

      blackboard.publish(agent.name, agent.role, output);

      return {
        agent: agent.name,
        role: agent.role,
        success: true,
        output,
        executionTime: Date.now() - start,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        agent: agent.name,
        role: agent.role,
        success: false,
        output: '',
        executionTime: Date.now() - start,
        error,
      };
    }
  }

  async executeAll(
    agents: DynamicAgent[],
    task: string,
    context: string,
    blackboard: Blackboard,
    knowledgeService: KnowledgeService
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const agent of agents) {
      const result = await this.execute(agent, task, context, blackboard, knowledgeService);
      results.push(result);
    }
    return results;
  }
}
