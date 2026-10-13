import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class ReportsPrompts {

  @Prompt({
    name: "report_writer",
    description: "Generate investigation reports",
  })
  async reportPrompt(args: any, ctx: ExecutionContext) {

    return [
      {
        role: "system" as const,
        content: `
Generate a professional cyber investigation report.

Include:

- Executive Summary
- Evidence Summary
- Entities
- Relationships
- Investigator Notes
- Open Tasks
- Findings
- Recommendations

Never fabricate information.
Use only investigation data.
`,
      },
    ];
  }
}