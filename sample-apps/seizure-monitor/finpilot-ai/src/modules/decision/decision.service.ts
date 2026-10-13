import { Injectable } from '@nitrostack/core';
import { FinanceStore, Goal } from '../../services/finance-store.service.js';

export interface DecisionEvaluation {
  rule_id: string;
  rule_name: string;
  triggered: boolean;
  action_recommendation: string;
  override_investment_advice: boolean;
  suggested_monthly_deposit?: number;
  revised_goal_target?: Goal;
}

/**
 * DecisionService — Internal Business Decision Engine for FinPilot AI
 *
 * NOTE: Internal NestJS service provider — strictly 0 new MCP tools registered.
 * Evaluates core financial decision rules (Emergency fund priority, savings rate thresholds, goal target feasibility).
 */
@Injectable({ deps: [FinanceStore] })
export class DecisionService {
  constructor(private store: FinanceStore) {}

  /**
   * Evaluate Rule 1: Emergency Reserve Priority
   * IF Emergency Fund is unfunded or has a safety gap, prioritize safety buffer over equity investment advice.
   */
  evaluateEmergencyFundPriority(savedAmount: number, targetAmount: number): DecisionEvaluation {
    const fundingGap = Math.max(0, targetAmount - savedAmount);
    const triggered = savedAmount === 0 || fundingGap > 0;

    return {
      rule_id: 'DECISION_RULE_01',
      rule_name: 'Emergency Fund Safety Priority',
      triggered,
      override_investment_advice: triggered,
      action_recommendation: triggered
        ? `🚨 EMERGENCY FUND PRIORITY: You have a safety net gap of ₹${fundingGap.toLocaleString(
            'en-IN'
          )}. Prioritize liquid high-yield deposits before allocating capital to equities or market SIPs.`
        : 'Emergency safety net fully funded. Proceed with wealth creation & equity investments.',
      suggested_monthly_deposit: triggered ? Math.ceil(fundingGap / 6) : 0,
    };
  }

  /**
   * Evaluate Rule 2: Savings Rate Threshold (<10% of Income)
   * IF Savings Rate < 10%, delay aggressive investment advice and recommend discretionary trimming.
   */
  evaluateSavingsRateThreshold(monthlyIncome: number, monthlySpend: number): DecisionEvaluation {
    const surplus = monthlyIncome - monthlySpend;
    const savingsRatePercent = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0;
    const triggered = savingsRatePercent < 10;

    return {
      rule_id: 'DECISION_RULE_02',
      rule_name: 'Savings Rate Below 10% Threshold',
      triggered,
      override_investment_advice: triggered,
      action_recommendation: triggered
        ? `⚠️ LOW SAVINGS RATE (${savingsRatePercent.toFixed(
            1
          )}%): Your monthly savings rate is below the healthy 10% threshold. Focus on trimming discretionary expenses (Food/Shopping) before starting long-term investments.`
        : `Healthy savings rate (${savingsRatePercent.toFixed(1)}%). Suitable for monthly investment allocations.`,
    };
  }

  /**
   * Evaluate Rule 3: Goal Feasibility & Deadline Recalculation
   * IF a Goal target date cannot be met by current monthly surplus, recalculate required monthly contribution or offer revised deadline.
   */
  evaluateGoalFeasibility(goal: Goal, availableMonthlySurplus: number): DecisionEvaluation {
    const gap = Math.max(0, goal.target_amount - goal.saved_so_far);
    const now = new Date();
    const targetDate = new Date(goal.target_date);
    const monthsRemaining = Math.max(
      1,
      (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
    );

    const requiredMonthlyContribution = Math.ceil(gap / monthsRemaining);
    const isUnfeasible = requiredMonthlyContribution > availableMonthlySurplus;

    let revisedGoal: Goal | undefined = undefined;
    if (isUnfeasible && availableMonthlySurplus > 0) {
      const neededMonths = Math.ceil(gap / availableMonthlySurplus);
      const newDate = new Date();
      newDate.setMonth(newDate.getMonth() + neededMonths);
      revisedGoal = {
        ...goal,
        target_date: newDate.toISOString().slice(0, 10),
      };
    }

    return {
      rule_id: 'DECISION_RULE_03',
      rule_name: 'Goal Target Feasibility Recalculation',
      triggered: isUnfeasible,
      override_investment_advice: false,
      action_recommendation: isUnfeasible
        ? `⚠️ GOAL DEADLINE UNFEASIBLE: "${goal.name}" requires ₹${requiredMonthlyContribution.toLocaleString(
            'en-IN'
          )}/month, but your available surplus is ₹${availableMonthlySurplus.toLocaleString(
            'en-IN'
          )}/month. Consider extending the deadline to ${revisedGoal?.target_date || 'a later date'}.`
        : `Goal "${goal.name}" is on track requiring ₹${requiredMonthlyContribution.toLocaleString('en-IN')}/month.`,
      suggested_monthly_deposit: requiredMonthlyContribution,
      revised_goal_target: revisedGoal,
    };
  }
}
