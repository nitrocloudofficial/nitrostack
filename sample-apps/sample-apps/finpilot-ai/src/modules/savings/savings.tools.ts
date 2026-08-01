import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';

const DISCRETIONARY = new Set(['Food & Dining', 'Shopping', 'Entertainment']);

@Injectable({ deps: [FinanceStore] })
export class SavingsTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'manage_savings_and_emergency_fund',
    description:
      'Savings & Emergency Reserve Engine — Identify discretionary spend trimming opportunities (action: suggest_savings) or calculate and manage 3-to-6 month emergency reserve safety net (action: manage_emergency_fund).',
    inputSchema: z.object({
      action: z
        .enum(['suggest_savings', 'manage_emergency_fund'])
        .default('suggest_savings')
        .describe('Action to perform'),
      trim_percent: z.number().min(5).max(80).default(25).optional().describe('% to suggest trimming from each discretionary category'),
      target_months_coverage: z.number().min(1).max(24).default(6).optional().describe('Target months of essential expenses buffer (default 6)'),
      essential_monthly_expenses_override: z.number().optional().describe('Override monthly essential expenses'),
      current_emergency_savings_override: z.number().optional().describe('Override current saved emergency fund'),
      create_or_update_goal: z.boolean().default(true).optional().describe('Auto-sync emergency fund goal'),
    }),
  })
  async manageSavingsAndEmergencyFund(input: any, ctx: ExecutionContext) {
    const action = input.action || 'suggest_savings';
    if (action === 'manage_emergency_fund') {
      return this.manageEmergencyFund(input, ctx);
    } else {
      return this.suggestSavings(input, ctx);
    }
  }

  async suggestSavings(input: any, ctx: ExecutionContext) {
    const txns = this.store.listTransactions();
    const income = this.store.getMonthlyIncome();
    const expenses = txns.filter((t) => t.direction === 'debit');
    const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0);

    const byCategory: Record<string, number> = {};
    for (const t of expenses) {
      const cat = t.category ?? 'Uncategorized';
      byCategory[cat] = (byCategory[cat] ?? 0) + t.amount;
    }

    const trimPct = (input.trim_percent ?? 25) / 100;
    const opportunities = Object.entries(byCategory)
      .filter(([category]) => DISCRETIONARY.has(category))
      .map(([category, amount]) => ({
        category,
        current_monthly_spend: Math.round(amount * 100) / 100,
        suggested_trim_percent: input.trim_percent ?? 25,
        potential_monthly_savings: Math.round(amount * trimPct * 100) / 100,
      }))
      .sort((a, b) => b.potential_monthly_savings - a.potential_monthly_savings);

    const totalPotentialSavings = opportunities.reduce((sum, o) => sum + o.potential_monthly_savings, 0);
    const currentSavings = income !== null ? income - totalSpend : null;

    ctx.logger.info('Suggested savings', { opportunities: opportunities.length, totalPotentialSavings });

    return {
      current_monthly_savings: currentSavings !== null ? Math.round(currentSavings * 100) / 100 : null,
      opportunities,
      total_additional_potential_savings: Math.round(totalPotentialSavings * 100) / 100,
      projected_monthly_savings_if_applied:
        currentSavings !== null ? Math.round((currentSavings + totalPotentialSavings) * 100) / 100 : null,
      note:
        opportunities.length === 0
          ? 'No discretionary categories (Food & Dining, Shopping, Entertainment) found in current spending.'
          : undefined,
    };
  }

  async manageEmergencyFund(input: any, ctx: ExecutionContext) {
    const targetMonths = input.target_months_coverage || 6;
    const txns = this.store.listTransactions();
    const expenses = txns.filter((t) => t.direction === 'debit');

    let essentialMonthlySpend = 0;
    if (input.essential_monthly_expenses_override) {
      essentialMonthlySpend = input.essential_monthly_expenses_override;
    } else {
      const nonDiscretionary = expenses.filter((t) => !t.category || !DISCRETIONARY.has(t.category));
      const nonDiscretionaryTotal = nonDiscretionary.reduce((s, t) => s + t.amount, 0);
      essentialMonthlySpend = nonDiscretionaryTotal > 0 ? nonDiscretionaryTotal : 25000;
    }

    const requiredTargetAmount = Math.round(essentialMonthlySpend * targetMonths);

    const allGoals = this.store.listGoals();
    const existingEmergencyGoal = allGoals.find(
      (g) => g.name.toLowerCase().includes('emergency') || g.name.toLowerCase().includes('safety net')
    );

    const savedSoFar =
      input.current_emergency_savings_override ?? (existingEmergencyGoal ? existingEmergencyGoal.saved_so_far : 0);

    const fundingGap = Math.max(0, requiredTargetAmount - savedSoFar);
    const fundingPercent = Math.round((savedSoFar / requiredTargetAmount) * 100);

    let status: 'fully_funded' | 'partially_funded' | 'critical_gap' = 'critical_gap';
    if (savedSoFar >= requiredTargetAmount) {
      status = 'fully_funded';
    } else if (savedSoFar >= essentialMonthlySpend * 2) {
      status = 'partially_funded';
    }

    const liquidAllocations = [
      {
        vehicle: 'Instant-Access High-Yield Savings Account',
        allocation_percent: 40,
        purpose: 'Immediate emergency cash (0-day withdrawal)',
        expected_yield_percent: '4.0% - 7.0%',
      },
      {
        vehicle: 'Overnight / Liquid Mutual Fund',
        allocation_percent: 40,
        purpose: 'T+1 day redemption with higher safety & low volatility',
        expected_yield_percent: '6.5% - 7.2%',
      },
      {
        vehicle: 'Short-Term Fixed Deposit (FD) / Auto-Sweep',
        allocation_percent: 20,
        purpose: 'Guaranteed capital protection buffer',
        expected_yield_percent: '7.0% - 7.5%',
      },
    ];

    let syncedGoal = existingEmergencyGoal || null;
    if (input.create_or_update_goal !== false) {
      if (existingEmergencyGoal) {
        syncedGoal = this.store.updateGoalSaved(existingEmergencyGoal.id, savedSoFar) || existingEmergencyGoal;
      } else {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + 12);
        syncedGoal = this.store.addGoal({
          name: 'Emergency Safety Net Fund',
          target_amount: requiredTargetAmount,
          target_date: targetDate.toISOString().slice(0, 10),
          saved_so_far: savedSoFar,
        });
      }
    }

    const recommendedMonthlyDeposit = fundingGap > 0 ? Math.round((fundingGap / 12) / 500) * 500 || 1000 : 0;

    let recommendationText = '';
    if (status === 'fully_funded') {
      recommendationText = `✅ Your Emergency Fund is FULLY FUNDED at ₹${savedSoFar.toLocaleString(
        'en-IN'
      )} (${targetMonths} months of essential expenses covered). Keep this money in liquid vehicles!`;
    } else if (status === 'partially_funded') {
      recommendationText = `⚠️ Your Emergency Fund is PARTIALLY FUNDED at ${fundingPercent}% (₹${savedSoFar.toLocaleString(
        'en-IN'
      )} / ₹${requiredTargetAmount.toLocaleString('en-IN')}). Recommend allocating ₹${recommendedMonthlyDeposit.toLocaleString(
        'en-IN'
      )}/month to complete your ${targetMonths}-month buffer in 12 months.`;
    } else {
      recommendationText = `🚨 CRITICAL SAFETY GAP: You currently have ₹${savedSoFar.toLocaleString(
        'en-IN'
      )} saved out of ₹${requiredTargetAmount.toLocaleString(
        'en-IN'
      )} needed for a ${targetMonths}-month emergency reserve. Prioritize building this before aggressive equity investments!`;
    }

    ctx.logger.info('Managed emergency fund', { status, requiredTargetAmount, savedSoFar, fundingGap });

    return {
      status,
      target_months_coverage: targetMonths,
      essential_monthly_expenses: Math.round(essentialMonthlySpend),
      required_emergency_fund_target: requiredTargetAmount,
      current_saved_amount: savedSoFar,
      funding_gap: fundingGap,
      funding_percentage: fundingPercent,
      recommended_monthly_deposit: recommendedMonthlyDeposit,
      recommended_liquid_allocations: liquidAllocations,
      synced_goal: syncedGoal,
      recommendation: recommendationText,
    };
  }
}
