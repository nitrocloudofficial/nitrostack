import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { IntentService } from './intent.service.js';

@Injectable()
export class IntentTools {
  private intentService = new IntentService();

  @Tool({
    name: 'detect_intent',
    description:
      'Analyze a query to detect enterprise intents and determine which specialist AI agents are needed. ' +
      'Supports 10 intent types: GENERAL, MATH, CODING, RESEARCH, PLANNING, BUSINESS, SECURITY, SQL, DATA_SCIENCE, DEVOPS.',
    inputSchema: z.object({
      query: z.string().describe('The query to analyze for intent detection'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async detectIntent(input: { query: string }, ctx: any) {
    const result = this.intentService.detect(input.query);
    return {
      intents: result.intents,
      requiredAgents: result.agents,
      confidence: result.confidence,
    };
  }
}
