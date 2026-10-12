import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { IntentService } from './intent.service.js';

const intentService = new IntentService();

export class IntentTools {
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
  async detectIntent(input: { query: string }, ctx: ExecutionContext) {
    ctx.logger.info('Detecting intent', { query: input.query });
    const result = intentService.detect(input.query);
    return {
      intents: result.intents,
      requiredAgents: result.agents,
      confidence: result.confidence,
    };
  }
}
