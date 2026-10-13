import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Reviews Prompts
 * Guides AI agents through review workflows.
 */
export class ReviewsPrompts {
  @Prompt({
    name: 'reviews-submit-guide',
    description: 'Guide a user through submitting a review with evidence',
  })
  async submitGuide(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help me submit a review on Vouch. Here's what I need to do:
1. Use reviews_submit with my user_id, the business_id, a rating (1-5 stars), and my review text (at least 10 characters)
2. If I have supporting evidence (receipts, photos, booking confirmations), include their URLs in evidence_urls to boost my trust score by up to +30
3. After submitting, use trust_compute_score to calculate the review's trust score
4. Then use ai_analyze_review to run sentiment and duplicate detection on the review

A verified review (with evidence) has much higher visibility than an unverified one.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'reviews-explore-business',
    description: 'Help a user explore reviews for a specific business',
  })
  async exploreGuide(args: Record<string, unknown>, context: ExecutionContext) {
    const businessId = args['business_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help me explore reviews for ${businessId ? `business ${businessId}` : 'a business'} on Vouch:
1. Use reviews_list_by_business with sort_by='trust_score' to get the most trusted reviews first
2. Use business_dashboard to see the overall trust score, fraud risk, and sentiment breakdown
3. Use ai_business_summary to get what people love and dislike about this business
4. Use trust_business_fraud_risk to check if there are any fraud patterns

Always prioritise reviews with high trust scores — they have verified evidence and come from reputable reviewers.`,
        },
      },
    ];
  }
}
