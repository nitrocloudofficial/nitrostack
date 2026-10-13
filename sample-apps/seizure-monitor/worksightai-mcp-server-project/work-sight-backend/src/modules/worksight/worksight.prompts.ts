import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class WorkSightPrompts {
  @Prompt({
    name: 'generate-class-report',
    description: 'Generate a summary report for the workplace/classroom using latest attendance data',
    arguments: [
      {
        name: 'date',
        description: 'Optional date for report context (e.g., "today" or "2026-07-26")',
        required: false,
      },
    ],
  })
  async generateClassReport(args: { date?: string }, ctx: ExecutionContext) {
    const dateContext = args?.date ? ` for ${args.date}` : ' for today';
    return [
      {
        role: 'user' as const,
        content: `Please generate a detailed workplace intelligence report${dateContext} using the 'worksight_generate_report' tool. Include key metrics on attendance, focus score, phone distraction alerts, and recommended corrective actions.`,
      },
    ];
  }

  @Prompt({
    name: 'workplace-focus-audit',
    description: 'Analyze workplace productivity and focus score trends and suggest interventions',
    arguments: [],
  })
  async focusAudit(args: any, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Run a workplace focus audit by inspecting live attendance metrics with 'worksight_get_attendance_summary' and 'worksight_get_phone_alerts'. Provide recommendations on break intervals and phone distraction prevention.`,
      },
    ];
  }
}
