import { Injectable, ControllerDecorator as Controller, UseGuards } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { ResearchService } from './research.service.js';
import { 
  ResearchTopicSchema, 
  GatherEvidenceSchema, 
  SummarizeResearchSchema 
} from './research.schema.js';
import { 
  ResearchTopicArgs, 
  GatherEvidenceArgs, 
  SummarizeResearchArgs 
} from './research.types.js';
import { ApiKeyGuard } from '../../core/auth/api-key.guard.js';

@Injectable({ deps: [ResearchService] })
@Controller()
export class ResearchTools {
  constructor(private readonly researchService: ResearchService) {}

  @Tool({
    name: 'researchTopic',
    description: 'Searches for information on a given topic.',
    inputSchema: ResearchTopicSchema
  })
  @UseGuards(ApiKeyGuard)
  public async researchTopic(args?: ResearchTopicArgs) {
    return this.researchService.researchTopic(args || { topic: '' });
  }

  @Tool({
    name: 'gatherEvidence',
    description: 'Finds evidence to verify a specific claim.',
    inputSchema: GatherEvidenceSchema
  })
  @UseGuards(ApiKeyGuard)
  public async gatherEvidence(args?: GatherEvidenceArgs) {
    return this.researchService.gatherEvidence(args || { claim: '' });
  }

  @Tool({
    name: 'summarizeResearch',
    description: 'Summarizes raw data points into coherent insights.',
    inputSchema: SummarizeResearchSchema
  })
  @UseGuards(ApiKeyGuard)
  public async summarizeResearch(args?: SummarizeResearchArgs) {
    return this.researchService.summarizeResearch(args || { rawData: [] });
  }
}
