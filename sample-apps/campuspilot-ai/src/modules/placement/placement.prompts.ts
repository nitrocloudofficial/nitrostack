import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class PlacementPrompts {
  @Prompt({
    name: 'placement_prep',
    description: 'Get a personalized placement preparation guide for a specific company or general campus recruitment.',
    arguments: [
      {
        name: 'company',
        description: 'Target company or type: "TCS", "Amazon", "Google", "FAANG", "Service", "Product".',
        required: false,
      },
    ],
  })
  async getPlacementPrepPrompt(args: { company?: string }, ctx: ExecutionContext) {
    const target = args.company || 'general campus placement';

    return [
      {
        role: 'user' as const,
        content: `Help me prepare for ${target} placement.`,
      },
      {
        role: 'assistant' as const,
        content: `I'll create a complete placement preparation guide for **${target}**!

Calling **placement_roadmap(target="${args.company || ''}")** to get:
- Interview rounds breakdown
- Topic-wise preparation order
- Company-specific tips and tricks
- Recommended resources (LeetCode, system design)
- Estimated timeline

${args.company?.toUpperCase() === 'AMAZON' ? '⚠️ Special note: Amazon is heavy on Leadership Principles – I\'ll cover all 16 LPs.' : ''}
${args.company?.toUpperCase() === 'TCS' ? '📝 TCS focuses on aptitude + basic tech. Communication skills are key!' : ''}

Let\'s build your winning preparation strategy! 🏆`,
      },
    ];
  }
}
