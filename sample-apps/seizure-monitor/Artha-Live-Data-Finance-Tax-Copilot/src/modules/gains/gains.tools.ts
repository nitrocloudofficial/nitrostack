import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { GainsService } from './gains.service.js';

const EstimateSchema = z.object({
    fundType: z.enum(['equity', 'debt', 'hybrid_equity', 'hybrid_debt']).describe('Fund category — equity rules (STCG 20% / LTCG 12.5%) vs debt (slab rate)'),
    investedAmount: z.number().positive().describe('Amount originally invested in ₹'),
    investedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Purchase date (ISO yyyy-mm-dd)'),
    schemeCode: z.number().int().optional().describe('AMFI scheme code — if given, the current value is fetched live from NAV history'),
    currentValue: z.number().positive().optional().describe('Current value in ₹ (use instead of schemeCode for a manual estimate)'),
    sellDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Planned sell date (ISO). Defaults to the latest NAV date / today'),
    income: z.number().min(0).optional().describe('Annual income in ₹ — used to derive the slab rate for debt funds'),
    marginalRatePct: z.number().min(0).max(50).optional().describe('Explicit slab rate % for debt funds (overrides income)'),
});

@Injectable({ deps: [GainsService] })
export class GainsTools {
    constructor(private readonly gainsService: GainsService) { }

    @Tool({
        name: 'estimate_capital_gains',
        description:
            'Capital Gains Estimator — before selling/redeeming a mutual fund, estimates the capital-gains tax you\'d owe ' +
            '(FY 2025-26 rules). Applies equity rules (STCG 20% / LTCG 12.5% above the ₹1.25L exemption) or debt rules ' +
            '(slab rate) based on fund type and holding period. Provide a schemeCode to value the holding from LIVE NAV, ' +
            'or pass currentValue directly.',
        inputSchema: EstimateSchema,
        examples: {
            request: { fundType: 'equity', investedAmount: 500000, investedDate: '2023-01-01', currentValue: 750000 },
            response: {
                gainType: 'LTCG',
                capitalGain: 250000,
                exemptionApplied: 125000,
                taxableGain: 125000,
                totalTax: 16250,
                netProceeds: 733750,
            },
        },
    })
    @Widget('capital-gains')
    async estimateCapitalGains(args: z.infer<typeof EstimateSchema>, ctx: ExecutionContext) {
        if (args.schemeCode == null && args.currentValue == null) {
            throw new Error('Provide either schemeCode (for live valuation) or currentValue.');
        }
        ctx.logger.info('Estimating capital gains', { fundType: args.fundType, schemeCode: args.schemeCode });
        return this.gainsService.estimate(args);
    }
}
