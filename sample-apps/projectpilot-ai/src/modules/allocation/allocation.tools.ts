import { ToolDecorator as Tool, Injectable, z, type ExecutionContext } from '@nitrostack/core';
import { ProjectContextIdInputSchema, type ProjectContextIdInput } from '../../domain/schemas.js';
import { AllocationService } from './allocation.service.js';

const GenerateScheduleInputSchema = z.object({
  project_context_id: z.string().describe('ID returned by parse_srd'),
  roadmap_id: z.string().describe('ID of the roadmap to schedule against'),
});
type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

@Injectable({ deps: [AllocationService] })
export class AllocationTools {
  constructor(private readonly allocationService: AllocationService) {}

  @Tool({
    name: 'allocate_roles',
    description:
      'Assign each registered team member to a project role based on skill match, experience and stated preference',
    inputSchema: ProjectContextIdInputSchema,
    examples: {
      request: { project_context_id: 'proj_abc123def456' },
      response: { allocations: [{ member_name: 'Asha Rao', assigned_role: 'Frontend Developer', match_score: 88 }] },
    },
  })
  async allocateRoles(input: ProjectContextIdInput, ctx: ExecutionContext) {
    return this.allocationService.allocate(input.project_context_id, ctx);
  }

  @Tool({
    name: 'generate_task_schedule',
    description:
      'Generate a daily, weekly and monthly task breakdown across the allocated team, aligned to roadmap milestones',
    inputSchema: GenerateScheduleInputSchema,
    examples: {
      request: { project_context_id: 'proj_abc123def456', roadmap_id: 'proj_abc123def456' },
      response: { task_schedule: [] },
    },
  })
  async generateSchedule(input: GenerateScheduleInput, ctx: ExecutionContext) {
    return this.allocationService.buildSchedule(input, ctx);
  }
}
