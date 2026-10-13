import { Injectable, ControllerDecorator as Controller, UseGuards } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { RiskService } from './risk.service.js';
import { 
  IdentifyRisksSchema, 
  CalculateRiskScoreSchema, 
  GenerateMitigationPlanSchema 
} from './risk.schema.js';
import { 
  IdentifyRisksArgs, 
  CalculateRiskScoreArgs, 
  GenerateMitigationPlanArgs 
} from './risk.types.js';
import { ApiKeyGuard } from '../../core/auth/api-key.guard.js';

@Injectable({ deps: [RiskService] })
@Controller()
export class RiskTools {
  constructor(private readonly riskService: RiskService) {}

  @Tool({
    name: 'identifyRisks',
    description: 'Identifies potential risks within a given domain.',
    inputSchema: IdentifyRisksSchema
  })
  @UseGuards(ApiKeyGuard)
  public async identifyRisks(args?: IdentifyRisksArgs) {
    return this.riskService.identifyRisks(args || { domain: '', factors: [] });
  }

  @Tool({
    name: 'calculateRiskScore',
    description: 'Calculates an aggregate risk score based on identified risks.',
    inputSchema: CalculateRiskScoreSchema
  })
  @UseGuards(ApiKeyGuard)
  public async calculateRiskScore(args?: CalculateRiskScoreArgs) {
    return this.riskService.calculateRiskScore(args || { identifiedRisks: [] });
  }

  @Tool({
    name: 'generateMitigationPlan',
    description: 'Generates a plan to mitigate identified risks.',
    inputSchema: GenerateMitigationPlanSchema
  })
  @UseGuards(ApiKeyGuard)
  public async generateMitigationPlan(args?: GenerateMitigationPlanArgs) {
    return this.riskService.generateMitigationPlan(args || { risks: [] });
  }
}
