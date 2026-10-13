import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import { NotificationTools } from '../notification/notification.tools.js';

@Injectable({ deps: [FinanceStore] })
export class SimulationTools {
  private notificationTools: NotificationTools;

  constructor(private store: FinanceStore) {
    this.notificationTools = new NotificationTools(store);
  }

  @Tool({
    name: 'simulate_life_event',
    description:
      'Life Event Simulator ("What-If" Trajectory Engine) — Single unified tool to model 4 life event types (major_purchase, relocation, recurring_cost_change, income_loss) and project 12, 18, and 24-month financial savings trajectories vs baseline.',
    inputSchema: z.object({
      event_type: z
        .enum(['major_purchase', 'relocation', 'recurring_cost_change', 'income_loss'])
        .describe('Type of life event scenario to simulate'),
      event_details: z.object({
        description: z.string().optional().describe('Short summary of event, e.g. "Buy iPhone 15" or "Move to Bangalore"'),
        amount: z.number().min(0).default(0).optional().describe('One-time purchase amount or lost monthly income amount'),
        cost_multiplier: z
          .number()
          .min(0.5)
          .max(3.0)
          .default(1.0)
          .optional()
          .describe('Cost of living multiplier for relocation (e.g. 1.25 for 25% expense hike)'),
        percentage_increase: z
          .number()
          .min(0)
          .max(200)
          .default(0)
          .optional()
          .describe('Percentage increase for recurring cost changes (e.g. 15 for 15% hostel fee hike)'),
      }),
      monthly_income_override: z.number().optional().describe('Override monthly income baseline'),
      monthly_expenses_override: z.number().optional().describe('Override monthly expenses baseline'),
      current_savings_override: z.number().optional().describe('Override starting savings balance baseline'),
    }),
  })
  async simulateLifeEvent(input: any, ctx: ExecutionContext) {
    const eventType = input.event_type;
    const details = input.event_details || {};
    const description = details.description || eventType.replace('_', ' ');

    const baselineIncome = input.monthly_income_override ?? (this.store.getMonthlyIncome() ?? 60000);
    const txns = this.store.listTransactions();
    const baselineExpenses =
      input.monthly_expenses_override ??
      (txns.filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0) || 35000);
    const startingSavings = input.current_savings_override ?? 50000;

    let upfrontCost = 0;
    let newIncome = baselineIncome;
    let newExpenses = baselineExpenses;

    if (eventType === 'major_purchase') {
      upfrontCost = details.amount || 50000;
    } else if (eventType === 'relocation') {
      const multiplier = details.cost_multiplier || 1.25;
      upfrontCost = details.amount || 25000; // deposit / moving cost
      newExpenses = Math.round(baselineExpenses * multiplier);
    } else if (eventType === 'recurring_cost_change') {
      const pct = details.percentage_increase || 15;
      newExpenses = Math.round(baselineExpenses * (1 + pct / 100));
    } else if (eventType === 'income_loss') {
      const lostAmt = details.amount || 15000;
      newIncome = Math.max(0, baselineIncome - lostAmt);
    }

    const baselineMonthlySurplus = baselineIncome - baselineExpenses;
    const whatifMonthlySurplus = newIncome - newExpenses;

    // Simulate month-by-month cashflows for 24 months
    let baselineBalance = startingSavings;
    let whatifBalance = startingSavings - upfrontCost;

    let hasDeficitRisk = false;
    let deficitMonth: number | null = null;

    const horizons = [12, 18, 24];
    const resultsByHorizon: Record<string, { baseline_savings: number; whatif_savings: number; savings_delta: number }> = {};

    for (let month = 1; month <= 24; month++) {
      baselineBalance += baselineMonthlySurplus;
      whatifBalance += whatifMonthlySurplus;

      if (whatifBalance < 0 && deficitMonth === null) {
        hasDeficitRisk = true;
        deficitMonth = month;
      }

      if (horizons.includes(month)) {
        resultsByHorizon[`month_${month}`] = {
          baseline_savings: Math.round(baselineBalance * 100) / 100,
          whatif_savings: Math.round(whatifBalance * 100) / 100,
          savings_delta: Math.round((whatifBalance - baselineBalance) * 100) / 100,
        };
      }
    }

    let summary = `Scenario [${eventType.toUpperCase()}] "${description}": `;
    if (upfrontCost > 0) summary += `Upfront cost ₹${upfrontCost.toLocaleString('en-IN')}. `;
    summary += `Monthly net surplus shifts from ₹${baselineMonthlySurplus.toLocaleString('en-IN')} to ₹${whatifMonthlySurplus.toLocaleString('en-IN')}. `;

    if (hasDeficitRisk) {
      summary += `⚠️ DEFICIT WARNING: This scenario pushes your liquid balance into negative around month ${deficitMonth}!`;
    } else {
      summary += `Projected savings at 24 months: ₹${resultsByHorizon['month_24'].whatif_savings.toLocaleString(
        'en-IN'
      )} (Delta vs baseline: ₹${resultsByHorizon['month_24'].savings_delta.toLocaleString('en-IN')}).`;
    }

    // Auto-trigger warning notification if deficit risk occurs
    let warningNotif = null;
    if (hasDeficitRisk) {
      warningNotif = await this.notificationTools.manageNotifications(
        {
          action: 'send',
          type: 'warning',
          title: `Life Event Deficit Warning: ${description}`,
          message: summary,
          trigger_source: 'simulation',
        },
        ctx
      );
    }

    ctx.logger.info('Simulated life event', { eventType, description, hasDeficitRisk });

    return {
      event_type: eventType,
      description,
      baseline: {
        monthly_income: baselineIncome,
        monthly_expenses: baselineExpenses,
        monthly_surplus: baselineMonthlySurplus,
        starting_savings: startingSavings,
      },
      whatif_scenario: {
        upfront_cost: upfrontCost,
        new_monthly_income: newIncome,
        new_monthly_expenses: newExpenses,
        new_monthly_surplus: whatifMonthlySurplus,
      },
      impact_12m: resultsByHorizon['month_12'],
      impact_18m: resultsByHorizon['month_18'],
      impact_24m: resultsByHorizon['month_24'],
      has_deficit_risk: hasDeficitRisk,
      deficit_month: deficitMonth,
      surfaced_warning_notification: warningNotif,
      scenario_summary: summary,
    };
  }
}
