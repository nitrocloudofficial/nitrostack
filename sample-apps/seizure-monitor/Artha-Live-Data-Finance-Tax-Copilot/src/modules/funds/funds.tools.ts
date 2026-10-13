import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, Cache, RateLimit, z } from '@nitrostack/core';
import { FundsService } from './funds.service.js';

const SearchSchema = z.object({
    query: z.string().min(2).describe('Part of a scheme name, e.g. "HDFC Top 100" or "Parag Parikh Flexi"'),
    limit: z.number().int().min(1).max(50).optional().default(15).describe('Max results to return'),
});

const NavSchema = z.object({
    schemeCode: z.number().int().describe('AMFI scheme code (from search_mutual_funds), e.g. 125497'),
});

const ReturnsSchema = z.object({
    schemeCode: z.number().int().describe('AMFI scheme code (from search_mutual_funds)'),
    investedAmount: z.number().positive().describe('Lump-sum amount invested in ₹'),
    investedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date the lump sum was invested (ISO yyyy-mm-dd)'),
}).strict();

@Injectable({ deps: [FundsService] })
export class FundsTools {
    constructor(private readonly fundsService: FundsService) { }

    @Tool({
        name: 'search_mutual_funds',
        description:
            'Search Indian mutual fund schemes by name. Popular funds resolve via a curated verified-code map ' +
            '(handles renamed funds, e.g. "HDFC Top 100" → "HDFC Large Cap Fund"), backed by the live, ' +
            'relevance-ranked MFAPI.in dataset for the long tail. ALWAYS call this first to obtain a scheme code, ' +
            'then pass the returned schemeCode verbatim to get_fund_nav or calculate_fund_returns.',
        inputSchema: SearchSchema,
        examples: {
            request: { query: 'Parag Parikh Flexi Cap' },
            response: {
                query: 'Parag Parikh Flexi Cap',
                count: 2,
                results: [
                    { schemeCode: 122639, schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
                ],
            },
        },
    })
    @Widget('fund-search')
    @Cache({ ttl: 3600 })
    @RateLimit({ requests: 30, window: '1m' })
    async searchMutualFunds(args: z.infer<typeof SearchSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Searching mutual funds', { query: args.query });
        const results = await this.fundsService.search(args.query, args.limit);
        return { query: args.query, count: results.length, results };
    }

    @Tool({
        name: 'get_fund_nav',
        description:
            'Get the latest Net Asset Value (NAV) for a mutual fund scheme from live MFAPI.in data. ' +
            'The schemeCode MUST be obtained from search_mutual_funds output for the exact scheme the user means — ' +
            'NEVER guess a code or reuse one from memory. A wrong code silently returns a completely different fund.',
        inputSchema: NavSchema,
        examples: {
            request: { schemeCode: 122639 },
            response: {
                schemeCode: 122639,
                schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
                fundHouse: 'PPFAS Mutual Fund',
                nav: 89.78,
                date: '2026-07-24',
            },
        },
    })
    @Widget('fund-nav')
    @Cache({ ttl: 900 })
    @RateLimit({ requests: 30, window: '1m' })
    async getFundNav(args: z.infer<typeof NavSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Fetching latest NAV', { schemeCode: args.schemeCode });
        return this.fundsService.getLatestNav(args.schemeCode);
    }

    @Tool({
        name: 'calculate_fund_returns',
        description:
            'Compute REAL returns for a lump-sum mutual fund investment using live NAV history. ' +
            'Finds the NAV on/before the investment date, values the units at the latest NAV, and returns ' +
            'absolute return, CAGR and XIRR (annualized). ' +
            'The schemeCode MUST come from search_mutual_funds output for the exact fund — NEVER guess a code ' +
            'or reuse one from memory, or you will compute returns for the wrong fund.',
        inputSchema: ReturnsSchema,
        examples: {
            request: { schemeCode: 122639, investedAmount: 200000, investedDate: '2023-04-01' },
            response: {
                investedAmount: 200000,
                currentValue: 312500,
                absoluteReturn: 0.5625,
                cagr: 0.231,
                xirr: 0.238,
                holdingYears: 2.32,
            },
        },
    })
    @Widget('fund-returns')
    @RateLimit({ requests: 30, window: '1m' })
    async calculateFundReturns(args: z.infer<typeof ReturnsSchema>, ctx: ExecutionContext) {
        // Defensive: accept both investedDate and investmentDate (chat may use either)
        const investedDate = (args as any).investedDate || (args as any).investmentDate;
        if (!investedDate) {
            throw new Error('Missing required parameter: investedDate (ISO yyyy-mm-dd format)');
        }
        ctx.logger.info('Computing fund returns', {
            schemeCode: args.schemeCode,
            investedAmount: args.investedAmount,
            investedDate,
        });
        return this.fundsService.computeLumpsumReturns({
            schemeCode: args.schemeCode,
            investedAmount: args.investedAmount,
            investedDate,
        });
    }
}
