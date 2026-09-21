import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../lib/database.service.js';

/**
 * Reputation Tools
 * Manages reviewer reputation, badges, and tier progression.
 */
@Injectable({ deps: [DatabaseService] })
export class ReputationTools {
  constructor(private db: DatabaseService) {}

  @Tool({
    name: 'reputation_get_profile',
    description: 'Get reputation profile for a reviewer',
    inputSchema: z.object({
      user_id: z.string().uuid().describe('User ID'),
    }),
  })
  @Widget('reputation-card')
  async getProfile(input: { user_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching reputation profile', { user_id: input.user_id });

    try {
      const reputation = await this.db.queryOne<any>(
        `SELECT user_id, reputation_points, badge_tier, total_reviews, total_helpful_count, total_agree_count, total_disagree_count, total_reports_received, created_at, updated_at
         FROM reviewer_reputation
         WHERE user_id = $1`,
        [input.user_id]
      );

      if (!reputation) {
        // Create default reputation if not exists
        await this.db.query(
          `INSERT INTO reviewer_reputation (user_id, reputation_points, badge_tier)
           VALUES ($1, 0, 'new_reviewer')
           ON CONFLICT (user_id) DO NOTHING`,
          [input.user_id]
        );

        return {
          success: true,
          user_id: input.user_id,
          reputation_points: 0,
          badge_tier: 'new_reviewer',
          total_reviews: 0,
          total_helpful_count: 0,
          total_agree_count: 0,
          total_disagree_count: 0,
          total_reports_received: 0,
        };
      }

      // Fetch badges
      const badges = await this.db.queryAll<any>(
        `SELECT id, badge_name, badge_description, badge_icon_url, earned_at, reason
         FROM badges
         WHERE user_id = $1
         ORDER BY earned_at DESC`,
        [input.user_id]
      );

      return {
        success: true,
        user_id: input.user_id,
        reputation_points: reputation.reputation_points,
        badge_tier: reputation.badge_tier,
        total_reviews: reputation.total_reviews,
        total_helpful_count: reputation.total_helpful_count,
        total_agree_count: reputation.total_agree_count,
        total_disagree_count: reputation.total_disagree_count,
        total_reports_received: reputation.total_reports_received,
        badges: badges || [],
      };
    } catch (error) {
      ctx.logger.error('Reputation profile fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Reputation profile fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'reputation_add_points',
    description: 'Add reputation points to a reviewer',
    inputSchema: z.object({
      user_id: z.string().uuid().describe('User ID'),
      points: z.number().int().min(1).describe('Points to add'),
      reason: z.string().describe('Reason for points (e.g., "review_submitted", "evidence_attached")'),
    }),
  })
  async addPoints(
    input: {
      user_id: string;
      points: number;
      reason: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Adding reputation points', {
      user_id: input.user_id,
      points: input.points,
      reason: input.reason,
    });

    try {
      // Ensure reputation record exists
      await this.db.query(
        `INSERT INTO reviewer_reputation (user_id, reputation_points, badge_tier)
         VALUES ($1, $2, 'new_reviewer')
         ON CONFLICT (user_id) DO UPDATE SET reputation_points = reputation_points + $2`,
        [input.user_id, input.points]
      );

      // Check for tier upgrade
      const reputation = await this.db.queryOne<any>(
        `SELECT reputation_points, badge_tier FROM reviewer_reputation WHERE user_id = $1`,
        [input.user_id]
      );

      let newTier = reputation?.badge_tier || 'new_reviewer';
      const tierThresholds: Record<string, number> = {
        new_reviewer: 0,
        verified_reviewer: 50,
        trusted_reviewer: 150,
        expert_reviewer: 300,
        community_guardian: 500,
        truth_keeper: 1000,
      };

      const currentPoints = reputation?.reputation_points || 0;
      for (const [tier, threshold] of Object.entries(tierThresholds)) {
        if (currentPoints >= threshold) {
          newTier = tier;
        }
      }

      // Update tier if changed
      if (newTier !== reputation?.badge_tier) {
        await this.db.query(
          `UPDATE reviewer_reputation SET badge_tier = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
          [newTier, input.user_id]
        );

        ctx.logger.info('Tier upgraded', {
          user_id: input.user_id,
          old_tier: reputation?.badge_tier,
          new_tier: newTier,
        });
      }

      return {
        success: true,
        user_id: input.user_id,
        points_added: input.points,
        new_total_points: currentPoints + input.points,
        tier: newTier,
        tier_upgraded: newTier !== reputation?.badge_tier,
      };
    } catch (error) {
      ctx.logger.error('Add reputation points failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Add reputation points failed',
        code: 'ADD_ERROR',
      };
    }
  }

  @Tool({
    name: 'reputation_award_badge',
    description: 'Award a badge to a reviewer',
    inputSchema: z.object({
      user_id: z.string().uuid().describe('User ID'),
      badge_name: z.string().describe('Badge name'),
      badge_description: z.string().describe('Badge description'),
      reason: z.string().describe('Reason for awarding badge'),
      badge_icon_url: z.string().url().optional().describe('Badge icon URL'),
    }),
  })
  async awardBadge(
    input: {
      user_id: string;
      badge_name: string;
      badge_description: string;
      reason: string;
      badge_icon_url?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Awarding badge', {
      user_id: input.user_id,
      badge_name: input.badge_name,
    });

    try {
      const badge = await this.db.queryOne<any>(
        `INSERT INTO badges (user_id, badge_name, badge_description, badge_icon_url, reason)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, badge_name, badge_description, earned_at`,
        [input.user_id, input.badge_name, input.badge_description, input.badge_icon_url || null, input.reason]
      );

      ctx.logger.info('Badge awarded', {
        user_id: input.user_id,
        badge_id: badge?.id,
      });

      return {
        success: true,
        user_id: input.user_id,
        badge: badge,
      };
    } catch (error) {
      ctx.logger.error('Award badge failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Award badge failed',
        code: 'AWARD_ERROR',
      };
    }
  }

  @Tool({
    name: 'reputation_leaderboard',
    description: 'Get top reviewers by reputation',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('Number of reviewers to return'),
      tier: z.enum(['new_reviewer', 'verified_reviewer', 'trusted_reviewer', 'expert_reviewer', 'community_guardian', 'truth_keeper']).optional().describe('Filter by tier'),
    }),
  })
  async leaderboard(
    input: {
      limit?: number;
      tier?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Fetching leaderboard', { limit: input.limit, tier: input.tier });

    try {
      let query = `SELECT user_id, reputation_points, badge_tier, total_reviews FROM reviewer_reputation`;
      const params: any[] = [];

      if (input.tier) {
        query += ` WHERE badge_tier = $1`;
        params.push(input.tier);
      }

      query += ` ORDER BY reputation_points DESC LIMIT $${params.length + 1}`;
      params.push(input.limit || 20);

      const leaderboard = await this.db.queryAll<any>(query, params);

      return {
        success: true,
        leaderboard: leaderboard || [],
        limit: input.limit || 20,
      };
    } catch (error) {
      ctx.logger.error('Leaderboard fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Leaderboard fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'reputation_update_metrics',
    description: 'Update reviewer metrics (helpful count, agree count, etc.)',
    inputSchema: z.object({
      user_id: z.string().uuid().describe('User ID'),
      metric: z.enum(['helpful', 'agree', 'disagree', 'report']).describe('Metric to update'),
      delta: z.number().int().describe('Change amount (positive or negative)'),
    }),
  })
  async updateMetrics(
    input: {
      user_id: string;
      metric: string;
      delta: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Updating reputation metrics', {
      user_id: input.user_id,
      metric: input.metric,
      delta: input.delta,
    });

    try {
      const metricMap: Record<string, string> = {
        helpful: 'total_helpful_count',
        agree: 'total_agree_count',
        disagree: 'total_disagree_count',
        report: 'total_reports_received',
      };

      const column = metricMap[input.metric];
      if (!column) {
        return {
          success: false,
          error: 'Invalid metric',
          code: 'INVALID_METRIC',
        };
      }

      await this.db.query(
        `UPDATE reviewer_reputation SET ${column} = ${column} + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [input.delta, input.user_id]
      );

      return {
        success: true,
        user_id: input.user_id,
        metric: input.metric,
        delta: input.delta,
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
}
