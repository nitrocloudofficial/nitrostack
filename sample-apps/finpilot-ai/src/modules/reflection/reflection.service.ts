import { Injectable, ExecutionContext } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import { WorkflowStepResult } from '../workflow/workflow.service.js';
import { NotificationTools } from '../notification/notification.tools.js';

export interface ReflectionEvaluation {
  overall_workflow_success: boolean;
  average_confidence: number;
  low_confidence_steps: string[];
  autonomous_recommendations: string[];
  auto_triggered_notifications: any[];
  reflection_summary: string;
}

/**
 * ReflectionService — Post-Workflow Reflection, Autonomous Recommendation & Notification Engine
 *
 * NOTE: Internal NestJS service provider — strictly 0 new MCP tools registered.
 */
@Injectable({ deps: [FinanceStore] })
export class ReflectionService {
  private notificationTools: NotificationTools;

  constructor(private store: FinanceStore) {
    this.notificationTools = new NotificationTools(store);
  }

  /**
   * Post-Workflow Reflection Evaluation & Autonomous Recommendation Synthesis
   */
  async reflectAndEvaluate(
    workflowName: string,
    steps: WorkflowStepResult[],
    ctx: ExecutionContext
  ): Promise<ReflectionEvaluation> {
    const lowConfidenceSteps: string[] = [];
    const recommendations: string[] = [];
    const autoNotifs: any[] = [];
    let totalConfidence = 0;

    for (const s of steps) {
      totalConfidence += s.confidence;
      if (s.confidence < 0.6) {
        lowConfidenceSteps.push(`${s.step_name} (Confidence: ${s.confidence * 100}%)`);
      }
    }

    const avgConfidence = steps.length > 0 ? Number((totalConfidence / steps.length).toFixed(2)) : 1.0;

    // Autonomous Proactive Recommendations Engine
    const txns = this.store.listTransactions();
    const income = this.store.getMonthlyIncome() || 60000;

    // 1. Forgotten micro-subscriptions check
    const recurringSubs = txns.filter(
      (t) =>
        t.direction === 'debit' &&
        (t.description.toLowerCase().includes('spotify') ||
          t.description.toLowerCase().includes('netflix') ||
          t.description.toLowerCase().includes('prime'))
    );
    if (recurringSubs.length > 0) {
      recommendations.push(
        `💡 Autonomous Recommendation: You have ${recurringSubs.length} active subscription(s) (e.g. ${recurringSubs[0].description}). Consider switching to student discounted plans to save up to ₹500/month.`
      );
    }

    // 2. High food spending check (> 25% of budget)
    const foodSpend = txns
      .filter((t) => t.category === 'Food & Dining' || t.description.toLowerCase().includes('swiggy') || t.description.toLowerCase().includes('zomato'))
      .reduce((s, t) => s + t.amount, 0);
    if (foodSpend > income * 0.25) {
      recommendations.push(
        `🍱 Autonomous Recommendation: Food & Dining expenditure is ₹${foodSpend.toLocaleString(
          'en-IN'
        )} (${((foodSpend / income) * 100).toFixed(
          1
        )}% of monthly income). Trimming food delivery orders by 20% can save ₹${(foodSpend * 0.2).toLocaleString(
          'en-IN'
        )}/month.`
      );
    }

    // 3. Automated Notification Scheduling (Bill Due / Overspending Alerts)
    const totalSpend = txns.filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
    if (totalSpend > income) {
      const warningNotif = await this.notificationTools.manageNotifications(
        {
          action: 'send',
          type: 'warning',
          title: 'Automated Overspending Alert',
          message: `Your total spending (₹${totalSpend.toLocaleString(
            'en-IN'
          )}) exceeds your monthly income (₹${income.toLocaleString('en-IN')}) by ₹${(totalSpend - income).toLocaleString('en-IN')}.`,
          trigger_source: 'reflection_module',
        },
        ctx
      );
      autoNotifs.push(warningNotif);
    }

    const reflectionSummary = [
      `🔍 REFLECTION EVALUATION (${workflowName}):`,
      `• Execution Status: ${lowConfidenceSteps.length === 0 ? 'COMPLETE & HIGH CONFIDENCE' : 'COMPLETED WITH WARNINGS'}`,
      `• Overall Workflow Confidence: ${(avgConfidence * 100).toFixed(0)}%`,
      lowConfidenceSteps.length > 0 ? `• Low Confidence Signals: ${lowConfidenceSteps.join(', ')}` : '',
      recommendations.length > 0 ? `\n${recommendations.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    ctx.logger.info('ReflectionEngine: Completed Reflection & Evaluation', {
      workflowName,
      avgConfidence,
      recommendationsCount: recommendations.length,
    });

    return {
      overall_workflow_success: lowConfidenceSteps.length === 0,
      average_confidence: avgConfidence,
      low_confidence_steps: lowConfidenceSteps,
      autonomous_recommendations: recommendations,
      auto_triggered_notifications: autoNotifs,
      reflection_summary: reflectionSummary,
    };
  }
}
