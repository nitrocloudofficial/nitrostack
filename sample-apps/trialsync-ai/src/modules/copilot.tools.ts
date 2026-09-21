import { Module, ToolDecorator as Tool, z } from '@nitrostack/core';

@Module({
  name: 'CopilotModule',
})
export class CopilotTools {
  @Tool({
    name: 'ask_copilot',
    description: 'Provides clinical trial assistant queries and protocol guidance',
    inputSchema: z.object({
      prompt: z.string(),
    }),
  })
  async askCopilot(input: { prompt: string }) {
    return {
      response: `Copilot Guidance for: "${input.prompt}"`,
    };
  }
}