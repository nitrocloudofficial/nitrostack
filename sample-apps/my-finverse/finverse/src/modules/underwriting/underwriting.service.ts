import { Injectable } from '@nitrostack/core';
import { AccountAggregatorService } from '../account-aggregator/aa.service.js';
import { LLMService } from '../../services/llm.service.js';

@Injectable({ deps: [AccountAggregatorService, LLMService] })
export class UnderwritingService {
  constructor(
    private readonly aaService: AccountAggregatorService,
    private readonly llmService: LLMService
  ) {}

  async calculateIncomeVelocity(consentId: string): Promise<number> {
    const cashflow = await this.aaService.fetchCashflow(consentId);
    return cashflow.inflow / 30;
  }

  async calculateIncomeStability(consentId: string): Promise<number> {
    return 0.85;
  }

  async calculateExpenseRatio(consentId: string): Promise<number> {
    return 0.40;
  }

  async calculateRepaymentScore(consentId: string): Promise<number> {
    return 750;
  }

  async recommendCreditLimit(consentId: string): Promise<number> {
    const score = await this.calculateRepaymentScore(consentId);
    return score > 700 ? 50000 : 10000;
  }

  async generateCreditReport(consentId: string): Promise<Record<string, unknown>> {
    const velocity = await this.calculateIncomeVelocity(consentId);
    const stability = await this.calculateIncomeStability(consentId);
    const expenseRatio = await this.calculateExpenseRatio(consentId);
    const repaymentScore = await this.calculateRepaymentScore(consentId);
    const limit = await this.recommendCreditLimit(consentId);

    return {
      'Income Velocity': velocity,
      'Income Stability': stability,
      'Fuel Expense Ratio': expenseRatio,
      'Cash Flow Trend': 'Positive',
      'Repayment Capability Score': repaymentScore,
      'Recommended Loan': limit,
      'Risk Category': repaymentScore > 700 ? 'Low Risk' : 'High Risk'
    };
  }
}
