import { Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectStateService } from '../../services/project-state.service.js';
import { SessionNotFoundError, StatePrerequisiteError } from '../../common/errors.js';
import type { SdlcModel } from '../../domain/schemas.js';

@Injectable({ deps: [ProjectStateService] })
export class ReportingService {
  constructor(private readonly state: ProjectStateService) {}

  public async recordSelection(
    input: { project_context_id: string; selected_model: SdlcModel },
    _ctx: ExecutionContext
  ) {
    const context = this.state.get(input.project_context_id);
    if (!context) {
      throw new SessionNotFoundError(input.project_context_id);
    }

    this.state.update(input.project_context_id, (ctx) => {
      ctx.selected_sdlc_model = input.selected_model;
    });

    return { project_context_id: input.project_context_id, selected_model: input.selected_model, locked_in: true };
  }

  public async assemblePlanningReport(projectContextId: string, _ctx: ExecutionContext) {
    const context = this.state.get(projectContextId);
    if (!context) {
      throw new SessionNotFoundError(projectContextId);
    }
    if (!context.selected_sdlc_model) {
      throw new StatePrerequisiteError('An SDLC model must be selected via select_sdlc_model before generating the planning report.');
    }

    const markdown = `# Project Planning Report

**Session ID:** \`${context.project_context_id}\`  
**Selected SDLC:** ${context.selected_sdlc_model}  
**Target Deadline:** ${context.srd_summary?.deadline || 'N/A'} (${context.srd_summary?.project_duration_weeks || 0} weeks)

## Requirements Summary
Total extracted requirements: ${context.srd_summary?.parsed_requirements.length || 0}

## Roadmap & Milestones
Phases defined: ${context.roadmap?.phases.length || 0}  
Milestones defined: ${context.roadmap?.milestones.length || 0}
`;

    return {
      report_type: 'planning',
      project_context_id: projectContextId,
      markdown,
      data: context,
    };
  }

  public async assembleAllocationReport(projectContextId: string, _ctx: ExecutionContext) {
    const context = this.state.get(projectContextId);
    if (!context) {
      throw new SessionNotFoundError(projectContextId);
    }

    const markdown = `# Team Allocation & Progress Report

**Session ID:** \`${context.project_context_id}\`

## Allocations
${context.allocations?.map((a) => `- **${a.member_name}**: ${a.assigned_role} (${a.match_score}% match)`).join('\n') || 'No allocations calculated.'}

## Task Schedule
Total scheduled tasks: ${context.task_schedule?.length || 0}
`;

    return {
      report_type: 'allocation',
      project_context_id: projectContextId,
      markdown,
      data: context,
    };
  }
}
