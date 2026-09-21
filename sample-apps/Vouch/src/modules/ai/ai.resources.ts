import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * AI Resources
 * Reference data for the AI analysis system.
 */
export class AIResources {
  @Resource({
    uri: 'ai://analysis-signals',
    name: 'AI Analysis Signals',
    description: 'Explanation of all AI signals computed per review',
    mimeType: 'application/json',
  })
  async getAnalysisSignals(context: ExecutionContext) {
    const signals = {
      sentiment: {
        description: 'Sentiment detected from the review text',
        values: ['positive', 'neutral', 'negative'],
        method: 'Keyword-based heuristic combined with star rating',
        use_in_trust: 'Used to detect rating/sentiment mismatch (penalty: -10)',
      },
      sentiment_confidence: {
        description: 'Confidence score for the sentiment prediction (0.0 to 1.0)',
        range: '0.5 (low) to 1.0 (high)',
      },
      similarity_score: {
        description: 'Maximum text similarity to other reviews for the same business (Jaccard index)',
        range: '0.0 (unique) to 1.0 (identical)',
        duplicate_threshold: 0.85,
      },
      duplicate_flags: {
        description: 'List of review IDs that are highly similar to this review',
        threshold: 0.85,
      },
      spam_score: {
        description: 'Probability that the review is spam or fraudulent (0-100)',
        thresholds: {
          low: '0-25',
          medium: '26-50',
          high: '51-100',
        },
      },
      fraud_patterns: {
        description: 'Specific fraud patterns detected',
        patterns: {
          rapid_submission: 'More than 3 reviews in 1 hour',
          extreme_rating_bias: 'Over 80% of reviews are all-5-star or all-1-star',
          generic_text: 'Review text under 20 characters',
          multiple_reviews_same_business: 'More than 2 reviews for same business in 7 days',
        },
      },
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(signals, null, 2),
    };
  }

  @Resource({
    uri: 'ai://spam-thresholds',
    name: 'Spam Score Thresholds',
    description: 'Spam score ranges and recommended actions',
    mimeType: 'application/json',
  })
  async getSpamThresholds(context: ExecutionContext) {
    const thresholds = [
      { range: '0-25', label: 'Low Risk', action: 'No action needed' },
      { range: '26-50', label: 'Moderate Risk', action: 'Flag for community review' },
      { range: '51-75', label: 'High Risk', action: 'Reduce visibility, add to moderation queue' },
      { range: '76-100', label: 'Very High Risk', action: 'Immediate moderation — likely spam or coordinated fraud' },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(thresholds, null, 2),
    };
  }
}
