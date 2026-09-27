/**
 * predictor-credibility.tools.ts — MCP Tools for Person 3.
 * Tools: fetch_predictor_profile, fetch_predictor_history, score_predictor_accuracy
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  fetchTwitterProfile,
  fetchTwitterRecentPosts,
  fetchYouTubeProfile,
  fetchYouTubeRecentVideoTitles,
} from './social-profile.impl.js';
import { extractPastPredictionsFromPosts } from './past-post-scraper.impl.js';
import { backtestPredictions }             from './backtest.impl.js';
import { writePredictorProfile, readPredictorProfile } from './predictor-profiles.resource.js';
import { readClaim } from '../video-ingest/claims.resource.js';
import type { PredictorProfile, VideoPlatform } from '../video-ingest/video.types.js';

function computePlatformScore(platform: VideoPlatform, followerCount: number, verified: boolean): number {
  // Base by platform authority: YouTube > Twitter > TikTok > Instagram > other
  const platformBase: Record<VideoPlatform, number> = {
    youtube:   5,
    twitter:   4,
    tiktok:    3,
    instagram: 3,
    other:     1,
  };
  let score = platformBase[platform] ?? 1;

  // Follower tiers (adds up to 3 pts)
  if      (followerCount >= 1_000_000) score += 3;
  else if (followerCount >= 100_000)   score += 2;
  else if (followerCount >= 10_000)    score += 1;

  // Verified adds 2 pts
  if (verified) score += 2;

  return Math.min(10, score);
}

function computePredictorScore(accuracyRate: number, sampleSize: number): number {
  // Accuracy 0–1 maps to 0–20 pts, sample size credibility 0–5 pts
  const accuracyPts = Math.round(accuracyRate * 20);
  const samplePts   = sampleSize >= 10 ? 5 : sampleSize >= 5 ? 3 : sampleSize >= 2 ? 1 : 0;
  return Math.min(25, accuracyPts + samplePts);
}

export class PredictorCredibilityTools {
  @Tool({
    name: 'fetch_predictor_profile',
    description:
      'Predictor Credibility Agent (Phase 2): Fetches social profile stats (followers, account age, verified) ' +
      'for a given handle on Twitter/X or YouTube. ' +
      'Requires TWITTER_BEARER_TOKEN (twitter) or YOUTUBE_API_KEY (youtube) in .env. ' +
      'Falls back gracefully with empty stats if keys are missing.',
    inputSchema: z.object({
      handle:   z.string().describe('Social media handle including @, e.g. "@chartguy"'),
      platform: z.enum(['youtube', 'twitter', 'tiktok', 'instagram', 'other']),
    }),
  })
  async fetchPredictorProfileTool(
    input: { handle: string; platform: VideoPlatform },
    ctx: ExecutionContext
  ) {
    const { handle, platform } = input;
    const twitterToken = process.env.TWITTER_BEARER_TOKEN ?? '';
    const ytKey        = process.env.YOUTUBE_API_KEY ?? '';
    ctx.logger.info('PredictorCredibility: fetch_predictor_profile', { handle, platform });

    let stats: Awaited<ReturnType<typeof fetchTwitterProfile>> = {};
    if (platform === 'twitter') {
      stats = await fetchTwitterProfile(handle, twitterToken);
    } else if (platform === 'youtube') {
      stats = await fetchYouTubeProfile(handle, ytKey);
    }

    return {
      handle,
      platform,
      ...stats,
      twitter_key_set: !!twitterToken,
      youtube_key_set: !!ytKey,
    };
  }

  @Tool({
    name: 'fetch_predictor_history',
    description:
      'Predictor Credibility Agent (Phase 2): Fetches recent posts/video titles for a predictor ' +
      'and uses Groq LLaMA to extract past stock predictions from them. ' +
      'Returns a list of extracted PastPrediction objects (ticker, direction, timeframe, outcome=pending). ' +
      'Requires GROQ_API_KEY. Optionally TWITTER_BEARER_TOKEN or YOUTUBE_API_KEY for more posts.',
    inputSchema: z.object({
      handle:      z.string().describe('Social handle with @'),
      platform:    z.enum(['youtube', 'twitter', 'tiktok', 'instagram', 'other']),
      user_id:     z.string().optional().describe('Platform user ID if already known (speeds up Twitter fetch)'),
      channel_id:  z.string().optional().describe('YouTube channel ID if already known'),
    }),
  })
  async fetchPredictorHistoryTool(
    input: { handle: string; platform: VideoPlatform; user_id?: string; channel_id?: string },
    ctx: ExecutionContext
  ) {
    const { handle, platform, user_id, channel_id } = input;
    const groqKey      = process.env.GROQ_API_KEY ?? '';
    const twitterToken = process.env.TWITTER_BEARER_TOKEN ?? '';
    const ytKey        = process.env.YOUTUBE_API_KEY ?? '';
    ctx.logger.info('PredictorCredibility: fetch_predictor_history', { handle, platform });

    if (!groqKey) {
      return { success: false, error: 'GROQ_API_KEY not set — cannot extract predictions from posts.' };
    }

    let posts: string[] = [];
    if (platform === 'twitter' && twitterToken) {
      // Fetch user id first if not given
      let uid = user_id;
      if (!uid) {
        const profile = await fetchTwitterProfile(handle, twitterToken);
        uid = (profile as any).platform_user_id;
      }
      if (uid) posts = await fetchTwitterRecentPosts(uid, twitterToken, 50);
    } else if (platform === 'youtube' && ytKey) {
      let cid = channel_id;
      if (!cid) {
        const profile = await fetchYouTubeProfile(handle, ytKey) as any;
        cid = profile.channel_id;
      }
      if (cid) posts = await fetchYouTubeRecentVideoTitles(cid, ytKey, 20);
    }

    if (posts.length === 0) {
      return {
        success:     false,
        handle,
        platform,
        posts_found: 0,
        predictions: [],
        note:        'No posts fetched. Check API keys or platform support.',
      };
    }

    const predictions = await extractPastPredictionsFromPosts(posts, groqKey);

    return {
      success:     true,
      handle,
      platform,
      posts_found: posts.length,
      predictions_extracted: predictions.length,
      predictions,
    };
  }

  @Tool({
    name: 'score_predictor_accuracy',
    description:
      'Predictor Credibility Agent (Phase 2, main tool): Reads a StockClaim from video://claims by video_id, ' +
      'fetches the predictor\'s social profile, extracts their past predictions, backtests them against Yahoo Finance ' +
      'historical prices, and computes predictor_score (0–25) + platform_score (0–10). ' +
      'Writes the result as a PredictorProfile to video://predictor-profiles. ' +
      'Call this after extract_stock_claim. Requires GROQ_API_KEY.',
    inputSchema: z.object({
      video_id: z.string().describe('video_id from ingest_video'),
    }),
  })
  async scorePredictorAccuracyTool(input: { video_id: string }, ctx: ExecutionContext) {
    const { video_id } = input;
    const groqKey      = process.env.GROQ_API_KEY ?? '';
    const twitterToken = process.env.TWITTER_BEARER_TOKEN ?? '';
    const ytKey        = process.env.YOUTUBE_API_KEY ?? '';
    ctx.logger.info('PredictorCredibility: score_predictor_accuracy', { video_id });

    const claim = readClaim(video_id);
    if (!claim) {
      return { success: false, error: `No StockClaim for video_id "${video_id}". Run extract_stock_claim first.` };
    }

    const { predictor_handle, platform } = claim;

    // 1. Fetch social profile stats
    let profileStats: Awaited<ReturnType<typeof fetchTwitterProfile>> & { channel_id?: string } = {};
    if (platform === 'twitter' && twitterToken) {
      profileStats = await fetchTwitterProfile(predictor_handle, twitterToken);
    } else if (platform === 'youtube' && ytKey) {
      profileStats = await fetchYouTubeProfile(predictor_handle, ytKey);
    }

    // 2. Fetch recent posts and extract predictions
    let posts: string[] = [];
    const uid      = (profileStats as any).platform_user_id as string | undefined;
    const cid      = profileStats.channel_id;

    if (platform === 'twitter' && twitterToken && uid) {
      posts = await fetchTwitterRecentPosts(uid, twitterToken, 50);
    } else if (platform === 'youtube' && ytKey && cid) {
      posts = await fetchYouTubeRecentVideoTitles(cid, ytKey, 20);
    }

    const extractedPredictions = groqKey && posts.length > 0
      ? await extractPastPredictionsFromPosts(posts, groqKey)
      : [];

    // 3. Backtest extracted predictions
    const backtest = extractedPredictions.length > 0
      ? await backtestPredictions(claim.ticker, extractedPredictions)
      : { scored_predictions: [], accuracy_rate: 0, sample_size: 0, correct: 0, incorrect: 0, unclear: 0 };

    // 4. Compute scores
    const followerCount = profileStats.follower_count ?? 0;
    const verified      = profileStats.verified ?? false;
    const platformScore = computePlatformScore(platform as VideoPlatform, followerCount, verified);
    const predictorScore = computePredictorScore(backtest.accuracy_rate, backtest.sample_size);

    // 5. Build reasoning narrative
    const keyMissing = !twitterToken && !ytKey;
    const reasoning = keyMissing
      ? `No social API keys set — profile stats and prediction history unavailable. Scored from fallback defaults.`
      : `${predictor_handle} on ${platform}: ${followerCount.toLocaleString()} followers, ` +
        `verified=${verified}, account age=${profileStats.account_age_years ?? 'unknown'} yrs. ` +
        (backtest.sample_size > 0
          ? `Backtested ${backtest.sample_size} predictions: ${backtest.correct} correct, ${backtest.incorrect} incorrect ` +
            `(${Math.round(backtest.accuracy_rate * 100)}% accuracy).`
          : 'No past prediction data found from posts.');

    const profile: PredictorProfile = {
      handle:                   predictor_handle,
      platform:                 platform as VideoPlatform,
      display_name:             profileStats.display_name ?? claim.predictor_name,
      follower_count:           followerCount || undefined,
      account_age_years:        profileStats.account_age_years,
      verified:                 verified || undefined,
      past_predictions_sampled: backtest.scored_predictions.slice(0, 20),
      accuracy_rate:            backtest.sample_size > 0 ? backtest.accuracy_rate : undefined,
      sample_size:              backtest.sample_size,
      predictor_score:          predictorScore,
      platform_score:           platformScore,
      reasoning,
    };

    writePredictorProfile(profile);
    ctx.logger.info('PredictorCredibility: wrote profile', { video_id, predictor_handle, predictorScore, platformScore });

    return {
      success:         true,
      video_id,
      predictor_handle,
      platform,
      predictor_score: predictorScore,
      platform_score:  platformScore,
      accuracy_rate:   profile.accuracy_rate,
      sample_size:     backtest.sample_size,
      reasoning,
      next_step:       `Person 4: call aggregate_video_confidence with video_id="${video_id}" after Person 2 also completes.`,
    };
  }
}
