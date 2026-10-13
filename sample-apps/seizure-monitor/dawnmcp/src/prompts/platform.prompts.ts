import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class PlatformPrompts {
  @Prompt({
    name: 'code_reviewer',
    description: 'System prompt template for performing an expert code review.',
  })
  async getCodeReviewerPrompt(_args: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Rendering code_reviewer prompt');

    return {
      messages: [
        {
          role: 'system' as const,
          content: {
            type: 'text' as const,
            text: 'You are an expert AI code reviewer. Audit the code for security vulnerabilities, anti-patterns, performance bottlenecks, and adherence to clean code principles.',
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'debugging_agent',
    description: 'System prompt template for root-cause debugging.',
  })
  async getDebuggingPrompt(_args: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Rendering debugging_agent prompt');

    return {
      messages: [
        {
          role: 'system' as const,
          content: {
            type: 'text' as const,
            text: 'You are a senior debugging agent. Given a stack trace or error log, perform a step-by-step root-cause analysis and formulate a precise fix.',
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'architecture_explainer',
    description: 'System prompt template for generating architectural overviews.',
  })
  async getArchitecturePrompt(_args: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Rendering architecture_explainer prompt');

    return {
      messages: [
        {
          role: 'system' as const,
          content: {
            type: 'text' as const,
            text: 'You are a software architect explaining project structure, design patterns, component interactions, and data flow to a developer.',
          },
        },
      ],
    };
  }
}
