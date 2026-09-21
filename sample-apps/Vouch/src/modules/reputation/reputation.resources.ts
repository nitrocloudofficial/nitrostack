import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Reputation Resources
 * Reference data for the reputation and badge system.
 */
export class ReputationResources {
  @Resource({
    uri: 'reputation://points-guide',
    name: 'Reputation Points Guide',
    description: 'How users earn reputation points on Vouch',
    mimeType: 'application/json',
  })
  async getPointsGuide(context: ExecutionContext) {
    const guide = {
      earning_points: [
        { action: 'Submit a review', points: 10, notes: 'Awarded on first submission' },
        { action: 'Attach verified evidence', points: 15, notes: 'Receipt, booking, delivery confirmation' },
        { action: 'Verify your email', points: 10, notes: 'One-time award' },
        { action: 'Receive a "Helpful" reaction', points: 5, notes: 'Per reaction received' },
        { action: 'Receive an "Agree" reaction', points: 3, notes: 'Per reaction received' },
        { action: 'Review upheld by moderator', points: 20, notes: 'When your report is confirmed valid' },
      ],
      losing_points: [
        { action: 'Review flagged by moderator', points: -10, notes: 'Content violation' },
        { action: 'Review removed', points: -5, notes: 'Soft-deleted content' },
        { action: 'Receive a "Report" reaction', points: -2, notes: 'Per report received' },
      ],
      tier_thresholds: [
        { tier: 'new_reviewer', min_points: 0 },
        { tier: 'verified_reviewer', min_points: 50 },
        { tier: 'trusted_reviewer', min_points: 150 },
        { tier: 'expert_reviewer', min_points: 300 },
        { tier: 'community_guardian', min_points: 500 },
        { tier: 'truth_keeper', min_points: 1000 },
      ],
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(guide, null, 2),
    };
  }

  @Resource({
    uri: 'reputation://badges',
    name: 'Available Badges',
    description: 'All earnable badges on Vouch and how to earn them',
    mimeType: 'application/json',
  })
  async getBadges(context: ExecutionContext) {
    const badges = [
      { name: 'First Review', description: 'Submitted your first review', criteria: 'Submit 1 review' },
      { name: 'Evidence Champion', description: 'Attached evidence to 5 reviews', criteria: '5 verified reviews' },
      { name: 'Community Voice', description: 'Received 10 helpful reactions', criteria: '10 helpful reactions' },
      { name: 'Fraud Buster', description: 'Filed 3 reports that were upheld', criteria: '3 upheld reports' },
      { name: 'Consistent Contributor', description: 'Submitted reviews for 10 different businesses', criteria: '10 unique businesses reviewed' },
      { name: 'Top Reviewer', description: 'Reached the Truth Keeper tier', criteria: '1000 reputation points' },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(badges, null, 2),
    };
  }
}
