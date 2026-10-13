import { Tool, Prompt, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { UnderwritingService } from './underwriting.service.js';

@Injectable({ deps: [UnderwritingService] })
export class UnderwritingController {
  constructor(private readonly underwritingService: UnderwritingService) {}

  @Tool({
    name: 'calculate_income_velocity',
    description: 'Calculate income velocity from cashflow.',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { velocity: 50 } }
  })
  async calculateIncomeVelocity(input: { consentId: string }, context: ExecutionContext) {
    const velocity = await this.underwritingService.calculateIncomeVelocity(input.consentId);
    return { velocity };
  }

  @Tool({
    name: 'calculate_income_stability',
    description: 'Calculate income stability index.',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { stability: 0.85 } }
  })
  async calculateIncomeStability(input: { consentId: string }, context: ExecutionContext) {
    const stability = await this.underwritingService.calculateIncomeStability(input.consentId);
    return { stability };
  }

  @Tool({
    name: 'calculate_expense_ratio',
    description: 'Calculate expense ratio (e.g., fuel).',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { expenseRatio: 0.40 } }
  })
  async calculateExpenseRatio(input: { consentId: string }, context: ExecutionContext) {
    const ratio = await this.underwritingService.calculateExpenseRatio(input.consentId);
    return { expenseRatio: ratio };
  }

  @Tool({
    name: 'calculate_repayment_score',
    description: 'Calculate the repayment capability score.',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { score: 750 } }
  })
  async calculateRepaymentScore(input: { consentId: string }, context: ExecutionContext) {
    const score = await this.underwritingService.calculateRepaymentScore(input.consentId);
    return { score };
  }

  @Tool({
    name: 'recommend_credit_limit',
    description: 'Recommend a credit limit based on underwriting.',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { limit: 50000 } }
  })
  async recommendCreditLimit(input: { consentId: string }, context: ExecutionContext) {
    const limit = await this.underwritingService.recommendCreditLimit(input.consentId);
    return { limit };
  }

  @Tool({
    name: 'generate_credit_report',
    description: 'Generate a comprehensive credit report with Income Velocity, Stability, Expense Ratio, Repayment Score, and Loan Recommendation.',
    inputSchema: z.object({
      consentId: z.string().describe('AA Consent ID')
    }),
    examples: { request: { consentId: 'consent-123' }, response: { 'Income Velocity': 50, 'Recommended Loan': 50000, 'Risk Category': 'Low Risk' } }
  })
  async generateCreditReport(input: { consentId: string }, context: ExecutionContext) {
    return this.underwritingService.generateCreditReport(input.consentId);
  }

  @Prompt({
    name: 'loan_underwriting',
    description: 'Review loan underwriting profile and suggest risk mitigations',
    arguments: [{ name: 'consentId', description: 'AA Consent ID', required: true }]
  })
  async getUnderwritingPrompt(args: Record<string, string>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Please review the underwriting profile for user with consent ID ${args['consentId']} and suggest risk mitigations.`
      }
    ];
  }
}
