import { Injectable } from '@nitrostack/core';
import { AccountAggregatorService } from '../account-aggregator/aa.service.js';

@Injectable({ deps: [AccountAggregatorService] })
export class RepaymentService {
  constructor(private readonly aaService: AccountAggregatorService) {}

  async generateDailyRepaymentPlan(loanId: string): Promise<Record<string, unknown>> {
    return {
      "Today's Payment": 250,
      "Remaining Balance": 9750,
      "Paused?": false,
      "Reason": "N/A",
      "Next Debit": "2026-07-26",
      "Cashflow Status": "Stable"
    };
  }

  async pauseRepayment(loanId: string, reason: string): Promise<boolean> {
    return true;
  }

  async resumeRepayment(loanId: string): Promise<boolean> {
    return true;
  }

  async generateUpiAutopay(loanId: string, amount: number): Promise<string> {
    return `upi://pay?pa=lender@bank&pn=Lender&tr=${loanId}&am=${amount}`;
  }

  async predictDefault(consentId: string): Promise<number> {
    const cashflow = await this.aaService.fetchCashflow(consentId);
    return cashflow.net < 0 ? 80 : 10;
  }

  async simulateCashflow(consentId: string, days: number): Promise<Record<string, unknown>> {
    return { projectedInflow: 1500 * days, projectedOutflow: 300 * days };
  }
}
