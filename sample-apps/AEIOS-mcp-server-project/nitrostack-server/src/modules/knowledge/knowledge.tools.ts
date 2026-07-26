import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { KnowledgeService } from './knowledge.service.js';
import { Blackboard } from './blackboard.js';

@Injectable()
export class KnowledgeTools {
  private knowledgeService = new KnowledgeService();
  private blackboard = new Blackboard();

  @Tool({
    name: 'publish_knowledge',
    description:
      'Publish a knowledge entry to the AEIOS-X Enterprise Blackboard. ' +
      'The blackboard is shared memory used by all agents for collaboration.',
    inputSchema: z.object({
      agent: z.string().describe('Name of the agent or source publishing the knowledge'),
      category: z.string().describe('Category of the knowledge (e.g., "security", "architecture", "business")'),
      content: z.string().describe('The knowledge content to publish'),
    }),
  })
  async publishKnowledge(
    input: { agent: string; category: string; content: string },
    ctx: any
  ) {
    this.blackboard.publish(input.agent, input.category, input.content);
    return {
      success: true,
      totalEntries: this.blackboard.size,
      categories: this.blackboard.categories(),
    };
  }

  @Tool({
    name: 'get_knowledge_summary',
    description:
      'Get a structured summary of all enterprise knowledge on the Blackboard, ' +
      'categorized into facts, risks, recommendations, questions, and decisions.',
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
    },
  })
  async getKnowledgeSummary(_input: Record<string, never>, ctx: any) {
    const entries = this.blackboard.read();
    const knowledge = this.knowledgeService.categorize(entries);
    return {
      totalEntries: entries.length,
      categories: this.blackboard.summary(),
      knowledge,
    };
  }

  @Tool({
    name: 'clear_blackboard',
    description: 'Clear all entries from the Enterprise Blackboard shared memory.',
    inputSchema: z.object({}),
    annotations: {
      destructiveHint: true,
    },
  })
  async clearBlackboard(_input: Record<string, never>, ctx: any) {
    this.blackboard.clear();
    return { success: true, message: 'Blackboard cleared.' };
  }
}
