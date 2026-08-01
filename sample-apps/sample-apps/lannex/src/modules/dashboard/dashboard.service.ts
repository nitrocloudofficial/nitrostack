import { Injectable } from '@nitrostack/core';

export interface QuickAction {
  label: string;
  action: string;
}

export interface MoneySummary {
  balance: number;
  owed: number;
  investmentGrowth: number;
  quickActions: QuickAction[];
  portfolio?: any;
  debts?: any[]; // Array of Debt objects
  recentTransactions?: any[];
  incomeVsOutgoing?: any;
}

/**
 * DashboardService holds the domain model only.
 * Real data computation happens in DashboardTools, which has access to all injected services.
 */
@Injectable()
export class DashboardService {
  buildSummary(balance: number, owed: number, investmentGrowth: number, portfolio?: any, debts?: any[], recentTransactions?: any[], incomeVsOutgoing?: any): MoneySummary {
    return {
      balance,
      owed,
      investmentGrowth,
      portfolio,
      debts,
      recentTransactions,
      incomeVsOutgoing,
      quickActions: [
        { label: 'Log Expense',      action: 'log_expense'      },
        { label: 'Split Bill',       action: 'split_bill'       },
        { label: 'Debt Tracker',     action: 'remind_friend'    },
        { label: 'View Investments', action: 'view_investments' },
      ],
    };
  }
}
