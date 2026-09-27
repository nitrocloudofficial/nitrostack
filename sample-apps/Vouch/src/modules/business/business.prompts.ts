import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Business Prompts
 * Guides AI agents through business management workflows.
 */
export class BusinessPrompts {
  @Prompt({
    name: 'business-setup',
    description: 'Guide a business owner through registering and setting up their profile',
  })
  async setupGuide(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help me set up my business on Vouch:
1. First make sure I'm signed in with a 'business' role account — use auth_login if needed
2. Use business_register with my user_id, business name, and description
3. After registration, use business_get to confirm my profile is created correctly
4. Show me my initial trust score and what I can do to improve it

A higher trust score comes from having more verified reviews from reputable reviewers.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'business-dashboard-summary',
    description: 'Generate a plain-language summary of a business\'s Vouch dashboard',
  })
  async dashboardSummary(args: Record<string, unknown>, context: ExecutionContext) {
    const businessId = args['business_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Give me a full dashboard summary for business ${businessId ?? '[business_id]'} on Vouch:
1. Use business_dashboard to get all metrics in one call
2. Summarise: overall trust score, average rating, review count, and fraud risk level
3. Highlight the top 3 things people love and the top 3 complaints from ai_summary
4. Flag any fraud signals using the business://fraud-risk-levels resource to interpret the score
5. List the 3 most recent reviews with their trust scores
6. Tell me the pending moderation report count and whether action is needed

Use the business://trust-levels resource to give the trust score a plain-English label.`,
        },
      },
    ];
  }
}
