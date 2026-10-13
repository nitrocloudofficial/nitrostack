import { Injectable, emitEvent } from '@nitrostack/core';
import { PrismaService } from '../database/prisma.service.js';

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  timestamp: string;
  type: TransactionType;
}

export interface IncomeVsOutgoing {
  totalIncoming: number;
  totalOutgoing: number;
  netFlow: number;
  transactionCount: number;
}

export type ExpenseCategory = 'groceries' | 'coffee' | 'transport' | 'entertainment' | 'shopping' | 'dining' | 'utilities' | 'healthcare' | 'other';

@Injectable({ deps: [PrismaService] })
export class ExpensesService {
  constructor(private readonly prismaService?: PrismaService) {}
  private readonly VALID_CATEGORIES = ['groceries', 'coffee', 'transport', 'entertainment', 'shopping', 'dining', 'utilities', 'healthcare', 'other'];

  async addTransaction(data: Omit<Transaction, 'id' | 'type'> & { type?: TransactionType }): Promise<Transaction> {
    // Validate category
    const normalizedCategory = data.category.toLowerCase().trim();
    if (!this.VALID_CATEGORIES.includes(normalizedCategory)) {
      throw new Error(`Invalid category "${data.category}". Valid categories: ${this.VALID_CATEGORIES.join(', ')}`);
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new Error(`Invalid amount ${data.amount}. Amount must be greater than zero.`);
    }

    if (!this.prismaService?.client) {
      throw new Error('Database connection not available');
    }

    try {
      const created = await this.prismaService.client.expense.create({
        data: {
          amount: data.amount,
          category: normalizedCategory,
          merchant: data.merchant,
          description: `Logged via ${data.type || 'expense'}`,
          date: new Date(data.timestamp),
          status: data.type || 'expense'
        }
      });

      const transaction: Transaction = {
        id: created.id,
        amount: created.amount,
        merchant: created.merchant || '',
        category: created.category,
        timestamp: created.date.toISOString(),
        type: (created.status as TransactionType) || 'expense'
      };

      // Emit event for other modules (e.g., actions module investment-nudge listener)
      emitEvent('expense.logged', {
        transaction,
        timestamp: new Date().toISOString()
      });

      return transaction;
    } catch (err: any) {
      throw new Error(`Failed to add transaction to database: ${err.message || 'Database error'}`);
    }
  }

