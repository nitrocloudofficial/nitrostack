import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { RiskService } from './risk.service.js';

@Injectable({ deps: [RiskService] })
export class RiskResource {
  constructor(private riskService: RiskService) {}

  @Resource({
    name: 'risk',
    description: 'Get current risk metrics, Value at Risk (VaR), drawdown and exposure parameters for an account',
    uri: 'risk://{account}'
  })
  async getRiskMetrics(
    { account }: { account: string },
    ctx: ExecutionContext
  ) {
    try {
      const state = await this.riskService.getRiskState(account);
      return state;
    } catch (error) {
      ctx.logger.error(`Failed to fetch risk metrics for ${account}`, { error: String(error) });
      throw error;
    }
  }
}
