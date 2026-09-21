/**
 * Shared type definitions — mirrored from /orchestrator/types.ts
 * These MUST match the Resource shapes in planning.md Section 3.
 * Source of truth is /orchestrator/types.ts — update both files together.
 */

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
  timestamp: string;
  headlines: HeadlineEntry[];
  narrative_summary: string;
  mention_velocity: "spiking" | "steady" | "declining";
  narrative_entropy?: "low" | "medium" | "high";
}

export interface SignalLog {
  ticker: string;
  timestamp: string;
  price_reaction: "already_moved" | "moving_now" | "not_yet_reacted";
  signal_score: number; // 0–100
  signal_direction: "bullish" | "bearish" | "neutral";
  reasoning: string;
}

export interface VerdictLog {
  ticker: string;
  timestamp: string;
  challenges_raised: string[];
  credibility_check: "pass" | "flagged";
  recycled_content_check: "pass" | "flagged";
  volume_context_check: "organic" | "explained_by_calendar_event";
  final_verdict: "confirmed_signal" | "weakened_signal" | "rejected_signal";
  verdict_reasoning: string;
}

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
