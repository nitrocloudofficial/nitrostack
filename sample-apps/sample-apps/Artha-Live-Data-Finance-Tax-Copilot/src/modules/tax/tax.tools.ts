import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { TaxService } from './tax.service.js';

const DeductionsSchema = z
    .object({
        section80C: z.number().min(0).optional().describe('80C investments — ELSS, PPF, EPF, LIC, home-loan principal (capped at ₹1,50,000)'),
        section80D: z.number().min(0).optional().describe('80D health insurance premium (self + family + parents)'),
        nps80CCD1B: z.number().min(0).optional().describe('Additional NPS contribution (capped at ₹50,000)'),
        homeLoanInterest24b: z.number().min(0).optional().describe('Home-loan interest on self-occupied property (capped at ₹2,00,000)'),
        hraExemption: z.number().min(0).optional().describe('Exempt House Rent Allowance amount'),
        otherChapterVIA: z.number().min(0).optional().describe('Any other Chapter VI-A deductions (80E, 80G, 80TTA, etc.)'),
    })
    .optional()
    .describe('Deductions claimable under the OLD regime only; ignored for the new regime');

const CalcTaxSchema = z.object({
    grossIncome: z.number().min(0).describe('Total gross annual income in ₹ (e.g. 1800000 for ₹18L)'),
    isSalaried: z.boolean().optional().default(true).describe('Whether the taxpayer is salaried (eligible for the standard deduction)'),
    ageGroup: z.enum(['below60', '60to80', 'above80']).optional().default('below60').describe('Age bracket — affects old-regime basic exemption'),
    deductions: DeductionsSchema,
});

@Injectable({ deps: [TaxService] })
export class TaxTools {
    constructor(private readonly taxService: TaxService) { }

    @Tool({
        name: 'calculate_income_tax',
        description:
            'Calculate and compare Indian income tax under the OLD vs NEW regime for FY 2025-26 (AY 2026-27), ' +
            'using real Finance Act 2025 slabs, Section 87A rebate, surcharge and 4% cess. ' +
            'Returns a full slab-by-slab breakdown for both regimes and recommends the cheaper one. ' +
            'Deductions (80C, 80D, NPS, home-loan interest, HRA) only apply to the old regime.',
        inputSchema: CalcTaxSchema,
        examples: {
            request: {
                grossIncome: 1800000,
                isSalaried: true,
                deductions: { section80C: 200000, section80D: 25000 },
            },
            response: {
                financialYear: 'FY 2025-26',
                assessmentYear: 'AY 2026-27',
                grossIncome: 1800000,
                recommendation: {
                    regime: 'new',
                    totalTax: 158600,
                    savesVsOther: 89000,
                    note: 'The new regime saves ₹89,000 for this profile.',
                },
            },
        },
    })
    @Widget('tax-breakdown')
    async calculateIncomeTax(args: z.infer<typeof CalcTaxSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Calculating income tax', {
            grossIncome: args.grossIncome,
            ageGroup: args.ageGroup,
        });

        const result = this.taxService.calculate({
            grossIncome: args.grossIncome,
            isSalaried: args.isSalaried,
            ageGroup: args.ageGroup,
            deductions: args.deductions,
        });

        ctx.logger.info('Tax calculation complete', {
            oldTax: result.old.totalTax,
            newTax: result.new.totalTax,
            recommended: result.recommendation.regime,
        });

        return result;
    }

    @Tool({
        name: 'optimize_deductions',
        description:
            'Deduction Optimizer — audits a taxpayer\'s Chapter VI-A deductions (80C, 80D, NPS 80CCD(1B), home-loan ' +
            'interest 24(b)) against their statutory caps. Flags amounts OVER the cap that earn no tax benefit, and ' +
            'UNUSED headroom, quantifying the exact extra tax that could be saved by filling each allowance. ' +
            'Applies to the OLD regime.',
        inputSchema: z.object({
            grossIncome: z.number().min(0).describe('Total gross annual income in ₹'),
            ageGroup: z.enum(['below60', '60to80', 'above80']).optional().default('below60'),
            regime: z.enum(['old', 'new']).optional().describe('Current regime (deductions only apply in old)'),
            deductions: DeductionsSchema,
        }),
        examples: {
            request: { grossIncome: 1800000, deductions: { section80C: 200000, nps80CCD1B: 0 } },
            response: {
                totalWasted: 50000,
                totalUnclaimedSaving: 15600,
                flags: [
                    '80C: ₹2,00,000 exceeds the ₹1,50,000 cap — ₹50,000 earns you no deduction.',
                    '80CCD(1B): ₹50,000 of headroom unused — filling it could save up to ₹15,600 in tax.',
                ],
            },
        },
    })
    @Widget('deduction-optimizer')
    async optimizeDeductions(
        args: { grossIncome: number; ageGroup?: 'below60' | '60to80' | 'above80'; regime?: 'old' | 'new'; deductions?: Record<string, number> },
        ctx: ExecutionContext,
    ) {
        ctx.logger.info('Optimizing deductions', { grossIncome: args.grossIncome });
        return this.taxService.optimizeDeductions({
            grossIncome: args.grossIncome,
            ageGroup: args.ageGroup,
            regime: args.regime,
            deductions: args.deductions ?? {},
        });
    }
}
