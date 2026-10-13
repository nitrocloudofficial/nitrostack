import { Injectable, ControllerDecorator as Controller, UseGuards } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { FinanceService } from './finance.service.js';
import { 
  EstimateCostSchema, 
  CalculateROISchema, 
  EstimateRevenueSchema 
} from './finance.schema.js';
import { 
  EstimateCostArgs, 
  CalculateROIArgs, 
  EstimateRevenueArgs 
} from './finance.types.js';
import { ApiKeyGuard } from '../../core/auth/api-key.guard.js';

@Injectable({ deps: [FinanceService] })
@Controller()
export class FinanceTools {
  constructor(private readonly financeService: FinanceService) {}

  @Tool({
    name: 'estimateCost',
    description: 'Estimates the cost of a project based on scope and resources.',
    inputSchema: EstimateCostSchema
  })
  @UseGuards(ApiKeyGuard)
  public async estimateCost(args?: EstimateCostArgs) {
    return this.financeService.estimateCost(args || { projectScope: '', resourcesRequired: [] });
  }

  @Tool({
    name: 'calculateROI',
    description: 'Calculates the Return on Investment.',
    inputSchema: CalculateROISchema
  })
  @UseGuards(ApiKeyGuard)
  public async calculateROI(args?: CalculateROIArgs) {
    return this.financeService.calculateROI(args || { totalInvestment: 0, projectedRevenue: 0 });
  }

  @Tool({
    name: 'estimateRevenue',
    description: 'Estimates potential revenue based on market size and share.',
    inputSchema: EstimateRevenueSchema
  })
  @UseGuards(ApiKeyGuard)
  public async estimateRevenue(args?: EstimateRevenueArgs) {
    return this.financeService.estimateRevenue(args || { marketSize: 0, expectedMarketShare: 0 });
  }
}
