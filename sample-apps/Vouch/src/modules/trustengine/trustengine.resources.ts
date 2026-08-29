import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * TrustEngine Resources
 * Explains the trust scoring model to consumers and AI agents.
 */
export class TrustEngineResources {
  @Resource({
    uri: 'trustengine://scoring-model',
    name: 'Trust Scoring Model',
    description: 'Breakdown of how trust scores are calculated for reviews',
    mimeType: 'application/json',
  })
  async getScoringModel(context: ExecutionContext) {
    const model = {
      baseline: 50,
      max_score: 100,
      min_score: 0,
      signals: {
        evidence_score: {
          max: 30,
          description: 'Points for attaching verified evidence (receipts, photos, bookings)',
          breakdown: {
            verified_evidence: 30,
            unverified_evidence: 15,
            no_evidence: 0,
          },
        },
        reputation_score: {
          max: 20,
          description: 'Points based on the reviewer\'s badge tier',
          breakdown: {
            truth_keeper: 20,
            community_guardian: 18,
            expert_reviewer: 15,
            trusted_reviewer: 10,
            verified_reviewer: 5,
            new_reviewer: 0,
          },
        },
        originality_score: {
          max: 20,
          description: 'Points for original, non-duplicate content',
          breakdown: {
            highly_original: 20,
            mostly_original: 10,
            possible_duplicate: 0,
          },
        },
        account_age_score: {
          max: 15,
          description: 'Points for having an established account',
          breakdown: {
            '180_plus_days': 15,
            '30_to_180_days': 8,
            'under_30_days': 0,
          },
        },
        community_score: {
          max: 15,
          description: 'Points based on community helpful/agree reactions',
          breakdown: {
            'net_reactions_gt_5': 15,
            'net_reactions_gt_0': 8,
            'zero_or_negative': 0,
          },
        },
      },
      penalties: {
        rapid_submission: -15,
        sentiment_rating_mismatch: -10,
        community_reports: -10,
      },
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(model, null, 2),
    };
  }

  @Resource({
    uri: 'trustengine://fraud-signals',
    name: 'Fraud Detection Signals',
    description: 'Signals used to detect fraud patterns at the business level',
    mimeType: 'application/json',
  })
  async getFraudSignals(context: ExecutionContext) {
    const signals = {
      review_spike: {
        description: 'More than 10 reviews submitted within 24 hours',
        risk_increase: 25,
        threshold: 10,
        window: '24 hours',
      },
      rating_anomaly: {
        description: 'Recent average rating differs from all-time average by more than 1.5 stars',
        risk_increase: 20,
        threshold: 1.5,
      },
      low_trust_concentration: {
        description: 'More than 5 reviews with trust score below 40',
        risk_increase: 15,
        threshold: 5,
      },
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(signals, null, 2),
    };
  }
}
