import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Reviews Resources
 * Provides reference data for the reviews system.
 */
export class ReviewsResources {
  @Resource({
    uri: 'reviews://verification-statuses',
    name: 'Verification Statuses',
    description: 'Possible review verification statuses and their meanings',
    mimeType: 'application/json',
  })
  async getVerificationStatuses(context: ExecutionContext) {
    const statuses = {
      unverified: {
        label: 'Unverified',
        description: 'Review submitted without supporting evidence',
        trust_impact: 'Neutral — no boost or penalty from verification',
      },
      verified: {
        label: 'Verified',
        description: 'Review has supporting evidence (receipt, photo, etc.)',
        trust_impact: 'Positive — adds up to +30 to the trust score',
      },
      flagged: {
        label: 'Flagged',
        description: 'Review has been flagged by a moderator after a community report',
        trust_impact: 'Negative — reduced visibility',
      },
      removed: {
        label: 'Removed',
        description: 'Review has been soft-deleted',
        trust_impact: 'Review excluded from all calculations',
      },
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(statuses, null, 2),
    };
  }

  @Resource({
    uri: 'reviews://evidence-types',
    name: 'Evidence Types',
    description: 'Supported evidence file types for review verification',
    mimeType: 'application/json',
  })
  async getEvidenceTypes(context: ExecutionContext) {
    const types = [
      { type: 'receipt', label: 'Receipt', description: 'Purchase or payment receipt', trust_boost: 30 },
      { type: 'booking', label: 'Booking Confirmation', description: 'Hotel, restaurant, or service booking', trust_boost: 30 },
      { type: 'delivery', label: 'Delivery Confirmation', description: 'Delivery slip or shipping confirmation', trust_boost: 30 },
      { type: 'photo', label: 'Photo', description: 'Photo taken at the location or of the product', trust_boost: 15 },
      { type: 'other', label: 'Other', description: 'Any other supporting document', trust_boost: 15 },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(types, null, 2),
    };
  }

  @Resource({
    uri: 'reviews://sort-options',
    name: 'Sort Options',
    description: 'Available sort options when listing reviews',
    mimeType: 'application/json',
  })
  async getSortOptions(context: ExecutionContext) {
    const options = [
      { value: 'recent', label: 'Most Recent', description: 'Newest reviews first' },
      { value: 'rating_high', label: 'Highest Rated', description: 'Reviews with highest star rating first' },
      { value: 'rating_low', label: 'Lowest Rated', description: 'Reviews with lowest star rating first' },
      { value: 'trust_score', label: 'Most Trusted', description: 'Reviews with highest trust score first (recommended)' },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(options, null, 2),
    };
  }
}
