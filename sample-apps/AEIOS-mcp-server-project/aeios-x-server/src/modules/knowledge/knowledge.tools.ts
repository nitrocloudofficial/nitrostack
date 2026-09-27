import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { KnowledgeService } from './knowledge.service.js';
import { Blackboard } from './blackboard.js';

const knowledgeService = new KnowledgeService();
const blackboard = new Blackboard();

export class KnowledgeTools {
  @Tool({
    name: 'publish_knowledge',
    description: 'Publish a knowledge entry to the AEIOS-X Enterprise Blackboard shared memory.',
    inputSchema: z.object({
      agent: z.string().describe('Name of the agent or source'),
      category: z.string().describe('Category (e.g., "security", "architecture")'),
      content: z.string().describe('The knowledge content to publish'),
    }),
  })
  async publishKnowledge(input: { agent: string; category: string; content: string }, ctx: ExecutionContext) {
    blackboard.publish(input.agent, input.category, input.content);
    return {
      success: true,
      totalEntries: blackboard.size,
      categories: blackboard.categories(),
    };
  }

  @Tool({
    name: 'get_knowledge_summary',
    description: 'Get a structured summary of all enterprise knowledge on the Blackboard.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  })
  async getKnowledgeSummary(_input: Record<string, never>, ctx: ExecutionContext) {
    const entries = blackboard.read();
    const knowledge = knowledgeService.categorize(entries);
    return { totalEntries: entries.length, categories: blackboard.summary(), knowledge };
  }

  @Tool({
    name: 'clear_blackboard',
    description: 'Clear all entries from the Enterprise Blackboard.',
    inputSchema: z.object({}),
    annotations: { destructiveHint: true },
  })
  async clearBlackboard(_input: Record<string, never>, ctx: ExecutionContext) {
    blackboard.clear();
    return { success: true, message: 'Blackboard cleared.' };
  }
}
