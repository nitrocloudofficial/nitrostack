import { Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectStateService } from '../../services/project-state.service.js';
import { SessionNotFoundError } from '../../common/errors.js';
import type { SdlcCandidate } from '../../domain/schemas.js';

@Injectable({ deps: [ProjectStateService] })
export class SdlcService {
  constructor(private readonly state: ProjectStateService) {}

  public async evaluateCandidates(projectContextId: string, _ctx: ExecutionContext) {
    const context = this.state.get(projectContextId);
    if (!context || !context.srd_summary) {
      throw new SessionNotFoundError(projectContextId);
    }

    const duration = context.srd_summary.project_duration_weeks;
    const reqCount = context.srd_summary.parsed_requirements.length;

    const topCandidates: SdlcCandidate[] = [
      {
        model: 'Agile-Scrum',
        fit_score: duration <= 12 ? 92 : 85,
        justification: 'Ideal for iterative scope development and active stakeholder feedback.',
        pros: ['High adaptability to changing requirements', 'Regular sprint deliverables'],
        cons: ['Requires continuous involvement from product owner'],
      },
      {
        model: 'Kanban',
        fit_score: reqCount < 10 ? 88 : 78,
        justification: 'Best suited for continuous deployment and task-flow management.',
        pros: ['Minimal overhead', 'Visual bottleneck tracking'],
        cons: ['Less structured milestone commitments'],
      },
      {
        model: 'Waterfall',
        fit_score: duration > 20 ? 80 : 60,
        justification: 'Suitable for fixed-scope projects with explicit upfront specifications.',
        pros: ['Clear sequential phases', 'Predictable documentation'],
        cons: ['Inflexible to mid-project scope shifts'],
      },
    ];

    this.state.update(projectContextId, (ctx) => {
      ctx.sdlc_candidates = topCandidates;
    });

    return {
      project_context_id: projectContextId,
      top_candidates: topCandidates,
    };
  }
}
