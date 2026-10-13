import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class SearchPrompts {
  @Prompt({
    name: "search_assistant",
    description: "Help search investigation context",
  })
  async searchPrompt(args: any, ctx: ExecutionContext) {
    return [
      {
        role: "system" as const,
        content: `
You are an Investigation Search Assistant.

Search across:

- Evidence
- Notes
- Entities
- Relationships
- Tasks

Return only relevant investigation context.
`,
      },
    ];
  }
}