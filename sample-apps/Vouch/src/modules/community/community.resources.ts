import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Community Resources
 * Reference data for community reactions and moderation.
 */
export class CommunityResources {
  @Resource({
    uri: 'community://reaction-types',
    name: 'Reaction Types',
    description: 'Types of community reactions available on reviews',
    mimeType: 'application/json',
  })
  async getReactionTypes(context: ExecutionContext) {
    const types = [
      {
        type: 'helpful',
        label: 'Helpful',
        description: 'The review helped you make a decision',
        trust_impact: 'Positive — increases community score of the review',
        reviewer_points: 5,
      },
      {
        type: 'agree',
        label: 'Agree',
        description: 'You agree with the reviewer\'s experience',
        trust_impact: 'Positive — increases community score of the review',
        reviewer_points: 3,
      },
      {
        type: 'disagree',
        label: 'Disagree',
        description: 'Your experience was different from the reviewer\'s',
        trust_impact: 'Slightly negative — reduces community score',
        reviewer_points: 0,
      },
      {
        type: 'report',
        label: 'Report',
        description: 'The review appears fake, misleading, or violates guidelines',
        trust_impact: 'Negative — triggers moderation review',
        reviewer_points: -2,
      },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(types, null, 2),
    };
  }

  @Resource({
    uri: 'community://report-reasons',
    name: 'Report Reasons',
    description: 'Valid reasons for filing a community report against a review',
    mimeType: 'application/json',
  })
  async getReportReasons(context: ExecutionContext) {
    const reasons = [
      { reason: 'fake', label: 'Fake Review', description: 'Reviewer did not actually use this business' },
      { reason: 'misleading', label: 'Misleading', description: 'Review contains false or misleading information' },
      { reason: 'spam', label: 'Spam', description: 'Promotional or repetitive content' },
      { reason: 'offensive', label: 'Offensive', description: 'Contains hate speech, harassment, or inappropriate content' },
      { reason: 'other', label: 'Other', description: 'Other violation — please describe in the report' },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(reasons, null, 2),
    };
  }
}
