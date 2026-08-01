import { ToolDecorator as Tool, Widget, RateLimit, UseFilters, UseGuards, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { CopilotService } from './copilot.service.js';
import { GlobalExceptionFilter } from '../../common/exception.filter.js';
import { ApiKeyGuard } from '../../common/apikey.guard.js';

const DeductionsSchema = z
    .object({
        section80C: z.number().min(0).optional().describe('80C investments — ELSS, PPF, EPF, LIC (capped at ₹1,50,000)'),
        section80D: z.number().min(0).optional().describe('80D health insurance premium'),
        nps80CCD1B: z.number().min(0).optional().describe('Additional NPS (capped at ₹50,000)'),
        homeLoanInterest24b: z.number().min(0).optional().describe('Home-loan interest (capped at ₹2,00,000)'),
        hraExemption: z.number().min(0).optional().describe('Exempt HRA amount'),
        otherChapterVIA: z.number().min(0).optional().describe('Other Chapter VI-A deductions'),
    })
    .optional();

const FundSchema = z
    .object({
        schemeCode: z.number().int().describe('AMFI scheme code (from search_mutual_funds)'),
        investedAmount: z.number().positive().describe('Lump-sum invested in ₹'),
        investedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Investment date (ISO yyyy-mm-dd)'),
    })
    .optional()
    .describe('Optional: a mutual fund holding to value using live NAV');

const PlanSchema = z.object({
    grossIncome: z.number().min(0).describe('Total gross annual income in ₹ (e.g. 1800000 for ₹18L)'),
    isSalaried: z.boolean().optional().default(true).describe('Salaried taxpayer (eligible for standard deduction)'),
    ageGroup: z.enum(['below60', '60to80', 'above80']).optional().default('below60'),
    deductions: DeductionsSchema,
    fund: FundSchema,
    ifsc: z.string().length(11).optional().describe('Optional: bank IFSC to verify for the refund account'),
    deadlineWindowDays: z.number().int().min(1).max(730).optional().describe('Look-ahead window for deadlines (default 180 days)'),
});

@Injectable({ deps: [CopilotService] })
export class CopilotTools {
    constructor(private readonly copilotService: CopilotService) { }

    /**
     * plan_my_finances — the flagship orchestration tool.
     *
     * Runs the full copilot workflow: tax (old vs new) → mutual fund returns →
     * bank IFSC verification → upcoming deadlines → one coherent plan. Supports
     * MCP Tasks: pass `task: {}` to run it asynchronously and stream progress via
     * tasks/get, then fetch the final plan with tasks/result.
     */
    @Tool({
        name: 'plan_my_finances',
        description:
            'One-shot personal finance & tax plan. Given your income (and optionally a mutual fund holding and ' +
            'a bank IFSC), this orchestrates the tax calculator, live mutual-fund NAV/XIRR, IFSC verification and ' +
            'the compliance calendar into a single coherent plan with a summary and action items. ' +
            'Supports task augmentation — pass `task: {}` to run it asynchronously with live progress updates.',
        inputSchema: PlanSchema,
        taskSupport: 'optional',
        examples: {
            request: {
                grossIncome: 1800000,
                deductions: { section80C: 200000, section80D: 25000 },
                fund: { schemeCode: 122639, investedAmount: 200000, investedDate: '2023-04-01' },
                ifsc: 'HDFC0000001',
            },
            response: {
                summary: 'On a gross income of ₹18,00,000, the NEW regime is cheaper…',
                actionItems: [
                    'Opt for the new regime — it saves ₹89,000 vs the other regime.',
                    '⏰ File ITR for AY 2026-27 (non-audit individuals) — due 2026-07-31 (5 days).',
                ],
            },
        },
    })
    @Widget('finance-plan')
    @RateLimit({ requests: 30, window: '1m' })
    @UseFilters(GlobalExceptionFilter)
    @UseGuards(ApiKeyGuard)
    async planMyFinances(args: z.infer<typeof PlanSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Building finance plan', {
            grossIncome: args.grossIncome,
            withFund: Boolean(args.fund),
            withBank: Boolean(args.ifsc),
            isTask: Boolean(ctx.task),
        });

        const plan = await this.copilotService.buildPlan(
            {
                grossIncome: args.grossIncome,
                isSalaried: args.isSalaried,
                ageGroup: args.ageGroup,
                deductions: args.deductions,
                fund: args.fund,
                ifsc: args.ifsc,
                deadlineWindowDays: args.deadlineWindowDays,
            },
            (message) => {
                // Stream progress + honor cancellation when run as a task.
                ctx.task?.throwIfCancelled();
                ctx.task?.updateProgress(message);
            },
        );

        ctx.logger.info('Finance plan ready', {
            recommendedRegime: plan.tax.recommendation.regime,
            deadlineCount: plan.deadlines.length,
        });

        return plan;
    }
}
