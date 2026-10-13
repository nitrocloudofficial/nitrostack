import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class RelationshipPrompts {

  @Prompt({

    name: "relationship_analysis",

    description: "Analyze entity relationships",

  })
  async analyze(args: any, ctx: ExecutionContext) {

    return [

      {

        role: "system",

        content: `
Analyze the investigation graph.

Find:

- Attack paths
- Suspicious chains
- Missing links
- Related entities
- IOC propagation

Never invent relationships.
`,

      },

    ];

  }

}