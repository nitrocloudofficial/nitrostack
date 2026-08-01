import { Injectable, OnEvent } from '@nitrostack/core';
import { ExpensesService } from '../expenses/expenses.service.js';
import { SplitterService } from '../splitter/splitter.service.js';
import { DebtsService } from '../debts/debts.service.js';
import { PortfolioService } from '../portfolio/portfolio.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable({ deps: [ExpensesService, SplitterService, DebtsService, PortfolioService, PrismaService] })
export class ActionsService {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly splitterService: SplitterService,
    private readonly debtsService: DebtsService,
    private readonly portfolioService: PortfolioService,
    private readonly prismaService?: PrismaService
  ) {}

  async getPendingNudges() {
    if (!this.prismaService?.client) {
      return [];
    }

    try {
      const logs = await this.prismaService.client.actionLog.findMany({
        where: {
          actionType: 'investment_nudge',
          status: 'pending'
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      return logs.map((log: any) => ({
        id: log.id,
        type: log.actionType,
        message: log.details,
        timestamp: log.createdAt.toISOString()
      }));
    } catch (err) {
      return [];
    }
  }

  @OnEvent('expense.logged')
  async handleExpenseLogged(payload: { transaction: any, timestamp: string }) {
    if (!this.prismaService?.client) {
      return;
    }

    const t = payload.transaction;
    const rateDecimal = 0.12; // 12% assumed return
    const futureValue = Math.round(t.amount * Math.pow(1 + rateDecimal, 1) * 100) / 100;

    let message: string | null = null;

    if (t.type === 'expense' && t.amount > 500 && ['entertainment', 'dining', 'shopping'].includes(t.category.toLowerCase())) {
      message = `You just spent ₹${t.amount} on ${t.merchant}. If you'd invested this ₹${t.amount} instead, it'd be worth ₹${futureValue} in a year (assuming 12% return).`;
    } else if (t.type === 'income') {
      message = `You just received ₹${t.amount} from ${t.merchant}. If you invest this ₹${t.amount} right now, it could be worth ₹${futureValue} in a year (assuming 12% return)!`;
    }

    if (message) {
      try {
        await this.prismaService.client.actionLog.create({
          data: {
            actionType: 'investment_nudge',
            details: message,
            status: 'pending'
          }
        });
      } catch (err) {
        // Graceful error handle
      }
    }
  }
  /**
   * Reminds a friend to pay back an amount using WhatsApp.
   * Leverages the SplitterService to generate the payment link.
   */
  async remindFriend(name: string, overrideAmount?: number) {
    let amountOwed = overrideAmount;
    if (!amountOwed) {
      const debts = await this.debtsService.getDebts();
      const debt = debts.find(d => d.person.toLowerCase() === name.toLowerCase() && d.type === 'owe_me' && d.status === 'pending');
      if (!debt) {
        throw new Error(`No pending debt found for ${name}. Please specify an amount.`);
      }
      amountOwed = debt.amount;
    }

    const paymentLink = this.splitterService.createPaymentLink(name, amountOwed);
    return {
      success: true,
      friendName: name,
      amountOwed,
      reminderLink: paymentLink.link
    };
  }

  /**
   * Suggests investments based on spare cash.
   * Calculates spare cash by subtracting this month's expenses (from ExpensesService) from a configurable budget.
   */
  async suggestInvestments(amount: number, monthlyBudget: number = parseFloat(process.env.MONTHLY_BUDGET || '5000')) {
    const summary = await this.expensesService.getSummary('month');
    const budget = monthlyBudget;
    const idleCash = Math.round((budget - summary.total) * 100) / 100;

    if (amount > idleCash) {
      return {
        success: false,
        amountInvested: 0,
        status: 'failed',
        message: `Insufficient idle cash to consider. You only have ₹${idleCash} available based on ₹${summary.total} expenses this month.`,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      amountToInvest: amount,
      status: 'suggestions_generated',
      suggestions: [
        { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', allocation: Math.round(amount * 0.6 * 100) / 100, risk: 'Moderate' },
        { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: Math.round(amount * 0.3 * 100) / 100, risk: 'Low' },
        { ticker: 'BTC', name: 'Bitcoin', allocation: Math.round(amount * 0.1 * 100) / 100, risk: 'High' }
      ],
      message: 'Here are some simulated investment suggestions based on your available spare cash.',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Provides a dynamic notification about available tax savings.
   */
  async taxSaverNudge(availableAmount: number = parseFloat(process.env.TAX_SAVER_ROOM || '1500')) {
    return {
      success: true,
      availableAmount,
      currency: 'INR',
      message: `Hey there! Just a quick nudge: you still have ₹${availableAmount} in tax-deductible room available this year. Investing some of your spare cash now is a great way to lower your tax bill!`
    };
  }

  /**
   * Evaluates an impulse purchase for opportunity cost, work hours required, and budget risk.
   */
  async evaluateImpulsePurchase(
    itemName: string,
    price: number,
    hourlyWage: number = parseFloat(process.env.DEFAULT_HOURLY_WAGE || '500'),
    returnRate: number = parseFloat(process.env.DEFAULT_RETURN_RATE || '12'),
    monthlyBudget: number = parseFloat(process.env.MONTHLY_BUDGET || '5000')
  ) {
    const summary = await this.expensesService.getSummary('month');
    const budget = monthlyBudget;
    const remainingBudget = Math.max(0, budget - summary.total);

    // 1. Calculate hours of work required
    const workHoursNeeded = Math.round((price / hourlyWage) * 10) / 10;
    const workDaysNeeded = Math.round((workHoursNeeded / 8) * 10) / 10;

    // 2. Calculate compound opportunity cost over 5 and 10 years at returnRate% p.a.
    const rateDecimal = returnRate / 100;
    const value5Years = Math.round(price * Math.pow(1 + rateDecimal, 5) * 100) / 100;
    const value10Years = Math.round(price * Math.pow(1 + rateDecimal, 10) * 100) / 100;

    // 3. Determine hazard level
    let hazardLevel: 'SAFE' | 'MODERATE' | 'HAZARD' | 'FINANCIAL_EMERGENCY';
    let recommendation: string;

    const budgetRatio = price / (remainingBudget || 1);

    if (budgetRatio <= 0.1) {
      hazardLevel = 'SAFE';
      recommendation = `This purchase is well within your monthly budget buffer. Go for it if it brings you value!`;
    } else if (budgetRatio <= 0.3) {
      hazardLevel = 'MODERATE';
      recommendation = `Consider sleeping on it for 24 hours to ensure it's not a impulse buy.`;
    } else if (budgetRatio <= 0.6) {
      hazardLevel = 'HAZARD';
      recommendation = `Caution: This consumes ${Math.round(budgetRatio * 100)}% of your remaining monthly buffer. Try waiting 7 days.`;
    } else {
      hazardLevel = 'FINANCIAL_EMERGENCY';
      recommendation = `Warning! Buying "${itemName}" would severely strain your monthly buffer. Consider saving up over multiple months instead.`;
    }

    return {
      success: true,
      itemName,
      price,
      workRequired: {
        hours: workHoursNeeded,
        days: workDaysNeeded,
        wageRateUsed: `₹${hourlyWage}/hr`
      },
      opportunityCost: {
        expectedAnnualReturn: `${returnRate}%`,
        valueIn5Years: value5Years,
        valueIn10Years: value10Years,
        wealthLost: Math.round((value10Years - price) * 100) / 100
      },
      impulseAssessment: {
        remainingMonthlyBudget: Math.round(remainingBudget * 100) / 100,
        hazardLevel,
        recommendation
      }
    };
  }

}

