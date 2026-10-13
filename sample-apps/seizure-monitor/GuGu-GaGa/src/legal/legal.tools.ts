/**
 * CREED-Lite — Legal / ECOA MCP Tools
 *
 * Provides adverse action reason codes per Regulation B (12 CFR Part 1002),
 * ECOA guidelines resource, and the loan rejection consultation prompt.
 * All thresholds imported from shared config.
 */

import {
  ToolDecorator as Tool,
  ResourceDecorator as Resource,
  PromptDecorator as Prompt,
  z,
  ExecutionContext,
  UseInterceptors,
  UseFilters,
} from '@nitrostack/core';
import { CREDIT_SCORE, DTI, INCOME, CREDIT_HISTORY, SAVINGS } from '../config/thresholds.js';
import { AuditInterceptor } from '../common/audit.interceptor.js';
import { CREEDExceptionFilter } from '../common/creed-exception.filter.js';

export class LegalTools {

  // ── Resource: ECOA Regulation B Guidelines ──

  @Resource({
    uri: 'ecoa://regulation-b-guidelines',
    name: 'ECOA Regulation B Legal Guidelines',
    description:
      'Federal mandates (12 CFR Part 1002) governing adverse action disclosures, legal reason codes, and consumer rights.',
    mimeType: 'application/json',
  })
  async getEcoaGuidelines(_ctx: ExecutionContext) {
    return {
      statute: 'Equal Credit Opportunity Act (12 CFR Part 1002 - Regulation B)',
      disclosureMandate:
        'Creditors must disclose exact principal reasons for adverse action within 30 days of application.',
      reasonCodes: [
        { code: 'ECOA-01', title: 'Excessive Debt-to-Income Ratio', benchmark: `${(DTI.QUALIFIED_MAX * 100).toFixed(1)}% QM limit` },
        { code: 'ECOA-04', title: 'Credit Score Below Minimum Threshold', benchmark: `${CREDIT_SCORE.PRIME} FICO` },
        { code: 'ECOA-07', title: 'Insufficient Verified Income', benchmark: `$${INCOME.MINIMUM.toLocaleString()} annual` },
        { code: 'ECOA-09', title: 'Limited Credit History', benchmark: `${CREDIT_HISTORY.MINIMUM_YEARS * 12} months minimum` },
        { code: 'ECOA-12', title: 'Insufficient Liquid Reserves', benchmark: `${SAVINGS.MIN_RESERVE_MONTHS} months of debt payments` },
      ],
    };
  }

  // ── Prompt: Loan Rejection Consultation ──

