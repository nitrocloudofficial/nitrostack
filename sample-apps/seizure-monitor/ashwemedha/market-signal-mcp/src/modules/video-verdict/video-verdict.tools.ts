/**
 * video-verdict.tools.ts — MCP Tools for Person 4 (Confidence Aggregator).
 * Tools: aggregate_video_confidence, list_video_verdicts
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { aggregateScores }       from './aggregator.impl.js';
import { buildNarrative }        from './narrative-builder.impl.js';
import { writeVerdict, readAllVerdicts } from './video-verdict.resource.js';
import { readClaim }             from '../video-ingest/claims.resource.js';
import { readCalendarCheck }     from '../signal-validation/calendar-checks.resource.js';
import { readPredictorProfile }  from '../predictor-credibility/predictor-profiles.resource.js';
import type { VideoVerdict }     from '../video-ingest/video.types.js';

export class VideoVerdictTools {
  @Tool({
    name: 'aggregate_video_confidence',
    description:
      'Confidence Aggregator (Phase 2, final step): Reads a StockClaim (video://claims), ' +
      'CalendarCheckResult (video://calendar-checks), and PredictorProfile (video://predictor-profiles) ' +
      'for the given video_id, combines all scores into a final VideoVerdict with ' +
      'final_score (0–100) and band (HIGH/MODERATE/WEAK/DISMISS). ' +
      'Generates a Groq-powered reasoning narrative and writes the verdict to video://verdicts. ' +
      'Run AFTER extract_stock_claim, validate_claim_against_signal, and score_predictor_accuracy.',
    inputSchema: z.object({
      video_id: z.string().describe('video_id from ingest_video'),
    }),
  })
  async aggregateVideoConfidenceTool(input: { video_id: string }, ctx: ExecutionContext) {
    const { video_id } = input;
    const groqKey      = process.env.GROQ_API_KEY ?? '';
    ctx.logger.info('VideoVerdict: aggregate_video_confidence', { video_id });

    // 1. Read StockClaim (required)
    const claim = readClaim(video_id);
    if (!claim) {
      return {
        success: false,
        error: `No StockClaim for video_id "${video_id}". Run extract_stock_claim first.`,
      };
    }

    // 2. Read supporting evidence (optional — score 0 if missing)
    const calendar  = readCalendarCheck(video_id);
    const predictor = readPredictorProfile(claim.predictor_handle, claim.platform);

    if (!calendar) {
      ctx.logger.warn('VideoVerdict: no CalendarCheckResult — calendar score = 0', { video_id });
    }
    if (!predictor) {
      ctx.logger.warn('VideoVerdict: no PredictorProfile — predictor/platform score = 0', { video_id });
    }

    // 3. Aggregate scores
    const { breakdown, final_score, band, contrarian_or_consensus } = aggregateScores({
      claim,
      calendar,
      predictor,
    });

    // 4. Build narrative
    const narrative = await buildNarrative(
      claim, band, final_score, breakdown, calendar ?? null, predictor ?? null, groqKey
    );

    // 5. Build and persist verdict
    const verdict: VideoVerdict = {
      video_id,
      claim,
      final_score,
      band,
      breakdown,
      calendar_evidence:   calendar   ?? undefined,
      predictor_evidence:  predictor  ?? undefined,
      signal_evidence:     { extraction_confidence: claim.extraction_confidence, transcript_evidence: claim.transcript_evidence },
      reasoning_narrative: narrative,
      contrarian_or_consensus,
      generated_at:        new Date().toISOString(),
    };

    writeVerdict(verdict);
    ctx.logger.info('VideoVerdict: wrote verdict', { video_id, final_score, band });

    return {
      success:                 true,
      video_id,
      ticker:                  claim.ticker,
      direction:               claim.direction,
      timeframe:               claim.timeframe_iso,
      final_score,
      band,
      breakdown,
      contrarian_or_consensus,
      reasoning_narrative:     narrative,
      calendar_score_missing:  !calendar,
      predictor_score_missing: !predictor,
    };
  }

  @Tool({
    name: 'list_video_verdicts',
    description:
      'Returns all VideoVerdict objects stored in video://verdicts, sorted by final_score descending. ' +
      'Each verdict contains the full score breakdown and reasoning narrative for one submitted video URL. ' +
      'Use this to browse all analysed stock prediction videos and their confidence ratings.',
    inputSchema: z.object({
      band_filter: z
        .enum(['HIGH', 'MODERATE', 'WEAK', 'DISMISS'])
        .optional()
        .describe('Filter by confidence band. Omit to return all.'),
      limit: z.number().int().min(1).max(50).optional().describe('Max number of verdicts to return (default 20)'),
    }),
  })
  async listVideoVerdictsTool(
    input: { band_filter?: VideoVerdict['band']; limit?: number },
    ctx: ExecutionContext
  ) {
    const { band_filter, limit = 20 } = input;
    ctx.logger.info('VideoVerdict: list_video_verdicts', { band_filter, limit });

    let verdicts = readAllVerdicts().sort((a, b) => b.final_score - a.final_score);
    if (band_filter) verdicts = verdicts.filter(v => v.band === band_filter);
    const sliced = verdicts.slice(0, limit);

    return {
      total:  verdicts.length,
      shown:  sliced.length,
      filter: band_filter ?? 'all',
      verdicts: sliced.map(v => ({
        video_id:            v.video_id,
        ticker:              v.claim.ticker,
        direction:           v.claim.direction,
        timeframe:           v.claim.timeframe_iso,
        predictor:           v.claim.predictor_handle,
        platform:            v.claim.platform,
        final_score:         v.final_score,
        band:                v.band,
        breakdown:           v.breakdown,
        contrarian:          v.contrarian_or_consensus,
        reasoning_narrative: v.reasoning_narrative,
        generated_at:        v.generated_at,
      })),
    };
  }
}
