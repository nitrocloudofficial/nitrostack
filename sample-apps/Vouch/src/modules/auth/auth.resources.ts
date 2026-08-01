import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Auth Resources
 * Provides static reference data for auth flows.
 */
export class AuthResources {
  @Resource({
    uri: 'auth://roles',
    name: 'User Roles',
    description: 'Available user roles and their permissions',
    mimeType: 'application/json',
  })
  async getRoles(context: ExecutionContext) {
    const roles = {
      consumer: {
        name: 'Consumer',
        description: 'Regular user who can submit and read reviews',
        permissions: ['reviews:read', 'reviews:write', 'reactions:write', 'reports:write'],
      },
      business: {
        name: 'Business Owner',
        description: 'Business owner who can manage their business profile',
        permissions: ['reviews:read', 'business:write', 'business:read'],
      },
      moderator: {
        name: 'Moderator',
        description: 'Can resolve reports and moderate content',
        permissions: ['reviews:read', 'reviews:moderate', 'reports:resolve', 'business:read'],
      },
      admin: {
        name: 'Administrator',
        description: 'Full platform access',
        permissions: ['*'],
      },
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(roles, null, 2),
    };
  }

  @Resource({
    uri: 'auth://badge-tiers',
    name: 'Reviewer Badge Tiers',
    description: 'Reviewer reputation tiers and point thresholds',
    mimeType: 'application/json',
  })
  async getBadgeTiers(context: ExecutionContext) {
    const tiers = [
      { tier: 'new_reviewer', label: 'New Reviewer', min_points: 0, description: 'Just getting started' },
      { tier: 'verified_reviewer', label: 'Verified Reviewer', min_points: 50, description: 'Email verified and active' },
      { tier: 'trusted_reviewer', label: 'Trusted Reviewer', min_points: 150, description: 'Consistently helpful reviews' },
      { tier: 'expert_reviewer', label: 'Expert Reviewer', min_points: 300, description: 'High-quality, evidence-backed reviews' },
      { tier: 'community_guardian', label: 'Community Guardian', min_points: 500, description: 'Active community contributor' },
      { tier: 'truth_keeper', label: 'Truth Keeper', min_points: 1000, description: 'Elite reviewer with exceptional accuracy' },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(tiers, null, 2),
    };
  }
}
