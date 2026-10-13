import { ToolDecorator as Tool, Injectable, ExecutionContext } from '@nitrostack/core';
import { ProjectGrowthInput, ProjectGrowthOutput } from '../../shared/contracts.js';
import { NavCacheService } from './growth.service.js';
import { FundCategory } from './growth.constants.js';

const YEARS_MAX = 40;

export function sipFutureValue(monthlyAmount: number, annualRate: number, years: number): number {
  const months = years * 12;
  const monthlyRate = annualRate / 12;
  if (Math.abs(monthlyRate) < 1e-9) return monthlyAmount * months;
  return monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
}

@Injectable({ deps: [NavCacheService] })
export class GrowthTools {
  constructor(private readonly navCacheService: NavCacheService) {}

  @Tool({
    name: 'project_investment_growth',
    description:
      'Projects a low/high range for a monthly SIP investment using live mutual fund NAV data. Never returns a single confident number.',
    inputSchema: ProjectGrowthInput,
    examples: {
      request: { monthlyAmount: 2000, years: 15, fundCategory: 'index' },
      response: {
        lowEstimate: 693000,
        highEstimate: 812000,
        assumptions: [
          'Return band of 10.2%-12.8% p.a. derived from trailing 3-year and 5-year CAGR of UTI Nifty 50 Index Fund.',
          'Assumes a consistent monthly contribution with no withdrawals or missed months.',
          'Ignores taxes, expense ratios, and exit loads.',
          'Past performance does not guarantee future returns — this is a range, not a promise.'
        ],
        navSource: 'Live NAV — UTI Nifty 50 Index Fund (mfapi.in), as of 24-07-2026',
        risk_note:
          'This is an educational projection, not investment advice. Mutual fund investments are subject to market risk.',
        educational_only: true
      }
    }
  })
  async projectInvestmentGrowth(
    input: { monthlyAmount: number; years: number; fundCategory: FundCategory },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Projecting investment growth', input);

    if (input.monthlyAmount <= 0) {
      throw new Error('monthlyAmount must be a positive number');
    }
    if (!Number.isInteger(input.years) || input.years <= 0 || input.years > YEARS_MAX) {
      throw new Error(`years must be a whole number between 1 and ${YEARS_MAX}`);
    }

    const { low, high, source, asOf, schemeName } = await this.navCacheService.getCagrBand(input.fundCategory);

    const estimateAtLowRate = sipFutureValue(input.monthlyAmount, low, input.years);
    const estimateAtHighRate = sipFutureValue(input.monthlyAmount, high, input.years);

    const navSourceLabel = {
      live: `Live NAV — ${schemeName} (mfapi.in), as of ${asOf}`,
      cached: `Cached NAV — ${schemeName} (mfapi.in unreachable), last fetched ${asOf}`,
      static: `Static historical assumption — ${schemeName}, mfapi.in unreachable and no cache available`
    }[source];

    return {
      lowEstimate: Math.round(Math.min(estimateAtLowRate, estimateAtHighRate)),
      highEstimate: Math.round(Math.max(estimateAtLowRate, estimateAtHighRate)),
      assumptions: [
        `Return band of ${(low * 100).toFixed(1)}%-${(high * 100).toFixed(1)}% p.a. derived from trailing 3-year and 5-year CAGR of ${schemeName}.`,
        'Assumes a consistent monthly contribution with no withdrawals or missed months.',
        'Ignores taxes, expense ratios, and exit loads.',
        'Past performance does not guarantee future returns — this is a range, not a promise.'
      ],
      navSource: navSourceLabel,
      risk_note:
        'This is an educational projection, not investment advice. Mutual fund investments are subject to market risk.',
      educational_only: true as const
    };
  }
}
