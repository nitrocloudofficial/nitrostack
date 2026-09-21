/**
 * aggregator.impl.ts — Combine signal/calendar/predictor/platform scores into VideoVerdict.
 * Scoring rubric (sum = 0–100):
 *   signal_score       0–35  (from extract_stock_claim extraction_confidence)
 *   calendar_alignment 0–30  (from validate_claim_against_signal)
 *   predictor_accuracy 0–25  (from score_predictor_accuracy → predictor_score)
 *   platform_authority 0–10  (from score_predictor_accuracy → platform_score)
 */
import type {
  StockClaim,
  CalendarCheckResult,
  PredictorProfile,
  VerdictBreakdown,
  VideoVerdict,
} from '../video-ingest/video.types.js';

function extractionConfidenceToSignalScore(confidence: StockClaim['extraction_confidence']): number {
  // high → 30–35, medium → 18–28, low → 5–15
  if (confidence === 'high')   return 32;
  if (confidence === 'medium') return 22;
  return 10;
}

function determineBand(score: number): VideoVerdict['band'] {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MODERATE';
  if (score >= 40) return 'WEAK';
  return 'DISMISS';
}

function detectContrarian(
  claim: StockClaim,
  calendar: CalendarCheckResult | null
): VideoVerdict['contrarian_or_consensus'] {
  // If earnings are upcoming and prediction goes AGAINST recent trend, it may be contrarian.
  // Without market data we use a simple heuristic: down prediction with strong calendar → contrarian.
  if (!calendar || calendar.events_in_window.length === 0) return 'unclear';
  const hasEarnings = calendar.events_in_window.some(e => e.type === 'earnings');
  if (hasEarnings && claim.direction === 'down' && calendar.correlation_strength >= 0.6) return 'contrarian';
  if (hasEarnings && claim.direction === 'up'   && calendar.correlation_strength >= 0.6) return 'consensus';
  return 'unclear';
}

export interface AggregatorInputs {
  claim:     StockClaim;
  calendar?: CalendarCheckResult | null;
  predictor?: PredictorProfile | null;
}

export function aggregateScores(inputs: AggregatorInputs): {
  breakdown: VerdictBreakdown;
  final_score: number;
  band: VideoVerdict['band'];
  contrarian_or_consensus: VideoVerdict['contrarian_or_consensus'];
} {
  const { claim, calendar, predictor } = inputs;

  const signalScore    = extractionConfidenceToSignalScore(claim.extraction_confidence);
  const calendarScore  = calendar?.calendar_alignment_score ?? 0;
  const predictorScore = predictor?.predictor_score         ?? 0;
  const platformScore  = predictor?.platform_score          ?? 0;

  const finalScore = Math.min(100, signalScore + calendarScore + predictorScore + platformScore);

  return {
    breakdown: {
      signal_score:       signalScore,
      calendar_alignment: calendarScore,
      predictor_accuracy: predictorScore,
      platform_authority: platformScore,
    },
    final_score:             finalScore,
    band:                    determineBand(finalScore),
    contrarian_or_consensus: detectContrarian(claim, calendar ?? null),
  };
}
