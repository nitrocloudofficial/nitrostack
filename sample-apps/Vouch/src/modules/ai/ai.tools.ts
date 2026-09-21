import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { AIAnalysisService } from '../../lib/ai-analysis.service.js';
import { DatabaseService } from '../../lib/database.service.js';

/**
 * AI Tools
 * Exposes AI analysis features: duplicate detection, sentiment analysis, spam detection, smart summaries.
 */
@Injectable({ deps: [AIAnalysisService, DatabaseService] })
export class AITools {
  constructor(
    private aiAnalysis: AIAnalysisService,
    private db: DatabaseService
  ) {}

  @Tool({
    name: 'ai_analyze_review',
    description: 'Analyze a review for AI signals (sentiment, duplicates, spam patterns)',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  async analyzeReview(input: { review_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing review', { review_id: input.review_id });

    try {
      const result = await this.aiAnalysis.analyzeReview(input.review_id);
      await this.aiAnalysis.saveAnalysis(input.review_id, result);

      ctx.logger.info('Review analyzed', {
        review_id: input.review_id,
        sentiment: result.sentiment,
        spam_score: result.spam_score,
      });

      return {
        success: true,
        review_id: input.review_id,
        sentiment: result.sentiment,
        sentiment_confidence: result.sentiment_confidence,
        similarity_score: result.similarity_score,
        duplicate_flags: result.duplicate_flags,
        spam_score: result.spam_score,
        fraud_patterns: result.fraud_patterns,
      };
    } catch (error) {
      ctx.logger.error('Review analysis failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Review analysis failed',
        code: 'ANALYSIS_ERROR',
      };
    }
  }

  @Tool({
    name: 'ai_get_analysis',
    description: 'Get AI analysis results for a review',
    inputSchema: z.object({
      review_id: z.string().uuid().describe('Review ID'),
    }),
  })
  async getAnalysis(input: { review_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching AI analysis', { review_id: input.review_id });

    try {
      const analysis = await this.db.queryOne<any>(
        `SELECT sentiment, sentiment_confidence, similarity_score, duplicate_flags, spam_score, fraud_patterns, created_at, updated_at
         FROM ai_analysis
         WHERE review_id = $1`,
        [input.review_id]
      );

      if (!analysis) {
        return {
          success: false,
          error: 'Analysis not found',
          code: 'NOT_FOUND',
        };
      }

      return {
        success: true,
        review_id: input.review_id,
        sentiment: analysis.sentiment,
        sentiment_confidence: analysis.sentiment_confidence,
        similarity_score: analysis.similarity_score,
        duplicate_flags: JSON.parse(analysis.duplicate_flags || '[]'),
        spam_score: analysis.spam_score,
        fraud_patterns: JSON.parse(analysis.fraud_patterns || '{}'),
        created_at: analysis.created_at,
        updated_at: analysis.updated_at,
      };
    } catch (error) {
      ctx.logger.error('Get analysis failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Get analysis failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'ai_business_summary',
    description: 'Generate smart summary for a business (people love / people dislike)',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
    }),
  })
  @Widget('ai-risk-report')
  async businessSummary(input: { business_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating business summary', { business_id: input.business_id });

    try {
      const summary = await this.aiAnalysis.generateBusinessSummary(input.business_id);

      ctx.logger.info('Business summary generated', {
        business_id: input.business_id,
        themes_count: (summary.people_love.length + summary.people_dislike.length),
      });

      return {
        success: true,
        business_id: input.business_id,
        people_love: summary.people_love,
        people_dislike: summary.people_dislike,
        summary_snippet: summary.summary_snippet,
      };
    } catch (error) {
      ctx.logger.error('Business summary generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Business summary generation failed',
        code: 'SUMMARY_ERROR',
      };
    }
  }

  @Tool({
    name: 'ai_detect_duplicates',
    description: 'Detect duplicate or similar reviews for a business',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
      similarity_threshold: z.number().min(0).max(1).default(0.85).describe('Similarity threshold (0-1)'),
      limit: z.number().int().min(1).max(50).default(10).describe('Number of duplicate groups to return'),
    }),
  })
  async detectDuplicates(
    input: {
      business_id: string;
      similarity_threshold?: number;
      limit?: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Detecting duplicates', {
      business_id: input.business_id,
      threshold: input.similarity_threshold,
    });

    try {
      // Fetch all reviews for business with AI analysis
      const reviews = await this.db.queryAll<any>(
        `SELECT r.id, r.text, a.duplicate_flags, a.similarity_score
         FROM reviews r
         LEFT JOIN ai_analysis a ON r.id = a.review_id
         WHERE r.business_id = $1
         ORDER BY r.created_at DESC`,
        [input.business_id]
      );

      if (!reviews || reviews.length === 0) {
        return {
          success: true,
          business_id: input.business_id,
          duplicate_groups: [],
        };
      }

      // Group duplicates
      const duplicateGroups: any[] = [];
      const processed = new Set<string>();

      for (const review of reviews) {
        if (processed.has(review.id)) continue;

        const duplicateFlags = JSON.parse(review.duplicate_flags || '[]');
        if (duplicateFlags.length > 0 && review.similarity_score >= (input.similarity_threshold || 0.85)) {
          const group = [review.id, ...duplicateFlags];
          duplicateGroups.push({
            primary_review_id: review.id,
            duplicate_review_ids: duplicateFlags,
            similarity_score: review.similarity_score,
          });

          group.forEach((id: string) => processed.add(id));
        }
      }

      return {
        success: true,
        business_id: input.business_id,
        duplicate_groups: duplicateGroups.slice(0, input.limit || 10),
        total_groups: duplicateGroups.length,
      };
    } catch (error) {
      ctx.logger.error('Duplicate detection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Duplicate detection failed',
        code: 'DETECTION_ERROR',
      };
    }
  }

  @Tool({
    name: 'ai_sentiment_distribution',
    description: 'Get sentiment distribution for a business',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
    }),
  })
  async sentimentDistribution(input: { business_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching sentiment distribution', { business_id: input.business_id });

    try {
      const distribution = await this.db.queryOne<any>(
        `SELECT 
          COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive,
          COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral,
          COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative,
          COUNT(*) as total
         FROM ai_analysis a
         JOIN reviews r ON a.review_id = r.id
         WHERE r.business_id = $1`,
        [input.business_id]
      );

      const total = distribution?.total || 0;

      return {
        success: true,
        business_id: input.business_id,
        sentiment_distribution: {
          positive: distribution?.positive || 0,
          neutral: distribution?.neutral || 0,
          negative: distribution?.negative || 0,
        },
        percentages: {
          positive: total > 0 ? ((distribution?.positive || 0) / total * 100).toFixed(1) : 0,
          neutral: total > 0 ? ((distribution?.neutral || 0) / total * 100).toFixed(1) : 0,
          negative: total > 0 ? ((distribution?.negative || 0) / total * 100).toFixed(1) : 0,
        },
        total_analyzed: total,
      };
    } catch (error) {
      ctx.logger.error('Sentiment distribution fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Sentiment distribution fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }

  @Tool({
    name: 'ai_spam_risk_reviews',
    description: 'Get reviews flagged as high spam risk',
    inputSchema: z.object({
      business_id: z.string().uuid().describe('Business ID'),
      spam_threshold: z.number().min(0).max(100).default(50).describe('Spam score threshold'),
      limit: z.number().int().min(1).max(50).default(10).describe('Number of reviews to return'),
    }),
  })
  async spamRiskReviews(
    input: {
      business_id: string;
      spam_threshold?: number;
      limit?: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Fetching spam risk reviews', {
      business_id: input.business_id,
      threshold: input.spam_threshold,
    });

    try {
      const reviews = await this.db.queryAll<any>(
        `SELECT r.id, r.user_id, r.rating, r.text, a.spam_score, a.fraud_patterns
         FROM reviews r
         LEFT JOIN ai_analysis a ON r.id = a.review_id
         WHERE r.business_id = $1 AND a.spam_score >= $2
         ORDER BY a.spam_score DESC
         LIMIT $3`,
        [input.business_id, input.spam_threshold || 50, input.limit || 10]
      );

      return {
        success: true,
        business_id: input.business_id,
        spam_risk_reviews: (reviews || []).map((r: any) => ({
          review_id: r.id,
          user_id: r.user_id,
          rating: r.rating,
          text: r.text.substring(0, 100) + '...',
          spam_score: r.spam_score,
          fraud_patterns: JSON.parse(r.fraud_patterns || '{}'),
        })),
        total: reviews?.length || 0,
      };
    } catch (error) {
      ctx.logger.error('Spam risk reviews fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Spam risk reviews fetch failed',
        code: 'FETCH_ERROR',
      };
    }
  }
}
