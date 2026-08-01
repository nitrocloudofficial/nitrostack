import { ToolDecorator as Tool, Widget, RateLimit, UseFilters, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { CouncilService } from './council.service.js';
import { GlobalExceptionFilter } from '../../common/exception.filter.js';

const CouncilInputSchema = z.object({
    income: z.number().positive().describe('Gross annual income in ₹ (e.g. 1800000)'),
    surplus: z.number().positive().describe('Amount available to invest or prepay in ₹'),
    hasLoan: z.boolean().describe('Whether the user currently has an outstanding loan'),
    loanRate: z.number().min(0).max(100).optional().describe('Annual loan interest rate % (e.g. 9). Defaults to 9% when hasLoan and omitted'),
    loanOutstanding: z.number().min(0).optional().describe('Outstanding loan principal in ₹'),
    regime: z.enum(['old', 'new']).optional().describe('Tax regime (affects 80C benefit). Defaults to old for the tax lens'),
    section80CUsed: z.number().min(0).optional().describe('80C limit already used this year in ₹'),
    emergencyFundMonths: z.number().min(0).optional().describe('Months of expenses covered by liquid savings'),
    expectedEquityReturn: z.number().min(0).max(1).optional().describe('Override expected long-term equity return as a fraction (default 0.12)'),
});

@Injectable({ deps: [CouncilService] })
export class CouncilTools {
    constructor(private readonly councilService: CouncilService) { }

    /**
     * convene_council — the deterministic advisory council in ONE call.
     *
     * Runs three lenses (tax / growth / safety) and reconciles them in-process, so
     * the verdicts and scores are always consistent and can never be invented by an
     * LLM. Every sub-decision is a pure, reproducible function — same input, same
     * output — which is why the recommendation can't hallucinate a number.
     */
    @Tool({
        name: 'convene_council',
        description:
            'Deterministic advisory council for "should I invest my surplus or prepay my loan?" decisions. ' +
            'In a single call it evaluates three lenses — tax minimization, long-term growth (equity vs loan rate) ' +
            'and liquidity/safety — and reconciles them into one weighted recommendation with agreement level and ' +
            'confidence. Pure/deterministic (zero extra LLM calls, reproducible). Supports task augmentation: pass ' +
            '`task: {}` to stream each lens deliberating.',
        inputSchema: CouncilInputSchema,
        taskSupport: 'optional',
        examples: {
            request: { income: 1800000, surplus: 200000, hasLoan: true, loanRate: 9, loanOutstanding: 1500000, emergencyFundMonths: 2, section80CUsed: 0 },
            response: {
                finalRecommendation: 'invest_elss',
                finalLabel: 'Invest in ELSS (tax-saving equity)',
                agreementLevel: '1 of 3 agents agree',
                agents: [
                    { agent: 'tax_saver', verdict: 'invest_elss', score: 9 },
                    { agent: 'growth', verdict: 'invest_equity', score: 7 },
                    { agent: 'safety', verdict: 'build_emergency_fund', score: 7 },
                ],
            },
        },
    })
    @Widget('council-verdict')
    @RateLimit({ requests: 30, window: '1m' })
    @UseFilters(GlobalExceptionFilter)
    async conveneCouncil(args: z.infer<typeof CouncilInputSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Council: convening (deterministic orchestrator)', {
            income: args.income,
            surplus: args.surplus,
            hasLoan: args.hasLoan,
            isTask: Boolean(ctx.task),
        });

        const session = this.councilService.convene(args, (message) => {
            ctx.task?.throwIfCancelled();
            ctx.task?.updateProgress(message);
        });

        ctx.logger.info('Council convened', {
            winner: session.finalRecommendation,
            agree: session.agreeCount,
        });

        return session;
    }
}
