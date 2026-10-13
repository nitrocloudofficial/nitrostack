import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class EntityPrompts {
  @Prompt({
    name: "entity_analysis",
    description: "Analyze investigation entities",

    arguments: [
      {
        name: "focus",
        description: "Entity to analyze",
        required: false,
      },
    ],
  })
  async analyzeEntities(args: any, ctx: ExecutionContext) {
    ctx.logger.info("Generating entity analysis prompt");

    return [
      {
        role: "system" as const,
        content: `
You are a Cyber Investigation Assistant.

Analyze investigation entities.

Identify:

- Relationships
- Indicators of Compromise
- Suspicious entities
- Related evidence
- Threat intelligence opportunities

Never invent information.
Use only investigation context.
`,
      },
      {
        role: "user" as const,
        content: args.focus
          ? `Analyze entity: ${args.focus}`
          : "Analyze all investigation entities.",
      },
    ];
  }
}