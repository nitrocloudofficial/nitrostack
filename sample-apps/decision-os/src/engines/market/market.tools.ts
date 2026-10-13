import { Injectable, ControllerDecorator as Controller, UseGuards } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { MarketService } from './market.service.js';
import { 
  AnalyzeMarketSchema, 
  IdentifyCompetitorsSchema, 
  EstimateDemandSchema 
} from './market.schema.js';
import { 
  AnalyzeMarketArgs, 
  IdentifyCompetitorsArgs, 
  EstimateDemandArgs 
} from './market.types.js';
import { ApiKeyGuard } from '../../core/auth/api-key.guard.js';

@Injectable({ deps: [MarketService] })
@Controller()
export class MarketTools {
  constructor(private readonly marketService: MarketService) {}

  @Tool({
    name: 'analyzeMarket',
    description: 'Analyzes the overall market for a given industry.',
    inputSchema: AnalyzeMarketSchema
  })
  @UseGuards(ApiKeyGuard)
  public async analyzeMarket(args?: AnalyzeMarketArgs) {
    return this.marketService.analyzeMarket(args || { industry: '', location: null });
  }

  @Tool({
    name: 'identifyCompetitors',
    description: 'Identifies key competitors in the market.',
    inputSchema: IdentifyCompetitorsSchema
  })
  @UseGuards(ApiKeyGuard)
  public async identifyCompetitors(args?: IdentifyCompetitorsArgs) {
    return this.marketService.identifyCompetitors(args || { industry: '', location: null });
  }

  @Tool({
    name: 'estimateDemand',
    description: 'Estimates consumer demand for a product type.',
    inputSchema: EstimateDemandSchema
  })
  @UseGuards(ApiKeyGuard)
  public async estimateDemand(args?: EstimateDemandArgs) {
    return this.marketService.estimateDemand(args || { productType: '', targetDemographics: [] });
  }
}
