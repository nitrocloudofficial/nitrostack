import { ToolDecorator as Tool, Injectable, z, type ExecutionContext } from '@nitrostack/core';
import { ProjectContextIdInputSchema, SdlcModelEnum, type ProjectContextIdInput } from '../../domain/schemas.js';
import { ReportingService } from './reporting.service.js';

const SelectSdlcModelInputSchema = z.object({
  project_context_id: z.string().describe('ID returned by parse_srd'),
  selected_model: SdlcModelEnum.describe('The SDLC model selected from candidates'),
});
type SelectSdlcModelInput = z.infer<typeof SelectSdlcModelInputSchema>;

@Injectable({ deps: [ReportingService] })
export class ReportingTools {
  constructor(private readonly reportingService: ReportingService) {}

  @Tool({
    name: 'select_sdlc_model',
    description: 'Record the user-selected SDLC model to lock in for planning reports',
    inputSchema: SelectSdlcModelInputSchema,
    examples: {
      request: { project_context_id: 'proj_abc123def456', selected_model: 'Agile-Scrum' },
      response: { locked_in: true },
    },
  })
  async selectSdlcModel(input: SelectSdlcModelInput, ctx: ExecutionContext) {
    return this.reportingService.recordSelection(input, ctx);
  }

  @Tool({
    name: 'generate_planning_report',
    description: 'Assemble the final Project Planning Report including SRD, SDLC, roadmap, and risk analysis',
    inputSchema: ProjectContextIdInputSchema,
    examples: { request: { project_context_id: 'proj_abc123def456' }, response: { report_type: 'planning' } },
  })
  async planningReport(input: ProjectContextIdInput, ctx: ExecutionContext) {
    return this.reportingService.assemblePlanningReport(input.project_context_id, ctx);
  }

  @Tool({
    name: 'generate_allocation_report',
    description: 'Assemble the final Team Allocation & Progress Report',
    inputSchema: ProjectContextIdInputSchema,
    examples: { request: { project_context_id: 'proj_abc123def456' }, response: { report_type: 'allocation' } },
  })
  async allocationReport(input: ProjectContextIdInput, ctx: ExecutionContext) {
    return this.reportingService.assembleAllocationReport(input.project_context_id, ctx);
  }
}
