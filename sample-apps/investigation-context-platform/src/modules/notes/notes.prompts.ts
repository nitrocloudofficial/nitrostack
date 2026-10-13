import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class NotesPrompts {
  @Prompt({
    name: "notes_analysis",
    description: "Generate and analyze investigation notes",
  })
  async analyzeNotes(args: any, ctx: ExecutionContext) {
    ctx.logger.info("Generating notes prompt");

    return [
      {
        role: "system" as const,
        content: `
You are an Investigation Assistant.

When writing notes:

- Preserve investigation context.
- Separate facts from assumptions.
- Reference related evidence.
- Reference related entities.
- Write concise and professional notes.
`,
      },
    ];
  }
}