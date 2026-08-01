import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

@Injectable({ deps: [FinanceStore] })
export class InvestmentTools {
  constructor(private store: FinanceStore) {}

  private doCalculateSipReturns(input: any, ctx: ExecutionContext) {
    const monthlyAmount = input.monthly_investment || 5000;
    const annualRate = input.expected_return_rate_percent || 12;
    const years = input.duration_years || 5;
    const stepUpPercent = input.step_up_percent ?? 0;

    const monthlyRate = annualRate / 12 / 100;
    const totalMonths = Math.round(years * 12);

    let cumulativeInvested = 0;
    let currentMonthlySIP = monthlyAmount;
    let totalPortfolioValue = 0;

    const yearlyBreakdown: Array<{
      year: number;
      monthly_investment: number;
      invested_this_year: number;
      cumulative_invested: number;
      estimated_portfolio_value: number;
      estimated_gains: number;
    }> = [];

    let currentYearInvested = 0;

    for (let month = 1; month <= totalMonths; month++) {
      if (month > 1 && (month - 1) % 12 === 0 && stepUpPercent > 0) {
        currentMonthlySIP = currentMonthlySIP * (1 + stepUpPercent / 100);
      }

      cumulativeInvested += currentMonthlySIP;
      currentYearInvested += currentMonthlySIP;

      totalPortfolioValue = (totalPortfolioValue + currentMonthlySIP) * (1 + monthlyRate);

      if (month % 12 === 0 || month === totalMonths) {
        const yearNumber = Math.ceil(month / 12);
        yearlyBreakdown.push({
          year: yearNumber,
          monthly_investment: Math.round(currentMonthlySIP * 100) / 100,
          invested_this_year: Math.round(currentYearInvested * 100) / 100,
          cumulative_invested: Math.round(cumulativeInvested * 100) / 100,
          estimated_portfolio_value: Math.round(totalPortfolioValue * 100) / 100,
          estimated_gains: Math.round((totalPortfolioValue - cumulativeInvested) * 100) / 100,
        });
        currentYearInvested = 0;
      }
    }

    const maturityValue = Math.round(totalPortfolioValue * 100) / 100;
    const totalInvested = Math.round(cumulativeInvested * 100) / 100;
    const totalGains = Math.round((maturityValue - totalInvested) * 100) / 100;

    ctx.logger.info('Calculated SIP returns', { monthlyAmount, years, annualRate, maturityValue });

    return {
      monthly_investment: monthlyAmount,
      duration_years: years,
      expected_annual_return_percent: annualRate,
      step_up_percent: stepUpPercent,
      maturity_value: maturityValue,
      total_invested_amount: totalInvested,
      total_estimated_returns: totalGains,
      return_to_investment_ratio: totalInvested > 0 ? Math.round((totalGains / totalInvested) * 1000) / 10 : 0,
      breakdown_by_year: yearlyBreakdown,
    };
  }

