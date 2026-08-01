import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import { NotificationTools } from '../notification/notification.tools.js';

@Injectable({ deps: [FinanceStore] })
export class HealthInsuranceTools {
  private notificationTools: NotificationTools;

  constructor(private store: FinanceStore) {
    this.notificationTools = new NotificationTools(store);
  }

  @Tool({
    name: 'analyze_health_insurance',
    description:
      'Evaluate health insurance adequacy based on age, dependents, city tier (metro/non-metro), and existing coverage. Recommends ideal sum insured, calculates underinsurance gap, estimates premium ranges, and surfaces warning notifications if unprotected.',
    inputSchema: z.object({
      age: z.number().positive().default(22).describe('User age in years'),
      existing_coverage_amount: z
        .number()
        .min(0)
        .default(0)
        .describe('Current health insurance sum insured in rupees (0 if no health insurance)'),
      dependents: z
        .number()
        .min(0)
        .default(0)
        .describe('Number of financial dependents (parents, spouse, children)'),
      monthly_budget: z
        .number()
        .optional()
        .describe('Optional target monthly budget for health insurance premium'),
      city_tier: z
        .enum(['metro', 'non_metro'])
        .default('metro')
        .describe('City tier (metro tier-1 vs non-metro) for medical cost-of-care context'),
      existing_conditions: z
        .array(z.string())
        .optional()
        .describe('Optional pre-existing health conditions declared by the user'),
    }),
  })
  async analyzeHealthInsurance(input: any, ctx: ExecutionContext) {
    const age = input.age || 22;
    const existingCoverage = input.existing_coverage_amount || 0;
    const dependents = input.dependents || 0;
    const isMetro = (input.city_tier || 'metro') === 'metro';

    // Base coverage matrix
    let baseSumInsured = 500000; // 5 Lakhs default for young adults
    if (age > 35 && age <= 50) baseSumInsured = 1000000; // 10 Lakhs
    if (age > 50) baseSumInsured = 1500000; // 15 Lakhs

    // Add per-dependent coverage
    baseSumInsured += dependents * 300000;

    // Apply Metro cost multiplier (+20% for higher hospital room rates in metros)
    if (isMetro) {
      baseSumInsured = Math.round(baseSumInsured * 1.2);
    }

    const recommendedCoverage = Math.round(baseSumInsured / 50000) * 50000;
    const coverageGap = Math.max(0, recommendedCoverage - existingCoverage);

    let status: 'no_coverage' | 'underinsured' | 'adequate' = 'adequate';
    if (existingCoverage === 0) {
      status = 'no_coverage';
    } else if (existingCoverage < recommendedCoverage * 0.8) {
      status = 'underinsured';
    }

    // Estimate premium range (rule-based heuristic based on age & recommended sum insured)
    const basePremiumRate = age < 30 ? 0.008 : age < 45 ? 0.012 : 0.018;
    const estimatedAnnualPremiumMin = Math.round(recommendedCoverage * basePremiumRate);
    const estimatedAnnualPremiumMax = Math.round(estimatedAnnualPremiumMin * 1.4);

    let explanation = '';
    if (status === 'no_coverage') {
      explanation = `⚠️ WARNING: You have ZERO health insurance coverage! For a ${age}-year-old living in a ${
        isMetro ? 'Metro' : 'Non-Metro'
      } city with ${dependents} dependent(s), a single hospital admittance can wipe out your savings. We recommend a minimum Sum Insured of ₹${recommendedCoverage.toLocaleString(
        'en-IN'
      )}.`;
    } else if (status === 'underinsured') {
      explanation = `You currently have ₹${existingCoverage.toLocaleString(
        'en-IN'
      )} coverage, but recommended Sum Insured is ₹${recommendedCoverage.toLocaleString(
        'en-IN'
      )} (Coverage gap: ₹${coverageGap.toLocaleString('en-IN')}). Consider a Top-Up or Super Top-Up policy.`;
    } else {
      explanation = `Your health insurance coverage of ₹${existingCoverage.toLocaleString(
        'en-IN'
      )} meets the recommended threshold of ₹${recommendedCoverage.toLocaleString('en-IN')}.`;
    }

    // Trigger Warning Notification if underinsured or no coverage
    let notificationResult = null;
    if (status !== 'adequate') {
      notificationResult = await this.notificationTools.sendNotification(
        {
          type: 'warning',
          title: status === 'no_coverage' ? 'No Health Insurance Protection Alert' : 'Underinsured Health Coverage Alert',
          message: explanation,
          trigger_source: 'health-insurance',
        },
        ctx
      );
    }

    ctx.logger.info('Analyzed health insurance', { age, status, recommendedCoverage, coverageGap });

    return {
      age,
      city_tier: input.city_tier || 'metro',
      dependents,
      existing_coverage_amount: existingCoverage,
      recommended_coverage_amount: recommendedCoverage,
      coverage_gap: coverageGap,
      coverage_status: status,
      is_adequate: status === 'adequate',
      estimated_annual_premium_range: {
        min_rupees: estimatedAnnualPremiumMin,
        max_rupees: estimatedAnnualPremiumMax,
        monthly_approx: Math.round(estimatedAnnualPremiumMin / 12),
      },
      surfaced_notification: notificationResult,
      explanation_text: explanation,
    };
  }
}
