import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { FinancialHealthInput, FinancialHealthOutput } from '../../shared/contracts.js';
import { calculateFinancialHealth } from './financial-health.logic.js';

export class FinancialHealthTools {
  @Tool({
    name: 'calculate_financial_health',
    description:
      'Scores overall financial health from income, expenses, savings, and debt, with sub-scores and actionable suggestions.',
    inputSchema: FinancialHealthInput,
    examples: {
      request: {
        monthlyIncome: 60000,
        monthlyExpenses: 35000,
        savings: 150000,
        monthlyDebtPayment: 8000,
        emergencyFundMonths: 4
      },
      response: {
        score: 62,
        subScores: { savingsRate: 58, emergencyFund: 67, debtRatio: 67 },
        suggestions: [
          'Your monthly savings rate is low — review discretionary expenses to free up more income for savings and investing.'
        ],
        risk_note: 'This is an educational score based on general personal-finance heuristics, not financial advice.',
        educational_only: true
      }
    }
  })
  async calculateFinancialHealthTool(
    input: {
      monthlyIncome: number;
      monthlyExpenses: number;
      savings: number;
      monthlyDebtPayment: number;
      emergencyFundMonths: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Calculating financial health', input);

    if (input.monthlyIncome <= 0) {
      throw new Error('monthlyIncome must be a positive number');
    }

    const result = calculateFinancialHealth(input);

    return {
      ...result,
      risk_note: 'This is an educational score based on general personal-finance heuristics, not financial advice.',
      educational_only: true as const
    };
  }
}
