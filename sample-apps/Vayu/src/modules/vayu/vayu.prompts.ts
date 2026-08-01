import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class VayuPrompts {
  @Prompt({
    name: 'generate_uv_advisory',
    description: 'Generates a contextual UV safety advisory based on live risk data.',
    arguments: [
      {
        name: 'uvIndex',
        description: 'The current UV index',
        required: true
      },
      {
        name: 'riskTier',
        description: 'The official WHO risk tier',
        required: true
      },
      {
        name: 'safeMinutes',
        description: 'Calculated safe exposure window in minutes',
        required: true
      }
    ]
  })
  async generateAdvisory(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating UV advisory prompt for LLM consumption');

    return [
      {
        role: 'system' as const,
        content: 'You are a real-time UV exposure guardian. Provide a minimalist, official, and highly professional safety advisory based on the user\'s live data. Be direct, authoritative, and strictly avoid conversational filler.'
      },
      {
        role: 'user' as const,
        content: `Current UV Index: ${args.uvIndex}\nRisk Tier: ${args.riskTier}\nSafe Exposure Window: ${args.safeMinutes} minutes.\n\nPlease generate a brief, actionable safety advisory for this exact environment.`
      }
    ];
  }
}