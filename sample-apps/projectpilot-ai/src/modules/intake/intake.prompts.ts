import { PromptDecorator as Prompt, Injectable, type ExecutionContext } from '@nitrostack/core';

@Injectable()
export class IntakePrompts {
  @Prompt({
    name: 'project_intake',
    description: 'Guide the assistant through SRD parsing and team registration',
    arguments: [{ name: 'project_context_id', description: 'ID returned by parse_srd', required: true }],
  })
  async intakeFlow(args: Record<string, string | number | boolean | null>, _ctx: ExecutionContext) {
    const projectContextId = args.project_context_id ?? '{project_context_id}';

    return [
      {
        role: 'system' as const,
        content:
          'Use parse_srd to ingest the SRD, then register_team to capture the project roster. Return a concise summary of the extracted requirements.',
      },
      {
        role: 'user' as const,
        content: `Initialize project ${projectContextId} with the intake workflow.`,
      },
    ];
  }
}
