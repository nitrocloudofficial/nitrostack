import { Tool, Resource, Prompt, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { RepaymentService } from './repayment.service.js';

@Injectable({ deps: [RepaymentService] })
export class RepaymentController {
  constructor(private readonly repaymentService: RepaymentService) {}

  @Tool({
    name: 'generate_daily_repayment_plan',
    description: 'Generate a smart daily repayment plan showing Today\'s Payment, Remaining Balance, Paused status, Reason, Next Debit date, and Cashflow Status.',
    inputSchema: z.object({
      loanId: z.string().describe('Loan Identifier')
    }),
    examples: { request: { loanId: 'LN123' }, response: { "Today's Payment": 250, "Remaining Balance": 9750 } }
  })
  async generateDailyRepaymentPlan(input: { loanId: string }, context: ExecutionContext) {
    return this.repaymentService.generateDailyRepaymentPlan(input.loanId);
  }

  @Tool({
    name: 'pause_repayment',
    description: 'Pause a loan repayment (smart pause for low income days).',
    inputSchema: z.object({
      loanId: z.string().describe('Loan Identifier'),
      reason: z.string().describe('Reason for pause (e.g., Medical Emergency, Low Income Day)')
    }),
    examples: { request: { loanId: 'LN123', reason: 'Medical Emergency' }, response: { success: true } }
  })
  async pauseRepayment(input: { loanId: string; reason: string }, context: ExecutionContext) {
    return { success: await this.repaymentService.pauseRepayment(input.loanId, input.reason) };
  }

  @Tool({
    name: 'resume_repayment',
    description: 'Resume a paused loan repayment.',
    inputSchema: z.object({
      loanId: z.string().describe('Loan Identifier')
    }),
    examples: { request: { loanId: 'LN123' }, response: { success: true } }
  })
  async resumeRepayment(input: { loanId: string }, context: ExecutionContext) {
    return { success: await this.repaymentService.resumeRepayment(input.loanId) };
  }

  @Tool({
    name: 'generate_upi_autopay',
    description: 'Generate a UPI Autopay link for automatic repayment deduction.',
    inputSchema: z.object({
      loanId: z.string().describe('Loan Identifier'),
      amount: z.number().describe('Amount for Autopay in INR')
    }),
    examples: { request: { loanId: 'LN123', amount: 250 }, response: { link: 'upi://pay?...' } }
  })
  async generateUpiAutopay(input: { loanId: string; amount: number }, context: ExecutionContext) {
    return { link: await this.repaymentService.generateUpiAutopay(input.loanId, input.amount) };
  }

  @Tool({
    name: 'predict_default',
    description: 'Predict likelihood of loan default based on cashflow analysis.',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { defaultProbability: 10 } }
  })
  async predictDefault(input: { consentId: string }, context: ExecutionContext) {
    return { defaultProbability: await this.repaymentService.predictDefault(input.consentId) };
  }

  @Tool({
    name: 'simulate_cashflow',
    description: 'Simulate projected cashflow for a given number of days.',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID'),
      days: z.number().int().positive().describe('Number of days to project')
    }),
    examples: { request: { consentId: 'consent-123', days: 30 }, response: { projectedInflow: 45000, projectedOutflow: 9000 } }
  })
  async simulateCashflow(input: { consentId: string; days: number }, context: ExecutionContext) {
    return this.repaymentService.simulateCashflow(input.consentId, input.days);
  }

  @Resource({
    uri: 'repayment://history',
    name: 'Repayment History',
    description: 'Log of recent repayments and their statuses',
    mimeType: 'application/json'
  })
  async getRepaymentHistoryResource(context: ExecutionContext) {
    return [{ date: '2026-07-20', amount: 250, status: 'Completed', loanId: 'LN123' }];
  }

  @Prompt({
    name: 'repayment_advisor',
    description: 'Provide smart repayment advice based on cashflow patterns',
    arguments: [{ name: 'loanId', description: 'Loan ID', required: true }]
  })
  async getRepaymentAdvisorPrompt(args: Record<string, string>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Provide smart repayment advice for loan ${args['loanId']}. Consider cashflow patterns, suggest optimal deduction days, and identify risk of default.`
      }
    ];
  }
}
