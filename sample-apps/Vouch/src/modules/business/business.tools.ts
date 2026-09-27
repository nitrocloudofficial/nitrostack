import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../lib/database.service.js';
import { TrustEngineService } from '../../lib/trust-engine.service.js';
import { AIAnalysisService } from '../../lib/ai-analysis.service.js';

/**
 * Business Tools
 * Handles business registration, dashboard data, and business-specific operations.
 */
@Injectable({ deps: [DatabaseService, TrustEngineService, AIAnalysisService] })
export class BusinessTools {
  constructor(
    private db: DatabaseService,
    private trustEngine: TrustEngineService,
    private aiAnalysis: AIAnalysisService
  ) {}

  @Tool({
    name: 'business_register',
    description: 'Register a new business',
    inputSchema: z.object({
      owner_user_id: z.string().uuid().describe('Owner User ID'),
      name: z.string().min(3).describe('Business name'),
      description: z.string().optional().describe('Business description'),
    }),
  })
  async registerBusiness(
    input: {
      owner_user_id: string;
      name: string;
      description?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Registering business', {
      owner_user_id: input.owner_user_id,
      name: input.name,
    });

    try {
      const business = await this.db.queryOne<any>(
        `INSERT INTO businesses (owner_user_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING id, owner_user_id, name, description, created_at`,
        [input.owner_user_id, input.name, input.description || null]
      );

      ctx.logger.info('Business registered', { business_id: business?.id });

      return {
        success: true,
        business: business,
      };
    } catch (error) {
      ctx.logger.error('Business registration failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Business registration failed',
        code: 'REGISTRATION_ERROR',
      };
    }
  }

  @Tool({
    name: 'business_get',
    description: 'Get business profile',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
    }),
  })
  async getBusiness(input: { business_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching business', { business_id: input.business_id });

    try {
      const business = await this.db.queryOne<any>(
        `SELECT id, owner_user_id, name, description, trust_score_avg, fraud_risk_score, review_count, created_at, updated_at
         FROM businesses
         WHERE id = $1`,
        [input.business_id]
      );

      if (!business) {
        return {
          success: false,
          error: 'Business not found',
          code: 'NOT_FOUND',
        };
      }

      return {
        success: true,
        business: business,
      };
    } catch (error) {
      ctx.logger.error('Business fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Business fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'business_dashboard',
    description: 'Get comprehensive dashboard data for a business',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
    }),
  })
  @Widget('business-dashboard')
  async getDashboard(input: { business_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching business dashboard', { business_id: input.business_id });

    try {
      // Get business info
      const business = await this.db.queryOne<any>(
        `SELECT id, name, trust_score_avg, fraud_risk_score, review_count FROM businesses WHERE id = $1`,
        [input.business_id]
      );

      if (!business) {
        return {
          success: false,
          error: 'Business not found',
          code: 'NOT_FOUND',
        };
      }

      // Get trust score distribution
      const trustDistribution = await this.db.queryOne<any>(
        `SELECT 
          COUNT(CASE WHEN trust_score >= 80 THEN 1 END) as high_trust,
          COUNT(CASE WHEN trust_score >= 60 AND trust_score < 80 THEN 1 END) as medium_trust,
          COUNT(CASE WHEN trust_score < 60 THEN 1 END) as low_trust,
          COUNT(*) as total
         FROM reviews
         WHERE business_id = $1`,
        [input.business_id]
      );

      // Get rating distribution
      const ratingDistribution = await this.db.queryOne<any>(
        `SELECT 
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
          AVG(rating) as avg_rating
         FROM reviews
         WHERE business_id = $1`,
        [input.business_id]
      );

      // Get recent reviews
      const recentReviews = await this.db.queryAll<any>(
        `SELECT id, user_id, rating, text, trust_score, verification_status, created_at
         FROM reviews
         WHERE business_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [input.business_id]
      );

      // Get fraud risk
      const fraudRisk = await this.trustEngine.computeBusinessFraudRisk(input.business_id);

      // Get AI summary
      const summary = await this.aiAnalysis.generateBusinessSummary(input.business_id);

      // Get pending reports
      const pendingReports = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM community_reports WHERE review_id IN (SELECT id FROM reviews WHERE business_id = $1) AND status = 'pending'`,
        [input.business_id]
      );

      return {
        success: true,
        business: {
          id: business.id,
          name: business.name,
          trust_score_avg: business.trust_score_avg,
          fraud_risk_score: business.fraud_risk_score,
          review_count: business.review_count,
        },
        trust_distribution: {
          high_trust: trustDistribution?.high_trust || 0,
          medium_trust: trustDistribution?.medium_trust || 0,
          low_trust: trustDistribution?.low_trust || 0,
          total: trustDistribution?.total || 0,
        },
        rating_distribution: {
          five_star: ratingDistribution?.five_star || 0,
          four_star: ratingDistribution?.four_star || 0,
          three_star: ratingDistribution?.three_star || 0,
          two_star: ratingDistribution?.two_star || 0,
          one_star: ratingDistribution?.one_star || 0,
          avg_rating: (ratingDistribution?.avg_rating || 0).toFixed(1),
        },
        fraud_risk: {
          score: fraudRisk.fraud_risk_score,
          reasons: fraudRisk.reasons,
          review_spike: fraudRisk.review_spike,
          rating_anomaly: fraudRisk.rating_anomaly,
        },
        ai_summary: {
          people_love: summary.people_love,
          people_dislike: summary.people_dislike,
          summary_snippet: summary.summary_snippet,
        },
        recent_reviews: recentReviews || [],
        pending_reports: pendingReports?.count || 0,
      };
    } catch (error) {
      ctx.logger.error('Dashboard fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Dashboard fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'business_update_metrics',
    description: 'Update business metrics (trust score, fraud risk, review count)',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
    }),
  })
  async updateMetrics(input: { business_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Updating business metrics', { business_id: input.business_id });

    try {
      // Calculate average trust score
      const trustStats = await this.db.queryOne<any>(
        `SELECT AVG(trust_score) as avg_trust_score, COUNT(*) as review_count FROM reviews WHERE business_id = $1`,
        [input.business_id]
      );

      // Calculate fraud risk
      const fraudRisk = await this.trustEngine.computeBusinessFraudRisk(input.business_id);

      // Update business
      await this.db.query(
        `UPDATE businesses SET trust_score_avg = $1, fraud_risk_score = $2, review_count = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [
          trustStats?.avg_trust_score || 0,
          fraudRisk.fraud_risk_score,
          trustStats?.review_count || 0,
          input.business_id,
        ]
      );

      ctx.logger.info('Business metrics updated', {
        business_id: input.business_id,
        avg_trust_score: trustStats?.avg_trust_score,
        fraud_risk_score: fraudRisk.fraud_risk_score,
      });

      return {
        success: true,
        business_id: input.business_id,
        metrics: {
          avg_trust_score: (trustStats?.avg_trust_score || 0).toFixed(1),
          fraud_risk_score: fraudRisk.fraud_risk_score,
          review_count: trustStats?.review_count || 0,
        },
      };
    } catch (error) {
      ctx.logger.error('Update metrics failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Update metrics failed',
        code: 'UPDATE_ERROR',
      };
    }
  }

  @Tool({
    name: 'business_search',
    description: 'Search for businesses by name',
    inputSchema: z.object({
      query: z.string().min(1).describe('Search query'),
      limit: z.number().int().min(1).max(50).default(20).describe('Number of results'),
    }),
  })
  async searchBusinesses(
    input: {
      query: string;
      limit?: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Searching businesses', { query: input.query });

    try {
      const businesses = await this.db.queryAll<any>(
        `SELECT id, name, description, trust_score_avg, review_count FROM businesses
         WHERE name ILIKE $1 OR description ILIKE $1
         ORDER BY review_count DESC
         LIMIT $2`,
        [`%${input.query}%`, input.limit || 20]
      );

      return {
        success: true,
        query: input.query,
        results: businesses || [],
        total: businesses?.length || 0,
      };
    } catch (error) {
      ctx.logger.error('Business search failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Business search failed',
        code: 'SEARCH_ERROR',
      };
    }
  }
}
