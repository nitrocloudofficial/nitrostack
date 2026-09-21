import { PromptDecorator as Prompt, ExecutionContext } from "@nitrostack/core";

export class StrategyPrompts {

  @Prompt({
    name: "strategy_help",
    description: "Help for StratOS",
    arguments: []
  })
  async help(args: any, ctx: ExecutionContext) {

    ctx.logger.info("Strategy help");

    return [
      {
        role: "user" as const,
        content: "How do I use StratOS?"
      },
      {
        role: "assistant" as const,
        content:
          "Use the generate_strategy tool with company, industry and objective."
      }
    ];

  }

}