// Locked resource shapes from planning.md Section 3.
// DO NOT change these solo — all four team members depend on these interfaces.

export interface HeadlineEntry {
  source: string;
  text: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
  sentiment_score: number; // -1.0 to 1.0
  published_at?: string;   // ISO8601 — when the article was published
}

export interface FindingsBoard {
  ticker: string;
  timestamp: string; // ISO8601
  headlines: HeadlineEntry[];
  narrative_summary: string;
  mention_velocity: "spiking" | "steady" | "declining";
}

export interface SignalLog {
  ticker: string;
  timestamp: string; // ISO8601
  price_reaction: "already_moved" | "moving_now" | "not_yet_reacted";
  signal_score: number; // 0-100
  signal_direction: "bullish" | "bearish" | "neutral";
  reasoning: string;
}

export interface VerdictLog {
  ticker: string;
  timestamp: string; // ISO8601
  challenges_raised: string[];
  credibility_check: "pass" | "flagged";
  recycled_content_check: "pass" | "flagged";
  volume_context_check: "organic" | "explained_by_calendar_event";
  final_verdict: "confirmed_signal" | "weakened_signal" | "rejected_signal";
  verdict_reasoning: string;
}

// Internal types for data files — not part of the locked MCP Resource shapes

// ─── Analyst Agent types ──────────────────────────────────────────────────────

export interface PriceBar {
  date: string;       // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceVolumeData {
  ticker: string;
  currency: string;               // "USD" for stocks, "USD" for crypto
  current_price: number;
  previous_close: number;
  change_pct: number;             // daily change percentage
  volume_today: number;
  volume_30d_avg: number;
  volume_ratio: number;           // today / 30d avg
  price_bars: PriceBar[];         // last 10 trading days
  fetched_at: string;             // ISO8601
  source: string;                 // "yahoo" | "coingecko" | "cache"
}

export interface HistoricalSignal {
  date: string;
  pattern_type: string;
  signal_score: number;
  signal_direction: "bullish" | "bearish" | "neutral";
  price_reaction: "already_moved" | "moving_now" | "not_yet_reacted";
  outcome: string;
  context: string;
}

export interface HistoricalPatternLookupResult {
  ticker: string;
  pattern_type: string;
  matches_found: number;
  matches: HistoricalSignal[];
  avg_signal_score: number;
  avg_outcome_success_rate: string;  // human-readable
  summary: string;
}

// ─── Person 3 internal types ──────────────────────────────────────────────────

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type: "earnings" | "options_expiry" | "index_rebalance";
  description: string;
}

export interface MarketCalendarData {
  events: Record<string, CalendarEvent[]>;
}

export interface SourceCredibilityData {
  tiers: {
    high: string[];
    medium: string[];
    low: string[];
    press_release_mills: string[];
  };
  scores: Record<string, number>;
  descriptions: Record<string, string>;
}
