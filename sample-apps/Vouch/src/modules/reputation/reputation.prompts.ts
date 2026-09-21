import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Reputation Prompts
 * Guides AI agents through reputation and badge workflows.
 */
export class ReputationPrompts {
  @Prompt({
    name: 'reputation-profile',
    description: 'Help a user understand their reputation profile and how to progress',
  })
  async profileGuide(args: Record<string, unknown>, context: ExecutionContext) {
    const userId = args['user_id'] as string | undefined;
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Show me my reputation profile on Vouch:
1. Use reputation_get_profile with user_id ${userId ?? '[user_id]'} to see my reputation points, badge tier, and earned badges
2. Explain what my current badge tier means
3. Show how many more points I need to reach the next tier
4. Suggest actions I can take to earn more points (submit reviews, add evidence, earn reactions)

Use the reputation://points-guide resource to see all the ways to earn points.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'leaderboard-explore',
    description: 'Show the top reviewers on Vouch',
  })
  async leaderboardGuide(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Show me the top reviewers on Vouch:
1. Use reputation_leaderboard with sort_by reputation_points to get the top 20
2. Show their badge tiers and total reviews
3. Highlight any Truth Keepers or Community Guardians (elite tiers)
4. Explain what makes these reviewers stand out

Use the reputation://badges resource to see all available badges and how to earn them.`,
        },
      },
    ];
  }
}
