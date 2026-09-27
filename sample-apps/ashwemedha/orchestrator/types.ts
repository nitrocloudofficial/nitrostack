/**
 * Shared type definitions for all three agent Resources.
 * These MUST stay in sync with Section 3 of planning.md.
 * Do NOT change these shapes without team agreement.
 */

// ─── findings_board (Person 1 writes, Persons 2 & 3 & Widget read) ────────────

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
  /** Added by Scout's detect_narrative_shift tool */
  narrative_entropy?: "low" | "medium" | "high";
}

// ─── signal_log (Person 2 writes, Person 3 & Widget read) ────────────────────

export interface SignalLog {
  ticker: string;
  timestamp: string; // ISO8601
  price_reaction: "already_moved" | "moving_now" | "not_yet_reacted";
  signal_score: number; // 0–100
  signal_direction: "bullish" | "bearish" | "neutral";
  reasoning: string;
}

// ─── verdict_log (Person 3 writes, Widget reads) ──────────────────────────────

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

// ─── Pipeline state ───────────────────────────────────────────────────────────

export type AgentStage = "idle" | "scout" | "analyst" | "skeptic" | "done" | "error";

export interface PipelineState {
  ticker: string;
  stage: AgentStage;
  findings?: FindingsBoard;
  signal?: SignalLog;
  verdict?: VerdictLog;
  error?: string;
  startedAt: string;
  completedAt?: string;
}