  private doSuggestSipPlan(input: any, ctx: ExecutionContext) {
    const risk = input.risk_appetite || 'moderate';
    const years = input.duration_years || 5;

    const income = this.store.getMonthlyIncome();
    const txns = this.store.listTransactions();
    const expenses = txns.filter((t) => t.direction === 'debit');
    const totalSpend = expenses.reduce((s, t) => s + t.amount, 0);

    const rawSurplus =
      input.monthly_surplus_override ?? (income !== null ? Math.max(income - totalSpend, 0) : 10000);

    const monthSpends: Record<string, number> = {};
    for (const t of expenses) {
      const month = t.date.slice(0, 7);
      monthSpends[month] = (monthSpends[month] ?? 0) + t.amount;
    }
    const monthsCount = Object.keys(monthSpends).length;
    const isVolatile = monthsCount > 1;

    const bufferPercent = isVolatile ? 20 : 10;
    const safeSurplus = Math.round(rawSurplus * (1 - bufferPercent / 100));

    let expectedReturnRate = 11;
    let stepUpPercent = 10;
    let assetMix = { equity_percent: 50, debt_percent: 50, gold_cash_percent: 0 };
    let sipSharePercent = 50;

    if (risk === 'conservative') {
      expectedReturnRate = 7.5;
      stepUpPercent = 5;
      assetMix = { equity_percent: 30, debt_percent: 60, gold_cash_percent: 10 };
      sipSharePercent = 40;
    } else if (risk === 'aggressive') {
      expectedReturnRate = 14.5;
      stepUpPercent = 15;
      assetMix = { equity_percent: 85, debt_percent: 15, gold_cash_percent: 0 };
      sipSharePercent = 60;
    }

    const recommendedSIP = Math.round((safeSurplus * (sipSharePercent / 100)) / 500) * 500 || 1000;

    const sipProjection = this.doCalculateSipReturns(
      {
        monthly_investment: recommendedSIP,
        expected_return_rate_percent: expectedReturnRate,
        duration_years: years,
        step_up_percent: stepUpPercent,
      },
      ctx
    );

    const explanation = `Based on your ${risk.toUpperCase()} risk profile and monthly surplus of ₹${rawSurplus.toLocaleString('en-IN')}, we applied a ${bufferPercent}% cashflow buffer, leaving ₹${safeSurplus.toLocaleString('en-IN')} safe surplus. We recommend starting a monthly SIP of ₹${recommendedSIP.toLocaleString('en-IN')} with an annual step-up of ${stepUpPercent}%.`;

    ctx.logger.info('Suggested SIP plan', { risk, recommendedSIP, maturityValue: sipProjection.maturity_value });

    return {
      risk_appetite: risk,
      monthly_raw_surplus: rawSurplus,
      applied_safety_buffer_percent: bufferPercent,
      safe_usable_surplus: safeSurplus,
      recommended_monthly_sip: recommendedSIP,
      suggested_annual_step_up_percent: stepUpPercent,
      expected_return_rate_percent: expectedReturnRate,
      suggested_asset_mix: assetMix,
      projection: sipProjection,
      target_goal: input.goal_name
        ? {
            name: input.goal_name,
            target_amount: input.target_amount ?? null,
            achievable: input.target_amount ? sipProjection.maturity_value >= input.target_amount : null,
          }
        : null,
      explanation,
    };
  }

  @Tool({
    name: 'manage_investment_and_sip',
    description:
      'Unified Investment & SIP Engine — Calculate SIP returns, generate risk-customized SIP investment plans, or recommend fund asset categories based on budget and horizon.',
    inputSchema: z.object({
      action: z
        .enum(['calculate_returns', 'suggest_plan', 'suggest_fund'])
        .default('suggest_plan')
        .describe('Investment action mode'),
      monthly_investment: z.number().positive().optional().describe('Monthly SIP amount (for calculate_returns / suggest_plan)'),
      expected_return_rate_percent: z.number().positive().optional().describe('Expected annual return rate in %'),
      duration_years: z.number().positive().default(5).optional().describe('Investment duration in years (default 5)'),
      step_up_percent: z.number().min(0).default(0).optional().describe('Annual step-up % increase'),
      risk_appetite: z
        .enum(['conservative', 'moderate', 'aggressive'])
        .default('moderate')
        .optional()
        .describe('User risk profile (for suggest_plan)'),
      monthly_surplus_override: z.number().optional().describe('Override monthly surplus'),
      goal_name: z.string().optional().describe('Goal name'),
      target_amount: z.number().optional().describe('Target goal amount'),
      amount: z.number().positive().optional().describe('Investment budget (for suggest_fund)'),
      horizon_months: z.number().positive().optional().describe('Horizon in months (for suggest_fund)'),
      risk_preference: z.enum(['low', 'medium', 'high']).optional().describe('Risk preference (for suggest_fund)'),
    }),
  })
  async manageInvestmentAndSip(input: any, ctx: ExecutionContext) {
    const action = input.action || 'suggest_plan';
    if (action === 'calculate_returns') {
      return this.doCalculateSipReturns(input, ctx);
    } else if (action === 'suggest_fund') {
      return this.suggestFund(input, ctx);
    } else {
      return this.doSuggestSipPlan(input, ctx);
    }
  }

