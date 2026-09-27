import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Business Resources
 * Reference data for business management on Vouch.
 */
export class BusinessResources {
  @Resource({
    uri: 'business://trust-levels',
    name: 'Business Trust Levels',
    description: 'Trust score ranges and what they mean for a business',
    mimeType: 'application/json',
  })
  async getTrustLevels(context: ExecutionContext) {
    const levels = [
      {
        range: '80-100',
        label: 'Highly Trusted',
        color: 'green',
        description: 'Business has overwhelmingly verified, high-quality reviews from reputable reviewers',
        badge: '✅ Highly Trusted',
      },
      {
        range: '60-79',
        label: 'Trusted',
        color: 'light-green',
        description: 'Business has mostly verified reviews with positive community signals',
        badge: '👍 Trusted',
      },
      {
        range: '40-59',
        label: 'Mixed',
        color: 'yellow',
        description: 'Mix of verified and unverified reviews; some community concerns',
        badge: '⚠️ Mixed',
      },
      {
        range: '20-39',
        label: 'Low Trust',
        color: 'orange',
        description: 'Reviews have low evidence, new reviewers, or community flags',
        badge: '❗ Low Trust',
      },
      {
        range: '0-19',
        label: 'Under Investigation',
        color: 'red',
        description: 'High fraud risk signals detected — review with caution',
        badge: '🚨 Under Investigation',
      },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(levels, null, 2),
    };
  }

  @Resource({
    uri: 'business://fraud-risk-levels',
    name: 'Fraud Risk Levels',
    description: 'Fraud risk score interpretation for businesses',
    mimeType: 'application/json',
  })
  async getFraudRiskLevels(context: ExecutionContext) {
    const levels = [
      { range: '0-20', label: 'Low Risk', description: 'No significant fraud patterns detected' },
      { range: '21-40', label: 'Elevated', description: 'Minor anomalies — monitor for changes' },
      { range: '41-60', label: 'Medium Risk', description: 'Suspicious patterns — review moderation queue' },
      { range: '61-80', label: 'High Risk', description: 'Strong fraud signals — escalate for investigation' },
      { range: '81-100', label: 'Critical', description: 'Coordinated fraud likely — immediate action required' },
    ];

    return {
      type: 'text' as const,
      text: JSON.stringify(levels, null, 2),
    };
  }
}
