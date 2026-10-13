import {
  PromptDecorator as Prompt,
  ExecutionContext
} from '@nitrostack/core';

export class EchoMindPrompts {

  @Prompt({
    name: "investigation_help",
    description: "Explain how EchoMind investigations work"
  })
  async help(args: any, ctx: ExecutionContext) {

    ctx.logger.info("Generating help");

    return [
      {
        role: "assistant" as const,
        content:
          "EchoMind investigates questions by collecting evidence from multiple sources before generating conclusions."
      }
    ];

  }

}