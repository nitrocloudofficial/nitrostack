import { Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectStateService } from '../../services/project-state.service.js';
import { SessionNotFoundError } from '../../common/errors.js';
import type { SdlcModel, RoadmapPhase, RoadmapMilestone, ProjectRisk } from '../../domain/schemas.js';

@Injectable({ deps: [ProjectStateService] })
export class RoadmapService {
  constructor(private readonly state: ProjectStateService) {}

  public async build(input: { project_context_id: string; selected_model: SdlcModel }, _ctx: ExecutionContext) {
    const context = this.state.get(input.project_context_id);
    if (!context || !context.srd_summary) {
      throw new SessionNotFoundError(input.project_context_id);
    }

    const duration = context.srd_summary.project_duration_weeks;

    const phases: RoadmapPhase[] = [
      {
        phase_number: 1,
        name: 'Inception & Architectural Baseline',
        duration_weeks: Math.max(1, Math.round(duration * 0.2)),
        objectives: ['Finalize technical specs', 'Set up CI/CD pipeline and dev environment'],
      },
      {
        phase_number: 2,
        name: 'Core Implementation',
        duration_weeks: Math.max(2, Math.round(duration * 0.6)),
        objectives: ['Deliver core requirements', 'Conduct automated unit & integration testing'],
      },
      {
        phase_number: 3,
        name: 'Hardening & Deployment',
        duration_weeks: Math.max(1, Math.round(duration * 0.2)),
        objectives: ['User acceptance testing (UAT)', 'Production launch'],
      },
    ];

    const milestones: RoadmapMilestone[] = [
      {
        id: 'M1',
        title: 'Architecture Review Sign-off',
        target_week: phases[0].duration_weeks,
        deliverables: ['System Architecture Document', 'Initial Scaffold'],
      },
      {
        id: 'M2',
        title: 'Feature Complete',
        target_week: phases[0].duration_weeks + phases[1].duration_weeks,
        deliverables: ['Core Module Code', 'Integration Suite'],
      },
    ];

    const risks: ProjectRisk[] = [
      {
        id: 'R1',
        category: 'Schedule Risk',
        description: 'Tight timeline for core feature scope',
        severity: 'medium',
        mitigation: 'Prioritize MVP functional requirements; push non-essential items to Phase 2',
      },
    ];

    const roadmapData = { phases, milestones, risks };

    this.state.update(input.project_context_id, (ctx) => {
      ctx.selected_sdlc_model = input.selected_model;
      ctx.roadmap = roadmapData;
    });

    return {
      project_context_id: input.project_context_id,
      selected_model: input.selected_model,
      roadmap: roadmapData,
    };
  }
}
