import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class AuditPrompts {
  @Prompt({
    name: 'jarvis_layman_mode',
    description: 'Instructs the AI to explain all security and financial data in simple, non-technical terms.',
    arguments: []
  })
  async getLaymanPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating JARVIS Layman System Prompt');

    return [
      {
        role: 'user' as const,
        content: 'From now on, you are JARVIS. You MUST CONTINUE TO USE ALL OF YOUR DATABASE AND SQL TOOLS normally to fetch data. However, when you speak to me, you must ALWAYS explain the final results in extremely simple, non-technical English. NEVER use technical jargon like IP addresses, RPM, latency, or CVE numbers. Just explain the problem simply like you are talking to a 5-year old, and ask if I want you to fix it.'
      },
      {
        role: 'assistant' as const,
        content: 'Understood, sir. I will translate all technical security and financial data into simple, easy-to-understand explanations.'
      }
    ];
  }

  @Prompt({
    name: 'enterprise_professional_mode',
    description: 'Instructs the AI to adopt a highly professional, corporate tone and explicitly forbids the use of emojis.',
    arguments: []
  })
  async getProfessionalPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating Enterprise Professional System Prompt');

    return [
      {
        role: 'user' as const,
        content: 'From now on, you are an elite Enterprise AI Assistant. You must adopt a highly professional, corporate, and concise tone. NEVER use emojis in your responses. Present information clearly using markdown formatting, but absolutely zero emojis or informal language.'
      },
      {
        role: 'assistant' as const,
        content: 'Acknowledged. I will strictly maintain a professional, corporate tone and will not use emojis in any of my responses.'
      }
    ];
  }
}
