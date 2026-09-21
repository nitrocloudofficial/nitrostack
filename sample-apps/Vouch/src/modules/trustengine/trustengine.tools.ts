import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { TrustEngineService } from '../../lib/trust-engine.service.js';
import { DatabaseService } from '../../lib/database.service.js';

/**
 * Trust Engine Tools
 * Exposes trust scoring, explainability, and fraud detection.
 */
@Injectable({ deps: [TrustEngineService, DatabaseService] })
export class TrustEngineTools {
  constructor(
    private trustEngine: TrustEngineService,
    private db: DatabaseService
  ) {}

  @Tool({
    name: 'trust_compute_score',
    description: 'Compute and save trust score for a review',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  @Widget('trust-breakdown')
  async computeScore(input: { review_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Computing trust score', { review_id: input.review_id });

    try {
      const result = await this.trustEngine.computeTrustScore(input.review_id);
      await this.trustEngine.saveTrustScore(input.review_id, result);

      ctx.logger.info('Trust score computed', {
        review_id: input.review_id,
        score: result.score,
      });

      return {
        success: true,
        review_id: input.review_id,
        score: result.score,
        verified: result.verified,
        reasons: result.reasons,
        breakdown: result.breakdown,
      };
    } catch (error) {
      ctx.logger.error('Trust score computation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Trust score computation failed',
        code: 'COMPUTE_ERROR',
      };
    }
  }

  @Tool({
    name: 'trust_get_score',
    description: 'Get the current trust score and reasons for a review',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  async getScore(input: { review_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching trust score', { review_id: input.review_id });

    try {
      // Get latest trust score
      const trustScore = await this.db.queryOne<any>(
        `SELECT score, reasons, evidence_score, reputation_score, originality_score, account_age_score, community_score, computed_at
         FROM trust_scores
         WHERE review_id = $1
         ORDER BY computed_at DESC
         LIMIT 1`,
        [input.review_id]
      );

      if (!trustScore) {
        return {
          success: false,
          error: 'Trust score not found',
          code: 'NOT_FOUND',
        };
      }

      // Get review verification status
      const review = await this.db.queryOne<any>(
        `SELECT verification_status FROM reviews WHERE id = $1`,
        [input.review_id]
      );

      return {
        success: true,
        review_id: input.review_id,
        score: trustScore.score,
        verified: review?.verification_status === 'verified',
        reasons: JSON.parse(trustScore.reasons || '[]'),
        breakdown: {
          evidence_score: trustScore.evidence_score,
          reputation_score: trustScore.reputation_score,
          originality_score: trustScore.originality_score,
          account_age_score: trustScore.account_age_score,
          community_score: trustScore.community_score,
        },
        computed_at: trustScore.computed_at,
      };
    } catch (error) {
      ctx.logger.error('Trust score fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Trust score fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'trust_get_score_history',
    description: 'Get trust score history for a review',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
      limit: z.number().int().min(1).max(50).default(10).describe('Number of historical scores to return'),
    }),
  })
  async getScoreHistory(
    input: { review_id: string; limit?: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Fetching trust score history', { review_id: input.review_id });

    try {
      const history = await this.trustEngine.getTrustScoreHistory(input.review_id, input.limit || 10);

      return {
        success: true,
        review_id: input.review_id,
        history: history.map((h: any) => ({
          score: h.score,
          reasons: JSON.parse(h.reasons || '[]'),
          breakdown: {
            evidence_score: h.evidence_score,
            reputation_score: h.reputation_score,
            originality_score: h.originality_score,
            account_age_score: h.account_age_score,
            community_score: h.community_score,
          },
          computed_at: h.computed_at,
        })),
      };
    } catch (error) {
      ctx.logger.error('Trust score history fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Trust score history fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'trust_recalculate',
    description: 'Recalculate trust score for a review (called when signals change)',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  async recalculate(input: { review_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Recalculating trust score', { review_id: input.review_id });

    try {
      const result = await this.trustEngine.recalculateTrustScore(input.review_id);

      ctx.logger.info('Trust score recalculated', {
        review_id: input.review_id,
        score: result.score,
      });

      return {
        success: true,
        review_id: input.review_id,
        score: result.score,
        verified: result.verified,
        reasons: result.reasons,
        breakdown: result.breakdown,
      };
    } catch (error) {
      ctx.logger.error('Trust score recalculation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Trust score recalculation failed',
        code: 'RECALC_ERROR',
      };
    }
  }

  @Tool({
    name: 'trust_business_fraud_risk',
    description: 'Compute fraud risk score for a business',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
    }),
  })
  async businessFraudRisk(input: { business_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Computing business fraud risk', { business_id: input.business_id });

    try {
      const result = await this.trustEngine.computeBusinessFraudRisk(input.business_id);

      ctx.logger.info('Business fraud risk computed', {
        business_id: input.business_id,
        fraud_risk_score: result.fraud_risk_score,
      });

      return {
        success: true,
        business_id: input.business_id,
        fraud_risk_score: result.fraud_risk_score,
        reasons: result.reasons,
        review_spike: result.review_spike,
        rating_anomaly: result.rating_anomaly,
      };
    } catch (error) {
      ctx.logger.error('Business fraud risk computation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Business fraud risk computation failed',
        code: 'COMPUTE_ERROR',
      };
    }
  }
}
