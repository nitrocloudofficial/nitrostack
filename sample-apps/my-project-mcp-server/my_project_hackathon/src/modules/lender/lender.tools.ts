import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { LenderDataService } from './lender.data.service.js';

@Injectable({ deps: [LenderDataService] })
export class LenderTools {
  constructor(private lenderData: LenderDataService) {}

  @Tool({
    name: 'get_loan_offers',
    description: 'Get all loan offers with a transparent true-cost comparison (not just flat rate)',
    inputSchema: z.object({})
  })
  @Widget('loan-offers')
  async getLoanOffers(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Fetching loan offers with true-cost comparison');
    const offers = this.lenderData.getAllOffers();
    const sorted = [...offers].sort((a, b) => a.effectiveAnnualRate - b.effectiveAnnualRate);

    return {
      offers: sorted,
      cheapestOfferId: sorted[0]?.offerId ?? null,
      flaggedPredatory: sorted.filter((o) => o.isPredatory).map((o) => o.offerId)
    };
  }
}
