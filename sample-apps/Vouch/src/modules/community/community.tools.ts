import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../lib/database.service.js';

/**
 * Community Tools
 * Handles community reactions, reports, and moderation queue.
 */
@Injectable({ deps: [DatabaseService] })
export class CommunityTools {
  constructor(private db: DatabaseService) {}

  @Tool({
    name: 'community_add_reaction',
    description: 'Add a reaction to a review (helpful, agree, disagree, report)',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
      user_id: z.string().uuid().describe('User ID (reactor)'),
      reaction_type: z.enum(['helpful', 'agree', 'disagree', 'report']).describe('Reaction type'),
    }),
  })
  async addReaction(
    input: {
      review_id: string;
      user_id: string;
      reaction_type: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Adding reaction', {
      review_id: input.review_id,
      user_id: input.user_id,
      reaction_type: input.reaction_type,
    });

    try {
      // Check if reaction already exists
      const existing = await this.db.queryOne<any>(
        `SELECT id FROM community_reactions WHERE review_id = $1 AND user_id = $2 AND reaction_type = $3`,
        [input.review_id, input.user_id, input.reaction_type]
      );

      if (existing) {
        return {
          success: false,
          error: 'Reaction already exists',
          code: 'DUPLICATE_REACTION',
        };
      }

      // Add reaction
      const reaction = await this.db.queryOne<any>(
        `INSERT INTO community_reactions (review_id, user_id, reaction_type)
         VALUES ($1, $2, $3)
         RETURNING id, review_id, user_id, reaction_type, created_at`,
        [input.review_id, input.user_id, input.reaction_type]
      );

      // Update reviewer metrics
      const metricMap: Record<string, string> = {
        helpful: 'helpful',
        agree: 'agree',
        disagree: 'disagree',
        report: 'report',
      };

      const metric = metricMap[input.reaction_type];
      if (metric) {
        await this.db.query(
          `UPDATE reviewer_reputation SET total_${metric}_count = total_${metric}_count + 1 WHERE user_id = (SELECT user_id FROM reviews WHERE id = $1)`,
          [input.review_id]
        );
      }

      ctx.logger.info('Reaction added', { reaction_id: reaction?.id });

      return {
        success: true,
        reaction: reaction,
      };
    } catch (error) {
      ctx.logger.error('Add reaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Add reaction failed',
        code: 'ADD_ERROR',
      };
    }
  }

  @Tool({
    name: 'community_remove_reaction',
    description: 'Remove a reaction from a review',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
      user_id: z.string().uuid().describe('User ID (reactor)'),
      reaction_type: z.enum(['helpful', 'agree', 'disagree', 'report']).describe('Reaction type'),
    }),
  })
  async removeReaction(
    input: {
      review_id: string;
      user_id: string;
      reaction_type: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Removing reaction', {
      review_id: input.review_id,
      user_id: input.user_id,
      reaction_type: input.reaction_type,
    });

    try {
      await this.db.query(
        `DELETE FROM community_reactions WHERE review_id = $1 AND user_id = $2 AND reaction_type = $3`,
        [input.review_id, input.user_id, input.reaction_type]
      );

      // Update reviewer metrics
      const metricMap: Record<string, string> = {
        helpful: 'helpful',
        agree: 'agree',
        disagree: 'disagree',
        report: 'report',
      };

      const metric = metricMap[input.reaction_type];
      if (metric) {
        await this.db.query(
          `UPDATE reviewer_reputation SET total_${metric}_count = GREATEST(0, total_${metric}_count - 1) WHERE user_id = (SELECT user_id FROM reviews WHERE id = $1)`,
          [input.review_id]
        );
      }

      ctx.logger.info('Reaction removed');

      return {
        success: true,
        message: 'Reaction removed',
      };
    } catch (error) {
      ctx.logger.error('Remove reaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Remove reaction failed',
        code: 'REMOVE_ERROR',
      };
    }
  }

  @Tool({
    name: 'community_get_reactions',
    description: 'Get all reactions for a review',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  async getReactions(input: { review_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching reactions', { review_id: input.review_id });

    try {
      const reactions = await this.db.queryAll<any>(
        `SELECT reaction_type, COUNT(*) as count FROM community_reactions WHERE review_id = $1 GROUP BY reaction_type`,
        [input.review_id]
      );

      const summary = {
        helpful: 0,
        agree: 0,
        disagree: 0,
        report: 0,
      };

      reactions?.forEach((r: any) => {
        summary[r.reaction_type as keyof typeof summary] = r.count;
      });

      return {
        success: true,
        review_id: input.review_id,
        reactions: summary,
        total: Object.values(summary).reduce((a, b) => a + b, 0),
      };
    } catch (error) {
      ctx.logger.error('Get reactions failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Get reactions failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'community_file_report',
    description: 'File a report on a review',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
      reporter_user_id: z.string().uuid().describe('User ID (reporter)'),
      reason: z.enum(['fake', 'misleading', 'spam', 'offensive', 'other']).describe('Report reason'),
      description: z.string().optional().describe('Detailed description'),
    }),
  })
  async fileReport(
    input: {
      review_id: string;
      reporter_user_id: string;
      reason: string;
      description?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Filing report', {
      review_id: input.review_id,
      reporter_user_id: input.reporter_user_id,
      reason: input.reason,
    });

    try {
      // Check if report already exists
      const existing = await this.db.queryOne<any>(
        `SELECT id FROM community_reports WHERE review_id = $1 AND reporter_user_id = $2 AND status = 'pending'`,
        [input.review_id, input.reporter_user_id]
      );

      if (existing) {
        return {
          success: false,
          error: 'Report already filed',
          code: 'DUPLICATE_REPORT',
        };
      }

      // File report
      const report = await this.db.queryOne<any>(
        `INSERT INTO community_reports (review_id, reporter_user_id, reason, description, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, review_id, reporter_user_id, reason, status, created_at`,
        [input.review_id, input.reporter_user_id, input.reason, input.description || null]
      );

      ctx.logger.info('Report filed', { report_id: report?.id });

      return {
        success: true,
        report: report,
      };
    } catch (error) {
      ctx.logger.error('File report failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'File report failed',
        code: 'FILE_ERROR',
      };
    }
  }

  @Tool({
    name: 'community_get_reports_queue',
    description: 'Get pending reports for moderation',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe('Number of reports to return'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
      status: z.enum(['pending', 'upheld', 'dismissed', 'escalated']).default('pending').describe('Report status'),
    }),
  })
  async getReportsQueue(
    input: {
      limit?: number;
      offset?: number;
      status?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Fetching reports queue', {
      limit: input.limit,
      offset: input.offset,
      status: input.status,
    });

    try {
      const reports = await this.db.queryAll<any>(
        `SELECT id, review_id, reporter_user_id, reason, description, status, created_at
         FROM community_reports
         WHERE status = $1
         ORDER BY created_at ASC
         LIMIT $2 OFFSET $3`,
        [input.status || 'pending', input.limit || 20, input.offset || 0]
      );

      const countResult = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM community_reports WHERE status = $1`,
        [input.status || 'pending']
      );

      return {
        success: true,
        reports: reports || [],
        total: countResult?.count || 0,
        limit: input.limit || 20,
        offset: input.offset || 0,
      };
    } catch (error) {
      ctx.logger.error('Get reports queue failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Get reports queue failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'community_resolve_report',
    description: 'Resolve a report (moderator action)',
    inputSchema: z.object({
      report_id: z.string().uuid().describe('Report ID'),
      moderator_user_id: z.string().uuid().describe('Moderator User ID'),
      decision: z.enum(['upheld', 'dismissed', 'escalated']).describe('Moderator decision'),
      moderator_notes: z.string().optional().describe('Moderator notes'),
    }),
  })
  async resolveReport(
    input: {
      report_id: string;
      moderator_user_id: string;
      decision: string;
      moderator_notes?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Resolving report', {
      report_id: input.report_id,
      moderator_user_id: input.moderator_user_id,
      decision: input.decision,
    });

    try {
      const report = await this.db.queryOne<any>(
        `UPDATE community_reports
         SET status = $1, moderator_user_id = $2, moderator_decision = $3, resolved_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, review_id, status, resolved_at`,
        [input.decision, input.moderator_user_id, input.moderator_notes || null, input.report_id]
      );

      // If upheld, mark review as flagged
      if (input.decision === 'upheld' && report?.review_id) {
        await this.db.query(
          `UPDATE reviews SET verification_status = 'flagged' WHERE id = $1`,
          [report.review_id]
        );
      }

      ctx.logger.info('Report resolved', {
        report_id: input.report_id,
        decision: input.decision,
      });

      return {
        success: true,
        report: report,
      };
    } catch (error) {
      ctx.logger.error('Resolve report failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Resolve report failed',
        code: 'RESOLVE_ERROR',
      };
    }
  }
}
