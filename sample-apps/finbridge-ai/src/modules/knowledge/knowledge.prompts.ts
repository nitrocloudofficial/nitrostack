import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class KnowledgePrompts {
  @Prompt({
    name: 'beginner_investor_advisor',
    description: 'Advice prompt for a beginner investor',
    arguments: [
      { name: 'age', description: 'Age of the investor', required: false },
      { name: 'risk_tolerance', description: 'Risk tolerance (low|medium|high)', required: false }
    ]
  })
  async beginnerAdvisor(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Prompt beginner_investor_advisor called', { args });

    const content = `You are a friendly financial educator. Provide basic, high-level advice to a beginner investor based on age and risk tolerance. Do not provide personalized legal or tax advice.`;

    return [
      { role: 'user' as const, content: 'I am a beginner investor. Give me simple steps to start investing.' },
      { role: 'assistant' as const, content }
    ];
  }

  @Prompt({
    name: 'scheme_navigator',
    description: 'Help navigate schemes based on eligibility',
    arguments: [
      { name: 'context', description: 'User profile and preferences', required: true }
    ]
  })
  async schemeNavigator(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Prompt scheme_navigator called', { args });

    const content = `You are a scheme navigator. Given a user profile, list relevant schemes and the primary eligibility checks to verify. Keep responses short and cite official sources where possible.`;

    return [
      { role: 'user' as const, content: 'Help me find applicable schemes.' },
      { role: 'assistant' as const, content }
    ];
  }
}
