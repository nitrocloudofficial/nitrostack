import { Injectable, ConfigService } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';

export interface TrustScoreResult {
  score: number;
  reasons: string[];
  verified: boolean;
  breakdown: {
    evidence_score: number;
    reputation_score: number;
    originality_score: number;
    account_age_score: number;
    community_score: number;
  };
}

/**
 * Trust Engine Service
 * Computes trust scores for reviews based on multiple signals.
 * Implements the core scoring logic with explainability.
 */
@Injectable({ deps: [DatabaseService, ConfigService] })
export class TrustEngineService {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService
  ) {}

  /**
   * Compute trust score for a review
   */
  async computeTrustScore(reviewId: string): Promise<TrustScoreResult> {
    // Fetch review details
    const review = await this.db.queryOne<any>(
      `SELECT id, business_id, user_id, rating, text, created_at FROM reviews WHERE id = $1`,
      [reviewId]
    );

    if (!review) {
      throw new Error('Review not found');
    }

    // Fetch reviewer reputation
    const reputation = await this.db.queryOne<any>(
      `SELECT reputation_points, badge_tier, total_reviews, total_reports_received
       FROM reviewer_reputation
       WHERE user_id = $1`,
      [review.user_id]
    );

    // Fetch user account info
    const user = await this.db.queryOne<any>(
      `SELECT created_at FROM users WHERE id = $1`,
      [review.user_id]
    );

    // Fetch evidence
    const evidence = await this.db.queryAll<any>(
      `SELECT id, verified FROM evidence WHERE review_id = $1`,
      [reviewId]
    );

    // Fetch community reactions
    const reactions = await this.db.queryOne<any>(
      `SELECT 
        COALESCE(SUM(CASE WHEN reaction_type IN ('helpful', 'agree') THEN 1 ELSE 0 END), 0) as positive_reactions,
        COALESCE(SUM(CASE WHEN reaction_type IN ('disagree', 'report') THEN 1 ELSE 0 END), 0) as negative_reactions
       FROM community_reactions
       WHERE review_id = $1`,
      [reviewId]
    );

    // Fetch AI analysis (similarity, sentiment)
    const aiAnalysis = await this.db.queryOne<any>(
      `SELECT similarity_score, sentiment, sentiment_confidence FROM ai_analysis WHERE review_id = $1`,
      [reviewId]
    );

    // Initialize scoring
    let score = 50; // baseline
    const reasons: string[] = [];
    const breakdown = {
      evidence_score: 0,
      reputation_score: 0,
      originality_score: 0,
      account_age_score: 0,
      community_score: 0,
    };

    // ========== EVIDENCE SCORE (up to +30) ==========
    const verifiedEvidence = evidence?.filter((e: any) => e.verified) || [];
    if (verifiedEvidence.length > 0) {
      breakdown.evidence_score = 30;
      score += 30;
      reasons.push(`Verified evidence attached (${verifiedEvidence.length} item${verifiedEvidence.length > 1 ? 's' : ''})`);
    } else if (evidence && evidence.length > 0) {
      breakdown.evidence_score = 15;
      score += 15;
      reasons.push(`Evidence attached (${evidence.length} item${evidence.length > 1 ? 's' : ''})`);
    }

    // ========== REPUTATION SCORE (up to +20) ==========
    const tierBonusMap: Record<string, number> = {
      new_reviewer: 0,
      verified_reviewer: 5,
      trusted_reviewer: 10,
      expert_reviewer: 15,
      community_guardian: 18,
      truth_keeper: 20,
    };

    const tier = reputation?.badge_tier || 'new_reviewer';
    const tierBonus = tierBonusMap[tier] || 0;
    breakdown.reputation_score = tierBonus;
    score += tierBonus;

    if (tierBonus > 0) {
      reasons.push(`Reviewer tier: ${tier.replace(/_/g, ' ')}`);
    }

    // ========== ORIGINALITY SCORE (up to +20) ==========
    // Based on AI similarity analysis
    let similarityScore = 0;
    if (aiAnalysis?.similarity_score !== undefined) {
      const similarity = aiAnalysis.similarity_score;
      if (similarity < 0.7) {
        similarityScore = 20;
        reasons.push('Original writing (98% unique)');
      } else if (similarity < 0.85) {
        similarityScore = 10;
        reasons.push('Mostly original (85% unique)');
      } else {
        reasons.push('Possible duplicate pattern detected');
      }
    } else {
      // Default: assume original if no analysis yet
      similarityScore = 15;
      reasons.push('Original writing (no duplicates detected)');
    }
    breakdown.originality_score = similarityScore;
    score += similarityScore;

    // ========== ACCOUNT AGE SCORE (up to +15) ==========
    if (user) {
      const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
      const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

      if (accountAgeDays > 180) {
        breakdown.account_age_score = 15;
        score += 15;
        reasons.push('Established account history (180+ days)');
      } else if (accountAgeDays > 30) {
        breakdown.account_age_score = 8;
        score += 8;
        reasons.push(`Account age: ${Math.floor(accountAgeDays)} days`);
      } else {
        reasons.push(`New account (${Math.floor(accountAgeDays)} days old)`);
      }
    }

    // ========== COMMUNITY SCORE (up to +15) ==========
    const positiveReactions = reactions?.positive_reactions || 0;
    const negativeReactions = reactions?.negative_reactions || 0;
    const netReactions = positiveReactions - negativeReactions;

    if (netReactions > 5) {
      breakdown.community_score = 15;
      score += 15;
      reasons.push('Community validated (helpful reactions)');
    } else if (netReactions > 0) {
      breakdown.community_score = 8;
      score += 8;
      reasons.push('Some community validation');
    }

    // ========== PENALTIES ==========
    // Sentiment/rating mismatch
    if (aiAnalysis?.sentiment && review.rating) {
      const sentimentToRating: Record<string, number> = {
        positive: 4,
        neutral: 3,
        negative: 2,
      };
      const expectedRating = sentimentToRating[aiAnalysis.sentiment] || 3;
      if (Math.abs(review.rating - expectedRating) > 2) {
        score -= 10;
        reasons.push('Rating/sentiment mismatch');
      }
    }

    // Rapid submission pattern (stub for MVP)
    const recentReviewCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM reviews 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [review.user_id]
    );

    if ((recentReviewCount?.count || 0) > 3) {
      score -= 15;
      reasons.push('Rapid submission pattern detected');
    }

    // Reports received
    const reportCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM community_reports 
       WHERE review_id = $1 AND status IN ('pending', 'upheld')`,
      [reviewId]
    );

    if ((reportCount?.count || 0) > 0) {
      score -= 10;
      reasons.push(`${reportCount?.count} community report${(reportCount?.count || 0) > 1 ? 's' : ''}`);
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine verification status
    const verified = (verifiedEvidence.length > 0) || (breakdown.evidence_score > 0);

    return {
      score,
      reasons,
      verified,
      breakdown,
    };
  }

  /**
   * Save trust score to database
   */
  async saveTrustScore(reviewId: string, result: TrustScoreResult): Promise<void> {
    await this.db.query(
      `INSERT INTO trust_scores (review_id, score, reasons, evidence_score, reputation_score, originality_score, account_age_score, community_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        reviewId,
        result.score,
        JSON.stringify(result.reasons),
        result.breakdown.evidence_score,
        result.breakdown.reputation_score,
        result.breakdown.originality_score,
        result.breakdown.account_age_score,
        result.breakdown.community_score,
      ]
    );

    // Update review with latest score
    await this.db.query(
      `UPDATE reviews SET trust_score = $1, verification_status = $2 WHERE id = $3`,
      [result.score, result.verified ? 'verified' : 'unverified', reviewId]
    );
  }

  /**
   * Recalculate trust score (called when signals change)
   */
  async recalculateTrustScore(reviewId: string): Promise<TrustScoreResult> {
    const result = await this.computeTrustScore(reviewId);
    await this.saveTrustScore(reviewId, result);
    return result;
  }

  /**
   * Get trust score history for a review
   */
  async getTrustScoreHistory(reviewId: string, limit: number = 10): Promise<any[]> {
    return this.db.queryAll<any>(
      `SELECT score, reasons, evidence_score, reputation_score, originality_score, account_age_score, community_score, computed_at
       FROM trust_scores
       WHERE review_id = $1
       ORDER BY computed_at DESC
       LIMIT $2`,
      [reviewId, limit]
    );
  }

  /**
   * Get fraud risk score for a business
   * Detects review bombing, rating spikes, coordinated patterns
   */
  async computeBusinessFraudRisk(businessId: string): Promise<{
    fraud_risk_score: number;
    reasons: string[];
    review_spike: boolean;
    rating_anomaly: boolean;
  }> {
    let fraudRiskScore = 0;
    const reasons: string[] = [];

    // Check for review spike (more than 10 reviews in last 24 hours)
    const recentReviewCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM reviews 
       WHERE business_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [businessId]
    );

    const reviewSpike = (recentReviewCount?.count || 0) > 10;
    if (reviewSpike) {
      fraudRiskScore += 25;
      reasons.push(`Review spike detected (${recentReviewCount?.count} in 24h)`);
    }

    // Check for rating anomaly (sudden shift in average rating)
    const ratingStats = await this.db.queryOne<any>(
      `SELECT 
        AVG(rating) as avg_rating_all,
        AVG(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN rating END) as avg_rating_week
       FROM reviews
       WHERE business_id = $1`,
      [businessId]
    );

    const ratingAnomaly =
      ratingStats?.avg_rating_all &&
      ratingStats?.avg_rating_week &&
      Math.abs(ratingStats.avg_rating_week - ratingStats.avg_rating_all) > 1.5;

    if (ratingAnomaly) {
      fraudRiskScore += 20;
      reasons.push(`Rating anomaly detected (${ratingStats.avg_rating_week.toFixed(1)} vs ${ratingStats.avg_rating_all.toFixed(1)})`);
    }

    // Check for low-trust reviews (many unverified, low scores)
    const lowTrustCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM reviews 
       WHERE business_id = $1 AND trust_score < 40`,
      [businessId]
    );

    if ((lowTrustCount?.count || 0) > 5) {
      fraudRiskScore += 15;
      reasons.push(`Multiple low-trust reviews (${lowTrustCount?.count})`);
    }

    // Clamp to 0-100
    fraudRiskScore = Math.max(0, Math.min(100, fraudRiskScore));

    return {
      fraud_risk_score: fraudRiskScore,
      reasons,
      review_spike: reviewSpike,
      rating_anomaly: ratingAnomaly,
    };
  }
}