  /**
   * Returns the most recent transactions, sorted newest first.
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    if (!this.prismaService?.client) {
      return [];
    }

    try {
      const expenses = await this.prismaService.client.expense.findMany({
        orderBy: { date: 'desc' },
        take: limit
      });

      return expenses.map((e: any) => ({
        id: e.id,
        amount: e.amount,
        merchant: e.merchant || '',
        category: e.category,
        timestamp: e.date.toISOString(),
        type: (e.status as TransactionType) || 'expense'
      }));
    } catch (err) {
      return [];
    }
  }

  /**
   * Returns income vs outgoing totals for a given timeframe.
   */
  async getIncomeVsOutgoing(timeframe: 'week' | 'month'): Promise<IncomeVsOutgoing> {
    if (!timeframe || (timeframe !== 'week' && timeframe !== 'month')) {
      throw new Error(`Invalid timeframe "${timeframe}". Must be "week" or "month".`);
    }

    if (!this.prismaService?.client) {
      return { totalIncoming: 0, totalOutgoing: 0, netFlow: 0, transactionCount: 0 };
    }

    const now = new Date();
    const cutoff = new Date(now);

    if (timeframe === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else {
      cutoff.setMonth(now.getMonth() - 1);
    }

    try {
      const filtered = await this.prismaService.client.expense.findMany({
        where: {
          date: { gte: cutoff }
        }
      });

      let totalIncoming = 0;
      let totalOutgoing = 0;

      for (const txn of filtered) {
        if (txn.status === 'income') {
          totalIncoming += txn.amount;
        } else {
          totalOutgoing += txn.amount;
        }
      }

      return {
        totalIncoming: Math.round(totalIncoming * 100) / 100,
        totalOutgoing: Math.round(totalOutgoing * 100) / 100,
        netFlow: Math.round((totalIncoming - totalOutgoing) * 100) / 100,
        transactionCount: filtered.length
      };
    } catch (err) {
      return { totalIncoming: 0, totalOutgoing: 0, netFlow: 0, transactionCount: 0 };
    }
  }


  async getSummary(timeframe: 'week' | 'month'): Promise<{ categories: Record<string, number>; total: number; count: number }> {
    // Validate timeframe
    if (!timeframe || (timeframe !== 'week' && timeframe !== 'month')) {
      throw new Error(`Invalid timeframe "${timeframe}". Must be "week" or "month".`);
    }

    if (!this.prismaService?.client) {
      return { categories: {}, total: 0, count: 0 };
    }

    const now = new Date();
    const cutoff = new Date(now);

    if (timeframe === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else {
      cutoff.setMonth(now.getMonth() - 1);
    }

    try {
      const filtered = await this.prismaService.client.expense.findMany({
        where: {
          date: { gte: cutoff }
        }
      });

      const categories: Record<string, number> = {};
      let total = 0;

      for (const transaction of filtered) {
        categories[transaction.category] = (categories[transaction.category] || 0) + transaction.amount;
        total += transaction.amount;
      }

      return {
        categories,
        total: Math.round(total * 100) / 100,
        count: filtered.length
      };
    } catch (err) {
      return { categories: {}, total: 0, count: 0 };
    }
  }

  async getBalanceAndTotals(): Promise<{ balance: number; totalSpent: number; transactionCount: number }> {
    if (!this.prismaService?.client) {
      return { balance: 0, totalSpent: 0, transactionCount: 0 };
    }

    try {
      const transactions = await this.prismaService.client.expense.findMany();
      let totalSpent = 0;

      for (const transaction of transactions) {
        totalSpent += transaction.amount;
      }

      return {
        balance: Math.round(-totalSpent * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        transactionCount: transactions.length
      };
    } catch (err) {
      return { balance: 0, totalSpent: 0, transactionCount: 0 };
    }
  }

  /**
   * Detects recurring subscriptions, calculates annual drain, and flags potential zombie subscriptions.
   */
  async detectSubscriptions() {
    if (!this.prismaService?.client) {
      return {
        success: false,
        subscriptionCount: 0,
        zombieCount: 0,
        totalMonthlyDrain: 0,
        totalAnnualDrain: 0,
        subscriptions: [],
        summaryMessage: 'Database connection not available'
      };
    }

    // Known/detected recurring keywords or categories
    const subscriptionKeywords = ['netflix', 'spotify', 'apple', 'amazon', 'hulu', 'disney', 'gym', 'pg&e', 'utility', 'cloud', 'github'];

    try {
      const transactions = await this.prismaService.client.expense.findMany();
      const merchantGroups: Record<string, Array<{ merchant: string; category: string; amount: number }>> = {};

      for (const txn of transactions) {
        const merchant = txn.merchant || '';
        const key = merchant.toLowerCase().trim();
        if (!merchantGroups[key]) merchantGroups[key] = [];
        merchantGroups[key].push({ merchant, category: txn.category, amount: txn.amount });
      }

      const detectedSubscriptions: Array<{
        merchant: string;
        category: string;
        monthlyCost: number;
        annualCost: number;
        isZombieCandidate: boolean;
        reason?: string;
      }> = [];

      let totalMonthlyDrain = 0;
      const entertainmentSubs: number[] = [];

      for (const [merchantKey, txns] of Object.entries(merchantGroups)) {
        const sample = txns[0];
        const isKnownSub = subscriptionKeywords.some(kw => merchantKey.includes(kw)) || 
                            sample.category === 'entertainment' || 
                            sample.category === 'utilities';

        if (isKnownSub) {
          const monthlyCost = sample.amount;
          const annualCost = Math.round(monthlyCost * 12 * 100) / 100;
          totalMonthlyDrain += monthlyCost;

          const isEntertainment = sample.category === 'entertainment';
          const hasExistingEnt = detectedSubscriptions.some(s => s.category === 'entertainment');
          const isZombieCandidate = isEntertainment && hasExistingEnt;

          const subObj = {
            merchant: sample.merchant,
            category: sample.category,
            monthlyCost,
            annualCost,
            isZombieCandidate,
            reason: isZombieCandidate ? 'Multiple active entertainment subscriptions detected. Consider consolidating!' : undefined
          };

          if (isEntertainment) {
            entertainmentSubs.push(detectedSubscriptions.length);
          }

          detectedSubscriptions.push(subObj);
        }
      }

      // If more than 1 entertainment subscription exists, ensure zombie candidates are flagged
      if (entertainmentSubs.length > 1) {
        for (const idx of entertainmentSubs) {
          detectedSubscriptions[idx].isZombieCandidate = true;
          detectedSubscriptions[idx].reason = 'Multiple active entertainment subscriptions detected. Consider consolidating!';
        }
      }

      const totalAnnualDrain = Math.round(totalMonthlyDrain * 12 * 100) / 100;
      const zombieCount = detectedSubscriptions.filter(s => s.isZombieCandidate).length;

      return {
        success: true,
        subscriptionCount: detectedSubscriptions.length,
        zombieCount,
        totalMonthlyDrain: Math.round(totalMonthlyDrain * 100) / 100,
        totalAnnualDrain,
        subscriptions: detectedSubscriptions,
        summaryMessage: `Found ${detectedSubscriptions.length} recurring subscriptions draining ₹${totalMonthlyDrain}/mo (₹${totalAnnualDrain}/yr). ${zombieCount > 0 ? `${zombieCount} flagged as potential zombie waste!` : 'No redundant zombies found.'}`
      };
    } catch (err) {
      return {
        success: false,
        subscriptionCount: 0,
        zombieCount: 0,
        totalMonthlyDrain: 0,
        totalAnnualDrain: 0,
        subscriptions: [],
        summaryMessage: 'Database connection currently unavailable'
      };
    }
  }
}

