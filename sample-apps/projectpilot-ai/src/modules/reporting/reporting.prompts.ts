import { PromptDecorator as Prompt, Injectable, type ExecutionContext } from '@nitrostack/core';

@Injectable()
export class ReportingPrompts {
  @Prompt({
    name: 'plan_project',
    description:
      'Guide the assistant through the full ProjectPilot AI planning workflow in order',
    arguments: [{ name: 'project_context_id', description: 'ID returned by parse_srd', required: true }],
  })
  async planProject(args: Record<string, string | number | boolean | null>, _ctx: ExecutionContext) {
    const projectContextId = args.project_context_id ?? '{project_context_id}';

    return [
      {
        role: 'system' as const,
        content:
          'Call tools in this sequence: parse_srd -> register_team -> list_sdlc_candidates -> ' +
          'ask user to select SDLC -> select_sdlc_model -> build_roadmap -> ' +
          'allocate_roles -> generate_task_schedule -> generate_planning_report -> generate_allocation_report.',
      },
      {
        role: 'user' as const,
        content: `Plan project ${projectContextId} end to end.`,
      },
    ];
  }
}
