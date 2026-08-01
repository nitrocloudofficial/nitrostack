import { Injectable, ConfigService } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';

export interface AIAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_confidence: number;
  similarity_score: number;
  duplicate_flags: string[];
  spam_score: number;
  fraud_patterns: Record<string, any>;
}

/**
 * AI Analysis Service
 * Handles duplicate detection, sentiment analysis, and spam/fraud pattern detection.
 * For MVP, uses heuristics and text similarity; LLM integration is Future Scope.
 */
@Injectable({ deps: [DatabaseService, ConfigService] })
export class AIAnalysisService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService
  ) {}

  /**
   * Analyze a review for AI signals
   */
  async analyzeReview(reviewId: string): Promise<AIAnalysisResult> {
    // Fetch review
    const review = await this.db.queryOne<any>(
      `SELECT id, business_id, user_id, rating, text, created_at FROM reviews WHERE id = $1`,
      [reviewId]
    );

    if (!review) {
      throw new Error('Review not found');
    }

    // ========== SENTIMENT ANALYSIS (heuristic) ==========
    const sentiment = this.analyzeSentiment(review.text, review.rating);

    // ========== DUPLICATE DETECTION (text similarity) ==========
    const { similarity_score, duplicate_flags } = await this.detectDuplicates(
      review.business_id,
      review.text,
      reviewId
    );

    // ========== SPAM/FRAUD PATTERN DETECTION ==========
    const { spam_score, fraud_patterns } = await this.detectSpamPatterns(
      review.user_id,
      review.business_id,
      review.text
    );

    return {
      sentiment: sentiment.sentiment,
      sentiment_confidence: sentiment.confidence,
      similarity_score,
      duplicate_flags,
      spam_score,
      fraud_patterns,
    };
  }

  /**
   * Analyze sentiment of review text (heuristic)
   */
  private analyzeSentiment(
    text: string,
    rating: number
  ): { sentiment: 'positive' | 'neutral' | 'negative'; confidence: number } {
    const lowerText = text.toLowerCase();

    // Positive keywords
    const positiveKeywords = [
      'excellent',
      'amazing',
      'great',
      'wonderful',
      'fantastic',
      'love',
      'perfect',
      'best',
      'awesome',
      'highly recommend',
      'impressed',
      'satisfied',
      'happy',
    ];

    // Negative keywords
    const negativeKeywords = [
      'terrible',
      'awful',
      'horrible',
      'bad',
      'worst',
      'hate',
      'disappointed',
      'poor',
      'waste',
      'never again',
      'avoid',
      'disgusted',
      'angry',
    ];

    const positiveCount = positiveKeywords.filter((kw) => lowerText.includes(kw)).length;
    const negativeCount = negativeKeywords.filter((kw) => lowerText.includes(kw)).length;

    // Determine sentiment based on keywords and rating
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let confidence = 0.5;

    if (rating >= 4) {
      sentiment = 'positive';
      confidence = 0.7 + positiveCount * 0.05;
    } else if (rating <= 2) {
      sentiment = 'negative';
      confidence = 0.7 + negativeCount * 0.05;
    } else {
      if (positiveCount > negativeCount) {
        sentiment = 'positive';
        confidence = 0.5 + positiveCount * 0.05;
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        confidence = 0.5 + negativeCount * 0.05;
      }
    }

    return {
      sentiment,
      confidence: Math.min(1, confidence),
    };
  }

  /**
   * Detect duplicate/similar reviews using simple text similarity
   */
  private async detectDuplicates(
    businessId: string,
    text: string,
    reviewId: string
  ): Promise<{ similarity_score: number; duplicate_flags: string[] }> {
    // Fetch other reviews for this business
    const otherReviews = await this.db.queryAll<any>(
      `SELECT id, text FROM reviews WHERE business_id = $1 AND id != $2 ORDER BY created_at DESC LIMIT 50`,
      [businessId, reviewId]
    );

    if (!otherReviews || otherReviews.length === 0) {
      return { similarity_score: 0, duplicate_flags: [] };
    }

    // Calculate similarity with each review
    const similarities = otherReviews.map((other: any) => ({
      review_id: other.id,
      similarity: this.calculateTextSimilarity(text, other.text),
    }));

    // Find max similarity
    const maxSimilarity = Math.max(...similarities.map((s) => s.similarity), 0);

    // Flag duplicates (similarity > 0.85)
    const duplicateFlags = similarities
      .filter((s) => s.similarity > 0.85)
      .map((s) => s.review_id);

    return {
      similarity_score: maxSimilarity,
      duplicate_flags: duplicateFlags,
    };
  }

  /**
   * Simple text similarity using Jaccard index (word-level)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .sort();

    const words1 = new Set(normalize(text1));
    const words2 = new Set(normalize(text2));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Detect spam and fraud patterns
   */
  private async detectSpamPatterns(
    userId: string,
    businessId: string,
    text: string
  ): Promise<{ spam_score: number; fraud_patterns: Record<string, any> }> {
    let spamScore = 0;
    const fraudPatterns: Record<string, any> = {};

    // Pattern 1: Rapid submission (more than 3 reviews in 1 hour)
    const recentCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM reviews WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    if ((recentCount?.count || 0) > 3) {
      spamScore += 20;
      fraudPatterns.rapid_submission = {
        count: recentCount?.count,
        threshold: 3,
      };
    }

    // Pattern 2: All 5-star or all 1-star reviews (extreme bias)
    const ratingDistribution = await this.db.queryOne<any>(
      `SELECT COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
              COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
              COUNT(*) as total
       FROM reviews WHERE user_id = $1`,
      [userId]
    );

    if (ratingDistribution?.total >= 5) {
      const fiveStarRatio = ratingDistribution.five_star / ratingDistribution.total;
      const oneStarRatio = ratingDistribution.one_star / ratingDistribution.total;

      if (fiveStarRatio > 0.8 || oneStarRatio > 0.8) {
        spamScore += 15;
        fraudPatterns.extreme_rating_bias = {
          five_star_ratio: fiveStarRatio,
          one_star_ratio: oneStarRatio,
        };
      }
    }

    // Pattern 3: Templated/generic text (very short or repetitive)
    if (text.length < 20) {
      spamScore += 10;
      fraudPatterns.generic_text = {
        length: text.length,
        threshold: 20,
      };
    }

    // Pattern 4: Multiple reviews for same business in short time
    const businessRecentCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM reviews WHERE user_id = $1 AND business_id = $2 AND created_at > NOW() - INTERVAL '7 days'`,
      [userId, businessId]
    );

    if ((businessRecentCount?.count || 0) > 2) {
      spamScore += 10;
      fraudPatterns.multiple_reviews_same_business = {
        count: businessRecentCount?.count,
        threshold: 2,
      };
    }

    // Clamp spam score to 0-100
    spamScore = Math.max(0, Math.min(100, spamScore));

    return {
      spam_score: spamScore,
      fraud_patterns: fraudPatterns,
    };
  }

  /**
   * Save AI analysis to database
   */
  async saveAnalysis(reviewId: string, result: AIAnalysisResult): Promise<void> {
    await this.db.query(
      `INSERT INTO ai_analysis (review_id, sentiment, sentiment_confidence, similarity_score, duplicate_flags, spam_score, fraud_patterns)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (review_id) DO UPDATE SET
         sentiment = $2,
         sentiment_confidence = $3,
         similarity_score = $4,
         duplicate_flags = $5,
         spam_score = $6,
         fraud_patterns = $7,
         updated_at = CURRENT_TIMESTAMP`,
      [
        reviewId,
        result.sentiment,
        result.sentiment_confidence,
        result.similarity_score,
        JSON.stringify(result.duplicate_flags),
        result.spam_score,
        JSON.stringify(result.fraud_patterns),
      ]
    );
  }

  /**
   * Generate smart summary for a business (aggregate reviews)
   * For MVP, uses simple aggregation; LLM-based summary is Future Scope
   */
  async generateBusinessSummary(businessId: string): Promise<{
    people_love: string[];
    people_dislike: string[];
    summary_snippet: string;
  }> {
    // Fetch recent high-trust reviews
    const reviews = await this.db.queryAll<any>(
      `SELECT r.text, r.rating, a.sentiment
       FROM reviews r
       LEFT JOIN ai_analysis a ON r.id = a.review_id
       WHERE r.business_id = $1 AND r.trust_score >= 50
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [businessId]
    );

    if (!reviews || reviews.length === 0) {
      return {
        people_love: [],
        people_dislike: [],
        summary_snippet: 'No reviews yet.',
      };
    }

    // Extract positive and negative themes
    const positiveReviews = reviews.filter((r: any) => r.rating >= 4 || r.sentiment === 'positive');
    const negativeReviews = reviews.filter((r: any) => r.rating <= 2 || r.sentiment === 'negative');

    // Extract common words from positive reviews
    const peopleLovedThemes = this.extractThemes(
      positiveReviews.map((r: any) => r.text).join(' ')
    );

    // Extract common words from negative reviews
    const peopleDislikedThemes = this.extractThemes(
      negativeReviews.map((r: any) => r.text).join(' ')
    );

    // Generate snippet
    const avgRating = (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1);
    const summarySnippet = `Average rating: ${avgRating}/5 from ${reviews.length} reviews. ${positiveReviews.length} positive, ${negativeReviews.length} negative.`;

    return {
      people_love: peopleLovedThemes,
      people_dislike: peopleDislikedThemes,
      summary_snippet: summarySnippet,
    };
  }

  /**
   * Extract common themes from text
   */
  private extractThemes(text: string): string[] {
    const themes: Record<string, number> = {};

    // Common theme keywords
    const themeKeywords: Record<string, string[]> = {
      'Great service': ['service', 'staff', 'friendly', 'helpful', 'professional'],
      'Good food/product': ['food', 'product', 'quality', 'delicious', 'fresh'],
      'Clean & tidy': ['clean', 'tidy', 'organized', 'neat', 'hygienic'],
      'Good value': ['value', 'price', 'affordable', 'worth', 'reasonable'],
      'Convenient location': ['location', 'convenient', 'accessible', 'close', 'easy'],
      'Poor service': ['slow', 'rude', 'unprofessional', 'ignored', 'dismissive'],
      'Bad quality': ['poor', 'bad', 'low quality', 'broken', 'defective'],
      'Dirty': ['dirty', 'filthy', 'messy', 'unhygienic', 'gross'],
      'Overpriced': ['expensive', 'overpriced', 'ripoff', 'costly', 'dear'],
      'Hard to find': ['hard to find', 'hidden', 'confusing', 'lost', 'unclear'],
    };

    const lowerText = text.toLowerCase();

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const count = keywords.filter((kw) => lowerText.includes(kw)).length;
      if (count > 0) {
        themes[theme] = count;
      }
    }

    // Return top 3 themes
    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme);
  }
}
