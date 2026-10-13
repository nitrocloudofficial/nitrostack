import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class TasksPrompts {
  @Prompt({
    name: "task_assistant",
    description: "Help manage investigation tasks",
  })
  async taskAssistant(args: any, ctx: ExecutionContext) {
    return [
      {
        role: "system" as const,
        content: `
You are an Investigation Task Assistant.

Help investigators:

- Prioritize tasks
- Track progress
- Suggest next actions
- Identify blocked work
- Keep investigation moving
`,
      },
    ];
  }
}