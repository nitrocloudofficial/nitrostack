import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Community Prompts
 * Guides AI agents through community moderation and reaction workflows.
 */
export class CommunityPrompts {
  @Prompt({
    name: 'community-react',
    description: 'Guide a user through reacting to a review',
  })
  async reactGuide(args: Record<string, unknown>, context: ExecutionContext) {
    const reviewId = args['review_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help me react to review ${reviewId ?? '[review_id]'} on Vouch:
1. Use community_get_reactions to see the current reaction counts
2. Use community_add_reaction to add a 'helpful', 'agree', or 'disagree' reaction
3. If the review seems fake or misleading, use community_file_report to file a report with a reason

Note: You can only react once per type per review. Use community_remove_reaction to undo a reaction.

Use the community://reaction-types resource to understand what each reaction means.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'moderation-queue',
    description: 'Guide a moderator through resolving pending reports',
  })
  async moderationGuide(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help me work through the moderation queue on Vouch:
1. Use community_get_reports_queue with status='pending' to get reports needing review
2. For each report, use reviews_get to read the flagged review and its trust score
3. Use ai_get_analysis to check the spam score and fraud patterns
4. Decide: 'upheld' (remove the review), 'dismissed' (keep the review), or 'escalated' (needs senior review)
5. Use community_resolve_report to record the decision

Upholding a report will automatically flag the review and reduce the reviewer's reputation.`,
        },
      },
    ];
  }
}