  async suggestFund(input: any, ctx: ExecutionContext) {
    const amount = input.amount || input.monthly_investment || 5000;
    const mode = input.investment_mode || 'monthly';
    const horizon = input.horizon_months || (input.duration_years ? input.duration_years * 12 : 36);
    const risk = input.risk_preference || (input.risk_appetite === 'conservative' ? 'low' : input.risk_appetite === 'aggressive' ? 'high' : 'medium');
    const existing = input.existing_portfolio_type || 'none';

    let equityPct = 50;
    let debtPct = 50;
    let categories: string[] = [];
    let expectedReturnRange = { min_percent: 8, max_percent: 11 };
    let rationale = '';

    if (horizon < 36) {
      equityPct = 25;
      debtPct = 75;
      categories = [
        'Short-Duration Debt Mutual Fund',
        'Liquid & Money Market Funds',
        'Nifty 50 Large-Cap Index Fund (25% allocation cap)',
      ];
      expectedReturnRange = { min_percent: 6.5, max_percent: 8.0 };
      rationale = `Short-term investment horizon (${horizon} months) prioritizes capital preservation and liquidity over aggressive growth to avoid short-term market volatility risk.`;
    } else {
      if (risk === 'low') {
        equityPct = 40;
        debtPct = 60;
        categories = ['Corporate Bond / Banking & PSU Debt Fund', 'Nifty 50 Index Fund', 'Arbitrage Fund'];
        expectedReturnRange = { min_percent: 7.5, max_percent: 9.5 };
        rationale = `Low risk profile matched with ${horizon}-month horizon focuses on steady capital preservation with modest inflation-beating equity growth.`;
      } else if (risk === 'medium') {
        equityPct = 60;
        debtPct = 40;
        categories = ['Flexi-Cap Equity Fund', 'Nifty 50 / Large & Mid-Cap Index Fund', 'Hybrid Balanced Advantage Fund'];
        expectedReturnRange = { min_percent: 11.0, max_percent: 13.0 };
        rationale = `Medium risk profile for a ${horizon}-month horizon balances long-term equity wealth creation with a stabilizing 40% debt/hybrid buffer.`;
      } else {
        equityPct = 80;
        debtPct = 20;
        categories = ['Nifty Midcap 150 Index Fund', 'Parag Parikh Flexi-Cap / Small-Cap Fund', 'Sovereign Gold / Short Debt Buffer'];
        expectedReturnRange = { min_percent: 14.0, max_percent: 16.5 };
        rationale = `High risk appetite over a ${horizon}-month horizon maximizes equity wealth creation through high-growth mid-cap and flexi-cap index funds.`;
      }
    }

    if (existing === 'equity' && equityPct > 40) {
      equityPct = Math.max(30, equityPct - 20);
      debtPct = 100 - equityPct;
      rationale += ` (Adjusted +20% toward Debt Funds to prevent over-concentration in your existing equity portfolio).`;
    }

    ctx.logger.info('Suggested fund categories', { amount, horizon, risk, equityPct, debtPct });

    return {
      investment_amount: amount,
      investment_mode: mode,
      horizon_months: horizon,
      risk_preference: risk,
      suggested_asset_allocation: {
        equity_percent: equityPct,
        debt_liquid_percent: debtPct,
      },
      recommended_fund_categories: categories,
      expected_annual_return_range: expectedReturnRange,
      rationale,
    };
  }

  // Programmatic helper methods for internal callers
  async sipCalculatorAndPlanner(input: any, ctx: ExecutionContext) {
    return this.manageInvestmentAndSip(input, ctx);
  }

  async calculateSipReturns(input: any, ctx: ExecutionContext) {
    return this.doCalculateSipReturns(input, ctx);
  }

  async suggestSipPlan(input: any, ctx: ExecutionContext) {
    return this.doSuggestSipPlan(input, ctx);
  }
}
