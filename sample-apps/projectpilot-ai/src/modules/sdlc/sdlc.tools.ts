import { ToolDecorator as Tool, Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectContextIdInputSchema, type ProjectContextIdInput } from '../../domain/schemas.js';
import { SdlcService } from './sdlc.service.js';

@Injectable({ deps: [SdlcService] })
export class SdlcTools {
  constructor(private readonly sdlcService: SdlcService) {}

  @Tool({
    name: 'list_sdlc_candidates',
    description:
      'Generate a brief report comparing the top 3 SDLC models suited to this project, with fit scores and justification',
    inputSchema: ProjectContextIdInputSchema,
    examples: {
      request: { project_context_id: 'proj_abc123def456' },
      response: { top_candidates: [{ model: 'Agile-Scrum', fit_score: 92 }] },
    },
  })
  async listCandidates(input: ProjectContextIdInput, ctx: ExecutionContext) {
    return this.sdlcService.evaluateCandidates(input.project_context_id, ctx);
  }
}