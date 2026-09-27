import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../lib/database.service.js';

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  text: string;
  trust_score: number;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Reviews Tools
 * Handles review CRUD, submission, and evidence attachment.
 */
@Injectable({ deps: [DatabaseService] })
export class ReviewsTools {
  constructor(private db: DatabaseService) {}

  @Tool({
    name: 'reviews_submit',
    description: 'Submit a new review for a business',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
      user_id: z.string().uuid().describe('User ID (reviewer)'),
      rating: z.number().int().min(1).max(5).describe('Rating (1-5 stars)'),
      text: z.string().min(10).describe('Review text (minimum 10 characters)'),
      evidence_urls: z.array(z.string().url()).optional().describe('Optional evidence file URLs'),
    }),
  })
  @Widget('review-card')
  async submitReview(
    input: {
      business_id: string;
      user_id: string;
      rating: number;
      text: string;
      evidence_urls?: string[];
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Review submission', {
      business_id: input.business_id,
      user_id: input.user_id,
      rating: input.rating,
    });

    try {
      // Insert review
      const review = await this.db.queryOne<Review>(
        `INSERT INTO reviews (business_id, user_id, rating, text, verification_status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, business_id, user_id, rating, text, trust_score, verification_status, created_at, updated_at`,
        [input.business_id, input.user_id, input.rating, input.text, 'unverified']
      );

      if (!review) {
        throw new Error('Failed to create review');
      }

      // Attach evidence if provided
      if (input.evidence_urls && input.evidence_urls.length > 0) {
        for (const url of input.evidence_urls) {
          await this.db.query(
            `INSERT INTO evidence (review_id, file_url, file_type)
             VALUES ($1, $2, $3)`,
            [review.id, url, 'photo'] // Default to 'photo'; can be refined
          );
        }

        // Mark as verified if evidence attached
        await this.db.query(
          `UPDATE reviews SET verification_status = $1 WHERE id = $2`,
          ['verified', review.id]
        );
      }

      ctx.logger.info('Review submitted', { review_id: review.id });

      return {
        success: true,
        review: {
          id: review.id,
          business_id: review.business_id,
          user_id: review.user_id,
          rating: review.rating,
          text: review.text,
          trust_score: review.trust_score,
          verification_status: review.verification_status,
          created_at: review.created_at,
        },
        message: 'Review submitted successfully',
      };
    } catch (error) {
      ctx.logger.error('Review submission failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Review submission failed',
        code: 'SUBMISSION_ERROR',
      };
    }
  }

  @Tool({
    name: 'reviews_get',
    description: 'Get a review by ID',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  async getReview(input: { review_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching review', { review_id: input.review_id });

    try {
      const review = await this.db.queryOne<Review>(
        `SELECT id, business_id, user_id, rating, text, trust_score, verification_status, created_at, updated_at
         FROM reviews
         WHERE id = $1`,
        [input.review_id]
      );

      if (!review) {
        return {
          success: false,
          error: 'Review not found',
          code: 'NOT_FOUND',
        };
      }

      // Fetch evidence
      const evidence = await this.db.queryAll<any>(
        `SELECT id, file_url, file_type, verified, created_at
         FROM evidence
         WHERE review_id = $1`,
        [input.review_id]
      );

      // Fetch trust score history
      const trustScores = await this.db.queryAll<any>(
        `SELECT score, reasons, computed_at
         FROM trust_scores
         WHERE review_id = $1
         ORDER BY computed_at DESC
         LIMIT 1`,
        [input.review_id]
      );

      return {
        success: true,
        review: {
          ...review,
          evidence: evidence || [],
          trust_score_history: trustScores || [],
        },
      };
    } catch (error) {
      ctx.logger.error('Review fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Review fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'reviews_list_by_business',
    description: 'List reviews for a business with pagination and filtering',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
      limit: z.number().int().min(1).max(100).default(20).describe('Number of reviews to return'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
      sort_by: z.enum(['recent', 'rating_high', 'rating_low', 'trust_score']).default('recent').describe('Sort order'),
    }),
  })
  async listByBusiness(
    input: {
      business_id: string;
      limit?: number;
      offset?: number;
      sort_by?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Listing reviews', {
      business_id: input.business_id,
      limit: input.limit,
      offset: input.offset,
    });

    try {
      let orderBy = 'created_at DESC';
      if (input.sort_by === 'rating_high') orderBy = 'rating DESC';
      else if (input.sort_by === 'rating_low') orderBy = 'rating ASC';
      else if (input.sort_by === 'trust_score') orderBy = 'trust_score DESC';

      const reviews = await this.db.queryAll<Review>(
        `SELECT id, business_id, user_id, rating, text, trust_score, verification_status, created_at, updated_at
         FROM reviews
         WHERE business_id = $1
         ORDER BY ${orderBy}
         LIMIT $2 OFFSET $3`,
        [input.business_id, input.limit || 20, input.offset || 0]
      );

      // Get total count
      const countResult = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM reviews WHERE business_id = $1`,
        [input.business_id]
      );

      return {
        success: true,
        reviews: reviews || [],
        total: countResult?.count || 0,
        limit: input.limit || 20,
        offset: input.offset || 0,
      };
    } catch (error) {
      ctx.logger.error('Review list failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Review list failed',
        code: 'LIST_ERROR',
      };
    }
  }

  @Tool({
    name: 'reviews_list_by_user',
    description: 'List reviews submitted by a user',
    inputSchema: z.object({
      user_id: z.string().uuid().describe('User ID'),
      limit: z.number().int().min(1).max(100).default(20).describe('Number of reviews to return'),
      offset: z.number().int().min(0).default(0).describe('Pagination offset'),
    }),
  })
  async listByUser(
    input: {
      user_id: string;
      limit?: number;
      offset?: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Listing user reviews', { user_id: input.user_id });

    try {
      const reviews = await this.db.queryAll<Review>(
        `SELECT id, business_id, user_id, rating, text, trust_score, verification_status, created_at, updated_at
         FROM reviews
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [input.user_id, input.limit || 20, input.offset || 0]
      );

      const countResult = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM reviews WHERE user_id = $1`,
        [input.user_id]
      );

      return {
        success: true,
        reviews: reviews || [],
        total: countResult?.count || 0,
        limit: input.limit || 20,
        offset: input.offset || 0,
      };
    } catch (error) {
      ctx.logger.error('User review list failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'User review list failed',
        code: 'LIST_ERROR',
      };
    }
  }

  @Tool({
    name: 'reviews_update',
    description: 'Update a review (text or rating)',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
      rating: z.number().int().min(1).max(5).optional().describe('New rating'),
      text: z.string().min(10).optional().describe('New review text'),
    }),
  })
  async updateReview(
    input: {
      review_id: string;
      rating?: number;
      text?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Updating review', { review_id: input.review_id });

    try {
      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.rating !== undefined) {
        updates.push(`rating = $${paramCount++}`);
        values.push(input.rating);
      }

      if (input.text !== undefined) {
        updates.push(`text = $${paramCount++}`);
        values.push(input.text);
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: 'No fields to update',
          code: 'NO_UPDATES',
        };
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(input.review_id);

      const updated = await this.db.queryOne<Review>(
        `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      ctx.logger.info('Review updated', { review_id: input.review_id });

      return {
        success: true,
        review: updated,
        message: 'Review updated successfully',
      };
    } catch (error) {
      ctx.logger.error('Review update failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Review update failed',
        code: 'UPDATE_ERROR',
      };
    }
  }

  @Tool({
    name: 'reviews_delete',
    description: 'Delete a review (soft delete)',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  async deleteReview(
    input: {
      review_id: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Deleting review', { review_id: input.review_id });

    try {
      // Soft delete by marking as removed
      await this.db.query(
        `UPDATE reviews SET verification_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        ['removed', input.review_id]
      );

      ctx.logger.info('Review deleted', { review_id: input.review_id });

      return {
        success: true,
        message: 'Review deleted successfully',
      };
    } catch (error) {
      ctx.logger.error('Review deletion failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Review deletion failed',
        code: 'DELETE_ERROR',
      };
    }
  }
}
