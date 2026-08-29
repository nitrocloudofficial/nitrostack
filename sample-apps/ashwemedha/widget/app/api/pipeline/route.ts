/**
 * GET /api/pipeline?ticker=TSLA
 *
 * Returns the current pipeline state for a given ticker.
 *
 * Data priority (highest to lowest):
 *  1. Real orchestrator state (pipeline-state.json) — written by run-pipeline.ts
 *  2. Real Skeptic verdict store (data/verdict-log-store.json) — written by skeptic-server
 *  3. Seed/mock data from server/resources/ and server/data/ — always available fallback
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// ── Inline types (matching shared.types.ts exactly) ──────────────────────────

interface HeadlineEntry {
  source: string;
  text: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
  sentiment_score: number;
  published_at?: string;
}

interface FindingsBoard {
  ticker: string;
  timestamp: string;
  headlines: HeadlineEntry[];
  narrative_summary: string;
  mention_velocity: "spiking" | "steady" | "declining";
  narrative_entropy?: "low" | "medium" | "high";
}

interface SignalLog {
  ticker: string;
  timestamp: string;
  price_reaction: "already_moved" | "moving_now" | "not_yet_reacted";
  signal_score: number;
  signal_direction: "bullish" | "bearish" | "neutral";
  reasoning: string;
}

interface VerdictLog {
  ticker: string;
  timestamp: string;
  challenges_raised: string[];
  credibility_check: "pass" | "flagged";
  recycled_content_check: "pass" | "flagged";
  volume_context_check: "organic" | "explained_by_calendar_event";
  final_verdict: "confirmed_signal" | "weakened_signal" | "rejected_signal";
  verdict_reasoning: string;
}

type AgentStage = "idle" | "scout" | "analyst" | "skeptic" | "done" | "error";

interface PipelineState {
  ticker: string;
  stage: AgentStage;
  findings?: FindingsBoard;
  signal?: SignalLog;
  verdict?: VerdictLog;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ── Path resolution ───────────────────────────────────────────────────────────

const ROOT = path.join(process.cwd(), "..");                        // ashwemedha.exe/
const STATE_FILE = path.join(ROOT, "orchestrator", "pipeline-state.json");
const VERDICT_STORE = path.join(ROOT, "data", "verdict-log-store.json"); // real Skeptic output
const SEED_NEWS = path.join(ROOT, "server", "data", "seed-news.json");
const SEED_SIGNALS = path.join(ROOT, "server", "data", "seed-signals.json");
const SEED_VERDICTS = path.join(ROOT, "server", "data", "seed-verdicts.json");

// ── Mock data from server/resources/*.resource.ts (copied inline for Next.js) ─

const FINDINGS_MOCK: Record<string, FindingsBoard> = {
  TSLA: {
    ticker: "TSLA",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "reuters.com",
        text: "Tesla Q2 deliveries beat expectations as China demand recovers strongly",
        url: "https://reuters.com/example/tsla-q2",
        sentiment: "positive",
        sentiment_score: 0.72,
        published_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
      },
      {
        source: "prnewswire.com",
        text: "Tesla announces record delivery numbers in groundbreaking second quarter milestone",
        url: "https://prnewswire.com/example/tsla-release",
        sentiment: "positive",
        sentiment_score: 0.88,
        published_at: new Date(Date.now() - 1.5 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Tesla Q2 delivery numbers exceeded analyst expectations, driven by China market recovery.",
    mention_velocity: "spiking",
    narrative_entropy: "medium",
  },
  NVDA: {
    ticker: "NVDA",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "bloomberg.com",
        text: "Nvidia data center revenue surges as AI chip demand shows no signs of slowing",
        url: "https://bloomberg.com/example/nvda",
        sentiment: "positive",
        sentiment_score: 0.88,
        published_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
      },
      {
        source: "reuters.com",
        text: "Nvidia quarterly earnings beat on strong enterprise AI infrastructure spending",
        url: "https://reuters.com/example/nvda-q2",
        sentiment: "positive",
        sentiment_score: 0.81,
        published_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Nvidia AI chip demand remains strong, with data center revenue driven by enterprise AI buildout.",
    mention_velocity: "steady",
    narrative_entropy: "low",
  },
  AAPL: {
    ticker: "AAPL",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "wsj.com",
        text: "Apple faces antitrust scrutiny as EU regulators widen investigation into App Store",
        url: "https://wsj.com/example/aapl-antitrust",
        sentiment: "negative",
        sentiment_score: -0.55,
        published_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Regulatory pressure on Apple intensifies in Europe, App Store practices under investigation.",
    mention_velocity: "declining",
    narrative_entropy: "low",
  },
  BTC: {
    ticker: "BTC",
    timestamp: new Date().toISOString(),
    headlines: [
      {
        source: "zerohedge.com",
        text: "Bitcoin to the moon rocket massive pump guaranteed gains YOLO 100x parabolic squeeze",
        url: "https://zerohedge.com/example/btc",
        sentiment: "positive",
        sentiment_score: 0.91,
        published_at: new Date(Date.now() - 0.5 * 3600_000).toISOString(),
      },
      {
        source: "zerohedge.com",
        text: "BTC mooning diamond hands easy money millionaire guaranteed parabolic explosion",
        url: "https://zerohedge.com/example/btc-2",
        sentiment: "positive",
        sentiment_score: 0.89,
        published_at: new Date(Date.now() - 0.25 * 3600_000).toISOString(),
      },
    ],
    narrative_summary:
      "Bitcoin social chatter dominated by extreme hype language and retail excitement.",
    mention_velocity: "spiking",
    narrative_entropy: "high",
  },
};

const SIGNAL_MOCK: Record<string, SignalLog> = {
  TSLA: {
    ticker: "TSLA",
    timestamp: new Date().toISOString(),
    price_reaction: "not_yet_reacted",
    signal_score: 72,
    signal_direction: "bullish",
    reasoning:
      "Strong positive sentiment (avg score 0.80) combined with spiking mention velocity and price not yet reacted. Early signal window open.",
  },
  NVDA: {
    ticker: "NVDA",
    timestamp: new Date().toISOString(),
    price_reaction: "already_moved",
    signal_score: 45,
    signal_direction: "bullish",
    reasoning:
      "Positive sentiment confirmed but price already up 3.2% intraday — signal may be priced in. Diminished opportunity.",
  },
  AAPL: {
    ticker: "AAPL",
    timestamp: new Date().toISOString(),
    price_reaction: "moving_now",
    signal_score: 61,
    signal_direction: "bearish",
    reasoning:
      "Regulatory news driving active sell-off. Volume 2.4x 30-day average. Bearish momentum actively developing.",
  },
  BTC: {
    ticker: "BTC",
    timestamp: new Date().toISOString(),
    price_reaction: "not_yet_reacted",
    signal_score: 78,
    signal_direction: "bullish",
    reasoning:
      "Spiking social mentions with strong positive sentiment. Price has not yet moved — potential entry window.",
  },
};

// ── Loaders ───────────────────────────────────────────────────────────────────

function safeReadJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function getFindings(ticker: string): FindingsBoard | undefined {
  // Try seed-news.json (Person 1 format)
  const seedNews = safeReadJson<Record<string, FindingsBoard[]>>(SEED_NEWS);
  if (seedNews?.[ticker]?.[0]) return seedNews[ticker][0];
  // Fallback: resource mock data
  return FINDINGS_MOCK[ticker];
}

function getSignal(ticker: string): SignalLog | undefined {
  // Try seed-signals.json (Person 2 format)
  const seedSig = safeReadJson<Record<string, SignalLog>>(SEED_SIGNALS);
  if (seedSig?.[ticker]) return seedSig[ticker];
  // Fallback: resource mock data
  return SIGNAL_MOCK[ticker];
}

function getVerdict(ticker: string): VerdictLog | undefined {
  // Priority 1: Real verdict-log-store.json (Person 3 writes this)
  const store = safeReadJson<Record<string, VerdictLog[]>>(VERDICT_STORE);
  if (store?.[ticker]?.length) {
    // Return the most recent entry
    return store[ticker][store[ticker].length - 1];
  }
  // Priority 2: seed-verdicts.json
  const seedVerdicts = safeReadJson<Record<string, VerdictLog>>(SEED_VERDICTS);
  if (seedVerdicts?.[ticker]) return seedVerdicts[ticker];
  return undefined;
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "BTC").toUpperCase();

  // Priority 1: Real orchestrator pipeline state
  const liveState = safeReadJson<PipelineState>(STATE_FILE);
  if (liveState && liveState.ticker === ticker) {
    return NextResponse.json(liveState, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  // Priority 2: Build full "done" state from best available data sources
  const state: PipelineState = {
    ticker,
    stage: "done",
    findings: getFindings(ticker),
    signal: getSignal(ticker),
    verdict: getVerdict(ticker),
    startedAt: new Date(Date.now() - 15000).toISOString(),
    completedAt: new Date().toISOString(),
  };

  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { ticker?: string };
    const ticker = (body.ticker ?? "BTC").toUpperCase();

    const initState: PipelineState = {
      ticker,
      stage: "scout",
      startedAt: new Date().toISOString(),
    };

    // Write pipeline state so real orchestrator can also pick it up
    try {
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(initState, null, 2));
    } catch {
      // Non-fatal
    }

    return NextResponse.json(
      { accepted: true, ticker, message: "Pipeline started" },
      { status: 202 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
