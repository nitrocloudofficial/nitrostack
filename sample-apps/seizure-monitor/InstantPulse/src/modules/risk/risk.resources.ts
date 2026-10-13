import { ResourceDecorator as Resource, type ExecutionContext } from '@nitrostack/core';
import { FACTOR_LABELS, RISK_POLICY } from './risk.policy.js';

export class RiskResources {
  @Resource({
    uri: 'instantpulse://policy/risk-model',
    name: 'Risk scoring policy',
    description:
      'The complete scoring policy: factor weights, breakpoints, band thresholds, hard blockers, soft flags ' +
      'and the credit-limit formula. Published verbatim so any decision can be independently recomputed and ' +
      'checked. Nothing about the score lives in a weight nobody can see.',
    mimeType: 'application/json',
  })
  async getPolicy(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Risk policy served', { version: RISK_POLICY.version });

    const payload = {
      ...RISK_POLICY,

      factorLabels: FACTOR_LABELS,

      howToRead: {
        scoring:
          'Each factor maps its signal onto 0–1 between its `zeroAt` and `fullAt` breakpoints, then ' +
          'multiplies by its weight. Weights sum to 100. Where `fullAt` is lower than `zeroAt` the factor is ' +
          'inverted — lower signal is better.',
        confidenceDamping:
          'Revenue trend is additionally scaled by the R² of its regression. A slope measured through noisy ' +
          'revenue is pulled toward neutral rather than scored as fact, so seasonal businesses are not ' +
          'penalised for seasonality.',
        anomalies:
          `Anomaly penalties are summed and capped at ${RISK_POLICY.anomalyPenaltyCap} points, then ` +
          'subtracted from the raw score. Recurring transactions are exempt from anomaly detection.',
        precedence:
          'Hard blockers force RED whatever the score. Otherwise the score sets the band, and any soft flag ' +
          'caps an otherwise-GREEN application at YELLOW so a human makes the final call.',
        creditLimit:
          'The recommended limit is the *lowest* of three independent ceilings — revenue, liquidity and ' +
          'affordability — not a blend. A business is only as creditworthy as its weakest answer, and the ' +
          'binding ceiling is reported so an officer can see what would have to change.',
      },

      guarantees: [
        'Deterministic: the same metrics always produce the same score, band and limit.',
        'No language model participates in scoring. Models are used only to narrate a decision already made.',
        'Every point awarded or withheld produces a reason code with a human-readable explanation.',
        'No adverse decision is issued without an explicit, listed reason.',
      ],
    };

    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) }],
    };
  }
}
