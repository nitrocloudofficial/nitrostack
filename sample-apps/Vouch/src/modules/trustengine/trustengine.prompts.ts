import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * TrustEngine Prompts
 * Guides AI agents through trust scoring workflows.
 */
export class TrustEnginePrompts {
  @Prompt({
    name: 'trust-score-explainer',
    description: 'Explain a review\'s trust score to a user in plain language',
  })
  async explainScore(args: Record<string, unknown>, context: ExecutionContext) {
    const reviewId = args['review_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Explain the trust score for review ${reviewId ?? '[review_id]'} in plain language.
1. Use trust_get_score to fetch the current score and breakdown
2. Interpret each signal (evidence, reputation, originality, account age, community) in simple terms
3. Explain what the reviewer could do to improve the score (e.g., add evidence, react with the community)
4. Compare the score to the platform average if possible using trust_get_score_history

Use the trustengine://scoring-model resource to understand the scoring weights.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'fraud-investigation',
    description: 'Investigate potential fraud for a business',
  })
  async fraudInvestigation(args: Record<string, unknown>, context: ExecutionContext) {
    const businessId = args['business_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Investigate fraud signals for business ${businessId ?? '[business_id]'}:
1. Use trust_business_fraud_risk to get the fraud risk score and reasons
2. Use ai_detect_duplicates to find suspicious duplicate reviews
3. Use ai_spam_risk_reviews to identify high-spam-score reviews
4. Use community_get_reports_queue to see pending moderation reports
5. Summarise findings: fraud risk level (low/medium/high), main signals, and recommended actions

Use the trustengine://fraud-signals resource to understand what each signal means.`,
        },
      },
    ];
  }
}
