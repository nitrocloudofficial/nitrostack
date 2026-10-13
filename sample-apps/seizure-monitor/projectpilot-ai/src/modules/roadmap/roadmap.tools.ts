import { ToolDecorator as Tool, Injectable, z, type ExecutionContext } from '@nitrostack/core';
import { SdlcModelEnum } from '../../domain/schemas.js';
import { RoadmapService } from './roadmap.service.js';

const BuildRoadmapInputSchema = z.object({
  project_context_id: z.string().describe('ID returned by parse_srd'),
  selected_model: SdlcModelEnum.describe('The SDLC model previously recorded via select_sdlc_model'),
});
type BuildRoadmapInput = z.infer<typeof BuildRoadmapInputSchema>;

@Injectable({ deps: [RoadmapService] })
export class RoadmapTools {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Tool({
    name: 'build_roadmap',
    description:
      'Build the project roadmap: phases, milestones, dependencies and risks, tailored to the selected SDLC model and deadline',
    inputSchema: BuildRoadmapInputSchema,
    examples: {
      request: { project_context_id: 'proj_abc123def456', selected_model: 'Agile-Scrum' },
      response: { roadmap: { phases: [], milestones: [], risks: [] } },
    },
  })
  async buildRoadmap(input: BuildRoadmapInput, ctx: ExecutionContext) {
    return this.roadmapService.build(input, ctx);
  }
}
