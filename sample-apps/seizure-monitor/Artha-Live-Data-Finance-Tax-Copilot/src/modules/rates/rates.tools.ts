import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, Cache, RateLimit, z } from '@nitrostack/core';
import { RatesService } from './rates.service.js';

@Injectable({ deps: [RatesService] })
export class RatesTools {
    constructor(private readonly ratesService: RatesService) { }

    @Tool({
        name: 'get_benchmark_rates',
        description:
            'Repo/FD Rate Checker — returns the current RBI repo rate and representative bank fixed-deposit rates, ' +
            'so "safe" returns can be compared against mutual fund returns. Each value carries an as-of date and ' +
            'source (RBI has no free live API, so these are authoritative dated values, overridable via env).',
        inputSchema: z.object({}),
        examples: {
            request: {},
            response: {
                repoRate: 0.055,
                fdRates: [{ tenure: '1 year', general: 0.066, senior: 0.071 }],
                equityAssumption: 0.12,
                asOf: '2025-06-06',
            },
        },
    })
    @Widget('benchmark-rates')
    async getBenchmarkRates(_args: Record<string, never>, ctx: ExecutionContext) {
        ctx.logger.info('Fetching benchmark rates');
        return this.ratesService.getBenchmarkRates();
    }

    @Tool({
        name: 'compare_emi_vs_investment',
        description:
            'EMI vs Investment Comparator — answers "should I prepay my loan or invest the surplus?" by projecting the ' +
            'loan interest saved (a guaranteed return) against a realistic investment return (equity ~12% or FD) over ' +
            'a horizon, and recommending the better option.',
        inputSchema: z.object({
            loanRatePct: z.number().min(0).max(100).describe('Loan interest rate % per annum (e.g. 9)'),
            amount: z.number().positive().describe('Surplus amount available to prepay or invest in ₹'),
            horizonYears: z.number().min(1).max(40).optional().describe('Comparison horizon in years (default 5)'),
            compareAgainst: z.enum(['equity', 'fd']).optional().describe('Benchmark to invest against (default equity)'),
            expectedReturnPct: z.number().min(0).max(100).optional().describe('Override expected investment return %'),
        }),
        examples: {
            request: { loanRatePct: 9, amount: 500000, horizonYears: 5 },
            response: {
                recommendation: 'invest',
                loanRate: 0.09,
                investReturn: 0.12,
                investFutureValue: 881170,
                prepayFutureValue: 769311,
                difference: 111859,
            },
        },
    })
    @Widget('emi-vs-investment')
    async compareEmiVsInvestment(
        args: { loanRatePct: number; amount: number; horizonYears?: number; compareAgainst?: 'equity' | 'fd'; expectedReturnPct?: number },
        ctx: ExecutionContext,
    ) {
        ctx.logger.info('Comparing EMI vs investment', { loanRatePct: args.loanRatePct, amount: args.amount });
        return this.ratesService.compareEmiVsInvestment(args);
    }

    @Tool({
        name: 'get_data_freshness',
        description:
            'Data Freshness Indicator — reports when each live data source was last fetched and its latest data date, ' +
            'making it visibly clear the numbers are current and real (not hardcoded). Performs a live AMFI ping.',
        inputSchema: z.object({}),
        examples: {
            request: {},
            response: {
                generatedAt: '2026-07-26T10:00:00.000Z',
                sources: [
                    { source: 'AMFI / MFAPI.in — mutual fund NAV', kind: 'live', status: 'ok', latestDataDate: '2026-07-24' },
                ],
            },
        },
    })
    @Widget('data-freshness')
    @Cache({ ttl: 60 })
    @RateLimit({ requests: 30, window: '1m' })
    async getDataFreshness(_args: Record<string, never>, ctx: ExecutionContext) {
        ctx.logger.info('Checking data freshness');
        return this.ratesService.getDataFreshness();
    }
}
