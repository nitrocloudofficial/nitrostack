import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * AI Prompts
 * Guides AI agents through AI-powered analysis workflows.
 */
export class AIPrompts {
  @Prompt({
    name: 'ai-full-review-analysis',
    description: 'Run a complete AI analysis pipeline on a newly submitted review',
  })
  async fullAnalysis(args: Record<string, unknown>, context: ExecutionContext) {
    const reviewId = args['review_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Run the full AI analysis pipeline for review ${reviewId ?? '[review_id]'}:
1. Use ai_analyze_review to detect sentiment, duplicates, and spam patterns — this saves results to the database
2. Use trust_compute_score to compute the trust score using all signals (including the AI analysis just saved)
3. Report:
   - Sentiment: positive/neutral/negative with confidence
   - Similarity score and any duplicate review IDs found
   - Spam score and any fraud patterns detected
   - Final trust score with breakdown (evidence, reputation, originality, account age, community)
4. If spam_score > 50, recommend filing a moderation report
5. If duplicate_flags has entries, recommend investigating those reviews too

Use the ai://analysis-signals resource to understand what each signal means.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'ai-business-health-report',
    description: 'Generate a complete AI-powered health report for a business',
  })
  async businessHealthReport(args: Record<string, unknown>, context: ExecutionContext) {
    const businessId = args['business_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Generate an AI health report for business ${businessId ?? '[business_id]'}:
1. Use ai_sentiment_distribution to get the positive/neutral/negative split
2. Use ai_business_summary to get the "people love / people dislike" themes
3. Use ai_detect_duplicates with threshold 0.85 to find suspicious duplicate reviews
4. Use ai_spam_risk_reviews with threshold 50 to find high-risk reviews
5. Use trust_business_fraud_risk to get the overall fraud risk score

Present findings as:
- Overall sentiment health (% positive)
- Top 3 strengths (people love)
- Top 3 weaknesses (people dislike)
- Fraud risk summary (score + key signals)
- Number of duplicate and spam-risk reviews flagged
- Recommended next steps

Use the ai://spam-thresholds resource to interpret spam scores.`,
        },
      },
    ];
  }
}
