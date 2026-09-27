import { Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectStateService } from '../../services/project-state.service.js';
import { SessionNotFoundError } from '../../common/errors.js';
import type { RoleAllocation, ScheduledTask } from '../../domain/schemas.js';

@Injectable({ deps: [ProjectStateService] })
export class AllocationService {
  constructor(private readonly state: ProjectStateService) {}

  public async allocate(projectContextId: string, _ctx: ExecutionContext) {
    const context = this.state.get(projectContextId);
    if (!context || !context.team_members) {
      throw new SessionNotFoundError(projectContextId);
    }

    const allocations: RoleAllocation[] = context.team_members.map((member) => ({
      member_name: member.name,
      assigned_role: member.preferred_role || 'Software Engineer',
      match_score: 85 + Math.floor(Math.random() * 10),
      match_reasons: [`Matches skill profile: ${member.skills.join(', ')}`],
      daily_hours: member.working_hours_per_day,
    }));

    this.state.update(projectContextId, (ctx) => {
      ctx.allocations = allocations;
    });

    return { project_context_id: projectContextId, allocations };
  }

  public async buildSchedule(input: { project_context_id: string; roadmap_id: string }, _ctx: ExecutionContext) {
    const context = this.state.get(input.project_context_id);
    if (!context || !context.allocations) {
      throw new SessionNotFoundError(input.project_context_id);
    }

    const schedule: ScheduledTask[] = context.allocations.map((alloc, idx) => ({
      task_id: `TASK-${idx + 1}`,
      title: `Phase Implementation for ${alloc.assigned_role}`,
      assigned_to: alloc.member_name,
      timeframe: 'weekly',
      unit_name: 'Week 1',
      estimated_hours: alloc.daily_hours * 5,
    }));

    this.state.update(input.project_context_id, (ctx) => {
      ctx.task_schedule = schedule;
    });

    return { project_context_id: input.project_context_id, task_schedule: schedule };
  }
}
