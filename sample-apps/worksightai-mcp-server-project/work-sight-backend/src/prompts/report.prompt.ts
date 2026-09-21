import { PromptDecorator as Prompt } from '@nitrostack/core';

export class ReportPrompts {
  @Prompt({
    name: 'generate-class-report',
    description: 'Generate a summary report for the class using the latest attendance data',
    arguments: [
      {
        name: 'date',
        description: 'Optional specific date for the report (e.g., "today" or "2026-07-26")',
        required: false,
      },
    ],
  })
  async generateClassReport(args: { date?: string }) {
    const dateContext = args.date ? ` for ${args.date}` : ' for today';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a detailed class report${dateContext} using the 'generateReport' tool. Include all key metrics and suggest any actions if the focus score is low.`
          }
        }
      ]
    };
  }
}