  @Prompt({
    name: 'loan_rejection_consultation',
    title: 'Loan Rejection & Recourse Consultation',
    description:
      'Standard prompt workflow for analyzing loan rejection, identifying legal ECOA reasons, and formulating budget-constrained recourse options.',
    arguments: [
      { name: 'creditScore', description: 'FICO credit score', required: true },
      { name: 'dtiRatio', description: 'Debt-to-Income ratio (e.g. 48 for 48%)', required: true },
      { name: 'annualIncome', description: 'Annual income in USD', required: true },
      { name: 'maxBudget', description: 'Maximum budget for recourse ($)', required: false },
    ],
  })
  async getConsultationPrompt(args: Record<string, string>) {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `An applicant was rejected with credit score ${args.creditScore}, DTI ratio ${args.dtiRatio}%, and annual income $${args.annualIncome}. Please:
1. Evaluate their application using evaluate_applicant
2. Extract the legal ECOA adverse action codes using get_adverse_action_reasons
3. Find causally valid recourse paths within a budget of $${args.maxBudget || 800} using find_recourse_paths
4. Recommend the highest-confidence path and explain the causal chain`,
          },
        },
      ],
    };
  }

  // ── Tool: Adverse Action Reasons ──

  @Tool({
    name: 'get_adverse_action_reasons',
    description:
      'Map a loan denial to standardized ECOA/Reg B adverse action reason codes. These are the legally required specific reasons a lender must provide to a rejected applicant.',
    inputSchema: z.object({
      creditScore: z.number().describe('FICO credit score'),
      dtiRatio: z.number().describe('Debt-to-income ratio (accepts 0.48 or 48 format)'),
      annualIncome: z.number().describe('Annual income in USD'),
      creditHistoryYears: z.number().describe('Years of credit history'),
      liquidSavings: z.number().min(0).default(0).describe('Liquid savings in USD'),
      monthlyDebtPayment: z.number().min(0).default(0).describe('Monthly debt payment in USD'),
    }),
  })
  @UseInterceptors(AuditInterceptor)
  @UseFilters(CREEDExceptionFilter)
  async getAdverseActionReasons(input: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('Generating adverse action reasons', { creditScore: Number(input.creditScore) });

    const creditScore = input.creditScore as number;
    const annualIncome = input.annualIncome as number;
    const creditHistoryYears = input.creditHistoryYears as number;
    const liquidSavings = (input.liquidSavings as number) ?? 0;
    const monthlyDebtPayment = (input.monthlyDebtPayment as number) ?? 0;

    // Normalize DTI: handle both 0.48 and 48 formats
    const dtiRaw = input.dtiRatio as number;
    const dti = dtiRaw > 1 ? dtiRaw / 100 : dtiRaw;

    const reasons: {
      code: string;
      title: string;
      detail: string;
      authority: string;
    }[] = [];

    if (dti > DTI.QUALIFIED_MAX) {
      reasons.push({
        code: 'ECOA-01',
        title: 'Excessive Debt-to-Income Ratio',
        detail: `Current DTI is ${(dti * 100).toFixed(1)}%, exceeding the ${(DTI.QUALIFIED_MAX * 100).toFixed(1)}% Qualified Mortgage threshold.`,
        authority: 'Equal Credit Opportunity Act (12 CFR Part 1002 - Regulation B)',
      });
    }
    if (creditScore < CREDIT_SCORE.PRIME) {
      reasons.push({
        code: 'ECOA-04',
        title: 'Credit Score Below Minimum Threshold',
        detail: `Score of ${creditScore} is below the ${CREDIT_SCORE.PRIME} prime lending threshold.`,
        authority: 'Equal Credit Opportunity Act (12 CFR Part 1002 - Regulation B)',
      });
    }
    if (annualIncome < INCOME.MINIMUM) {
      reasons.push({
        code: 'ECOA-07',
        title: 'Insufficient Verified Income',
        detail: `Annual income of $${annualIncome.toLocaleString()} is below the $${INCOME.MINIMUM.toLocaleString()} underwriting minimum.`,
        authority: 'Equal Credit Opportunity Act (12 CFR Part 1002 - Regulation B)',
      });
    }
    if (creditHistoryYears < CREDIT_HISTORY.MINIMUM_YEARS) {
      reasons.push({
        code: 'ECOA-09',
        title: 'Limited Credit History',
        detail: `${creditHistoryYears} year(s) of credit history is below the ${CREDIT_HISTORY.MINIMUM_YEARS}-year minimum.`,
        authority: 'Equal Credit Opportunity Act (12 CFR Part 1002 - Regulation B)',
      });
    }
    if (monthlyDebtPayment > 0 && liquidSavings < monthlyDebtPayment * SAVINGS.MIN_RESERVE_MONTHS) {
      const requiredReserves = monthlyDebtPayment * SAVINGS.MIN_RESERVE_MONTHS;
      reasons.push({
        code: 'ECOA-12',
        title: 'Insufficient Liquid Reserves',
        detail: `Liquid savings of $${liquidSavings.toLocaleString()} is below the ${SAVINGS.MIN_RESERVE_MONTHS}-month reserve requirement of $${requiredReserves.toLocaleString()} (based on $${monthlyDebtPayment.toLocaleString()}/month debt).`,
        authority: 'Equal Credit Opportunity Act (12 CFR Part 1002 - Regulation B)',
      });
    }

    return {
      totalReasons: reasons.length,
      adverseActionReasons: reasons,
      legalNote:
        'Under Regulation B, creditors must provide specific and accurate reasons for adverse action. Generic statements are not compliant.',
    };
  }
}
