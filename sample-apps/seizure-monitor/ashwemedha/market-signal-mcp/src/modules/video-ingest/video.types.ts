/**
 * video.types.ts — Shared data contracts for the Video Prediction Intelligence pipeline.
 *
 * These shapes are the single source of truth agreed upon by all 4 engineers.
 * Person 2 (Signal Validation), Person 3 (Predictor Credibility), and
 * Person 4 (Aggregator / Widget) import from this file — never duplicate them.
 *
 * DO NOT change field names without team-wide sign-off. Every downstream
 * agent will break silently if field names drift.
 */

// ─── Platform ─────────────────────────────────────────────────────────────────
export type VideoPlatform = 'youtube' | 'twitter' | 'tiktok' | 'instagram' | 'other';

// ─── VideoManifest ────────────────────────────────────────────────────────────
// Produced by `ingest_video`.
// All other agents consume this — it is the "front door" of the video pipeline.
export interface VideoManifest {
  video_id:          string;          // stable SHA-256 hash of the URL (first 16 hex chars)
  source_url:        string;
  platform:          VideoPlatform;
  title?:            string;
  channel_name?:     string;
  channel_handle?:   string;          // @username, normalised to include the @
  channel_id?:       string;          // platform-native channel ID
  posted_at?:        string;          // ISO 8601
  duration_sec?:     number;
  transcript:        string;          // full plain-text transcript from Whisper
  transcript_segments?: {             // word-level timing, present when Whisper returns it
    start_sec: number;
    end_sec:   number;
    text:      string;
  }[];
  fetched_at: string;                 // ISO 8601 — when this manifest was written
}

// ─── StockClaim ───────────────────────────────────────────────────────────────
// Produced by `extract_stock_claim`.
// The canonical "what is this video predicting?" object consumed by Persons 2, 3, 4.
export interface StockClaim {
  video_id:               string;     // FK → VideoManifest.video_id
  ticker:                 string;     // canonical ticker, resolved via Alpha Vantage
  company_name:           string;
  direction:              'up' | 'down' | 'neutral';
  timeframe_iso:          string;     // absolute date the prediction is for, e.g. "2026-07-27"
  timeframe_hint_raw:     string;     // what the speaker literally said, e.g. "tomorrow"
  reason_given?:          string;     // free-text reason extracted from transcript
  predictor_name:         string;     // display name of the speaker / channel
  predictor_handle:       string;     // @handle
  platform:               VideoPlatform;
  extraction_confidence:  'high' | 'medium' | 'low';
  transcript_evidence:    string;     // verbatim sentence(s) the claim was extracted from
}

// ─── RejectedClaim ────────────────────────────────────────────────────────────
// Returned by `extract_stock_claim` when the video is not a valid stock prediction.
export interface RejectedClaim {
  video_id:        string;
  rejected_reason: string;
}

export function isRejectedClaim(x: StockClaim | RejectedClaim): x is RejectedClaim {
  return 'rejected_reason' in x;
}

// ─── CalendarCheckResult (Person 2 writes, Person 4 reads) ───────────────────
export type CalendarEventType = 'earnings' | 'fed_meeting' | 'cpi' | 'product_launch' | 'conference' | 'other';

export interface CalendarEvent {
  type:        CalendarEventType;
  date:        string;            // ISO 8601
  source:      string;            // 'finnhub' | 'finnhub_economic' | 'rules_based'
  description: string;
}

export interface CalendarCheckResult {
  video_id:                 string;
  ticker:                   string;
  events_in_window:         CalendarEvent[];
  historically_correlated:  boolean;
  correlation_strength:     number;           // 0–1
  calendar_alignment_score: number;           // 0–30 (feeds aggregator)
  reasoning:                string;
}

// ─── PredictorProfile (Person 3 writes, Person 4 reads) ─────────────────────
export interface PastPrediction {
  date_made:     string;
  ticker:        string;
  direction:     'up' | 'down';
  timeframe_iso: string;
  outcome:       'correct' | 'incorrect' | 'unclear' | 'pending';
  evidence_url?: string;
}

export interface PredictorProfile {
  handle:                   string;
  platform:                 VideoPlatform;
  display_name?:            string;
  follower_count?:          number;
  account_age_years?:       number;
  verified?:                boolean;
  past_predictions_sampled: PastPrediction[];
  accuracy_rate?:           number;           // 0–1  correct/(correct+incorrect)
  sample_size:              number;
  predictor_score:          number;           // 0–25 (feeds aggregator)
  platform_score:           number;           // 0–10 (feeds aggregator)
  reasoning:                string;
}

// ─── VideoVerdict (Person 4 writes, widget reads) ────────────────────────────
export interface VerdictBreakdown {
  signal_score:       number;   // 0–35
  calendar_alignment: number;   // 0–30
  predictor_accuracy: number;   // 0–25
  platform_authority: number;   // 0–10
}

export interface VideoVerdict {
  video_id:                  string;
  claim:                     StockClaim;
  final_score:               number;                               // 0–100
  band:                      'HIGH' | 'MODERATE' | 'WEAK' | 'DISMISS';
  breakdown:                 VerdictBreakdown;
  calendar_evidence?:        CalendarCheckResult;
  predictor_evidence?:       PredictorProfile;
  signal_evidence?:          Record<string, unknown>;
  reasoning_narrative:       string;
  contrarian_or_consensus:   'contrarian' | 'consensus' | 'unclear';
  generated_at:              string;
}
