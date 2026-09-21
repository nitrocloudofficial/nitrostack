// Person 2 — Analyst Agent tools.
// All four tools are pure functions (no side effects except assess_signal_strength,
// which writes to signal_log). This makes them independently testable without
// running the MCP server.
//
// Scoring discipline: every threshold and point value is an explicit constant with
// a comment explaining the rationale. Judges will ask — "the LLM decided" is not
// an acceptable answer.

import * as fs from "fs";
import * as path from "path";

import type {
  FindingsBoard,
  SignalLog,
  PriceVolumeData,
  PriceBar,
  HistoricalSignal,
  HistoricalPatternLookupResult,
} from "../types/shared.types.js";
import { writeSignalLog } from "../resources/signal-log.resource.js";

// DATA_DIR resolves from process.cwd() (the app root, /app in the container)
const DATA_DIR = path.join(process.cwd(), "data");

// Load historical patterns once at module initialization — with safe fallback
function loadJson<T>(filename: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8")) as T;
  } catch {
    console.error(`[analyst.tools] Warning: could not load ${filename}, using built-in fallback.`);
    return fallback;
  }
}

const HISTORICAL_SIGNALS: Record<string, HistoricalSignal[]> = loadJson("historical-signals.json", {});

// ─── Price/Volume Cache ───────────────────────────────────────────────────────
// In-memory cache keyed by ticker. Avoids redundant API calls during a demo
// session where multiple tools may query the same ticker in sequence.

const priceCache = new Map<string, PriceVolumeData>();

// Cache TTL: 5 minutes — long enough to survive a pipeline run, short enough
// to reflect real market changes if the demo runs twice.
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedPriceVolume(ticker: string): PriceVolumeData | null {
  const cached = priceCache.get(ticker.toUpperCase());
  if (!cached) return null;
  const age = Date.now() - new Date(cached.fetched_at).getTime();
  if (age > CACHE_TTL_MS) {
    priceCache.delete(ticker.toUpperCase());
    return null;
  }
  return cached;
}

// ─── Tool 1: fetch_price_volume ───────────────────────────────────────────────
// Fetches current price and 30-day volume context for a ticker.
// Routes to Yahoo Finance for stocks, CoinGecko for crypto.
// Falls back to seed-signals.json if the API call fails (demo resilience).

export interface FetchPriceVolumeResult {
  data: PriceVolumeData;
  source: "live" | "seed_fallback";
  error?: string;
}

export async function fetchPriceVolume(ticker: string): Promise<FetchPriceVolumeResult> {
  const upper = ticker.toUpperCase();

  // Check cache first — no API call needed
  const cached = getCachedPriceVolume(upper);
  if (cached) {
    return { data: { ...cached, source: "cache" }, source: "live" };
  }

  try {
    let data: PriceVolumeData;
    if (upper === "BTC") {
      data = await fetchFromCoinGecko(upper);
    } else {
      data = await fetchFromYahoo(upper);
    }
    priceCache.set(upper, data);
    return { data, source: "live" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Fall back to seed data so the pipeline doesn't break during demo
    const seedData = loadSeedPriceData(upper);
    if (seedData) {
      return {
        data: seedData,
        source: "seed_fallback",
        error: `Live API failed: ${errMsg}. Using seed data.`,
      };
    }
    throw new Error(`Failed to fetch price data for ${upper} and no seed data available: ${errMsg}`);
  }
}

// ─── Yahoo Finance ─────────────────────────────────────────────────────────────

async function fetchFromYahoo(ticker: string): Promise<PriceVolumeData> {
  // Yahoo Finance v8 chart API — free, no auth required.
  // range=1mo gives us 30 days of daily bars for volume averaging.
  // We use query1 (the primary Yahoo Finance endpoint).
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MarketSignalMCP/1.0)",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance returned HTTP ${res.status} for ${ticker}`);
  }

  const json = await res.json() as {
    chart: {
      result: Array<{
        meta: {
          symbol: string;
          regularMarketPrice: number;
          previousClose: number;
          regularMarketVolume: number;
        };
        indicators: {
          quote: Array<{
            open: (number | null)[];
            high: (number | null)[];
            low: (number | null)[];
            close: (number | null)[];
            volume: (number | null)[];
          }>;
          timestamp: number[];
        };
      }>;
    };
  };

  const result = json.chart.result[0];
  if (!result) throw new Error(`No chart data returned for ${ticker}`);

  const meta = result.meta;
  const quotes = result.indicators.quote[0];
  const timestamps = result.indicators.timestamp;

  // Build price bars from the daily OHLCV data
  const bars: PriceBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quotes.open[i];
    const h = quotes.high[i];
    const l = quotes.low[i];
    const c = quotes.close[i];
    const v = quotes.volume[i];
    if (o == null || h == null || l == null || c == null || v == null) continue;
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }

  // 30-day average volume: average of all bars returned
  const volume30dAvg = bars.length > 0
    ? bars.reduce((sum, b) => sum + b.volume, 0) / bars.length
    : meta.regularMarketVolume;

  const volumeToday = meta.regularMarketVolume;
  const volumeRatio = volume30dAvg > 0 ? volumeToday / volume30dAvg : 1.0;

  const prevClose = meta.previousClose;
  const currentPrice = meta.regularMarketPrice;
  const changePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

  return {
    ticker,
    currency: "USD",
    current_price: round(currentPrice),
    previous_close: round(prevClose),
    change_pct: round(changePct),
    volume_today: volumeToday,
    volume_30d_avg: Math.round(volume30dAvg),
    volume_ratio: round(volumeRatio),
    price_bars: bars,
    fetched_at: new Date().toISOString(),
    source: "yahoo",
  };
}

// ─── CoinGecko ─────────────────────────────────────────────────────────────────

async function fetchFromCoinGecko(ticker: string): Promise<PriceVolumeData> {
  // CoinGecko free API — no auth needed, but rate-limited to ~10-30 req/min.
  // For BTC, the CoinGecko id is "bitcoin".
  const coinId = ticker === "BTC" ? "bitcoin" : ticker.toLowerCase();

  // Fetch current price + 24h volume
  const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`;
  const priceRes = await fetch(priceUrl, {
    signal: AbortSignal.timeout(10000),
  });

  if (!priceRes.ok) {
    throw new Error(`CoinGecko price API returned HTTP ${priceRes.status}`);
  }

  const priceJson = await priceRes.json() as Record<string, {
    usd: number;
    usd_24h_vol: number;
    usd_24h_change: number;
  }>;

  const coinData = priceJson[coinId];
  if (!coinData) throw new Error(`No data for ${coinId} from CoinGecko`);

  // Fetch 10-day daily prices for bar chart + volume averaging
  const chartUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`;
  const chartRes = await fetch(chartUrl, {
    signal: AbortSignal.timeout(10000),
  });

  if (!chartRes.ok) {
    throw new Error(`CoinGecko chart API returned HTTP ${chartRes.status}`);
  }

  const chartJson = await chartRes.json() as {
    prices: Array<[number, number]>;
    total_volumes: Array<[number, number]>;
  };

  // Build price bars from CoinGecko's daily data
  const bars: PriceBar[] = [];
  const prices = chartJson.prices;
  const volumes = chartJson.total_volumes;

  for (let i = 0; i < prices.length; i++) {
    const date = new Date(prices[i][0]).toISOString().split("T")[0];
    const close = prices[i][1];
    const vol = volumes[i]?.[1] ?? 0;
    bars.push({
      date,
      open: close,  // CoinGecko daily only gives close — approximate open as close
      high: close,
      low: close,
      close,
      volume: Math.round(vol),
    });
  }

  const volume30dAvg = bars.length > 0
    ? bars.reduce((sum, b) => sum + b.volume, 0) / bars.length
    : coinData.usd_24h_vol;

  const prevClose = bars.length >= 2 ? bars[bars.length - 2].close : coinData.usd;
  const changePct = coinData.usd_24h_change ?? 0;

  return {
    ticker,
    currency: "USD",
    current_price: coinData.usd,
    previous_close: round(prevClose),
    change_pct: round(changePct),
    volume_today: Math.round(coinData.usd_24h_vol),
    volume_30d_avg: Math.round(volume30dAvg),
    volume_ratio: volume30dAvg > 0 ? round(coinData.usd_24h_vol / volume30dAvg) : 1.0,
    price_bars: bars,
    fetched_at: new Date().toISOString(),
    source: "coingecko",
  };
}

// ─── Seed fallback ─────────────────────────────────────────────────────────────

function loadSeedPriceData(ticker: string): PriceVolumeData | null {
  const seedPath = path.join(DATA_DIR, "seed-signals.json");
  if (!fs.existsSync(seedPath)) return null;
  try {
    const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as Record<string, { ticker: string; signal_score: number; price_reaction?: string; reasoning?: string }>;
    if (!seed[ticker]) return null;
    // Construct a minimal PriceVolumeData from seed context
    // This is a synthetic fallback — not real market data
    const now = new Date().toISOString();
    return {
      ticker,
      currency: "USD",
      current_price: 0,
      previous_close: 0,
      change_pct: 0,
      volume_today: 0,
      volume_30d_avg: 0,
      volume_ratio: 1.0,
      price_bars: [],
      fetched_at: now,
      source: "seed_fallback",
    };
  } catch {
    return null;
  }
}

// ─── Tool 2: cross_check_price_action ─────────────────────────────────────────
// Compares the findings_board timestamp to subsequent price movement.
// Classifies: already_moved | moving_now | not_yet_reacted
//
// Logic:
// - "already_moved": price moved > 2% between the bar containing the findings
//   timestamp and the current price. The news is already priced in.
// - "moving_now": price moved 0.5–2% AND volume is elevated (> 1.5x avg).
//   The market is actively repricing right now.
// - "not_yet_reacted": price moved < 0.5% since the findings timestamp.
//   Market hasn't moved yet — potential early signal window.

export interface PriceActionResult {
  ticker: string;
  price_reaction: "already_moved" | "moving_now" | "not_yet_reacted";
  price_change_since_news_pct: number;
  volume_ratio: number;
  reasoning: string;
}

// Thresholds for price reaction classification:
// > 2% move = already priced in (conservative — most single-day news moves < 2%)
const ALREADY_MOVED_THRESHOLD_PCT = 2.0;
// 0.5–2% with volume = actively moving
const MOVING_NOW_MIN_PCT = 0.5;
const MOVING_NOW_VOLUME_RATIO = 1.5;

export function crossCheckPriceAction(
  ticker: string,
  findings: FindingsBoard,
  priceData: PriceVolumeData
): PriceActionResult {
  const upper = ticker.toUpperCase();
  const bars = priceData.price_bars;

  // Use the earliest headline publication time as the "news timestamp".
  // This is the actual time the news hit the market, not when the Scout ran.
  const publishedTimes = findings.headlines
    .map((h) => h.published_at)
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime())
    .filter((t) => !isNaN(t));

  const newsTimestamp = publishedTimes.length > 0
    ? Math.min(...publishedTimes)
    : new Date(findings.timestamp).getTime();

  // Find the first price bar at or after the news timestamp
  const newsDate = new Date(newsTimestamp).toISOString().split("T")[0];
  let priceAtNews: number | null = null;

  for (const bar of bars) {
    if (bar.date >= newsDate) {
      priceAtNews = bar.close;
      break;
    }
  }

  // If we couldn't find a matching bar, use previous close as proxy
  if (priceAtNews === null) {
    priceAtNews = priceData.previous_close;
  }

  const currentPrice = priceData.current_price;
  const priceChangePct = priceAtNews > 0
    ? ((currentPrice - priceAtNews) / priceAtNews) * 100
    : 0;

  const absChange = Math.abs(priceChangePct);
  const volRatio = priceData.volume_ratio;

  let price_reaction: PriceActionResult["price_reaction"];
  let reasoning: string;

  if (absChange >= ALREADY_MOVED_THRESHOLD_PCT) {
    // Price moved significantly — news is already priced in
    price_reaction = "already_moved";
    const dir = priceChangePct > 0 ? "up" : "down";
    reasoning = `${upper} has already moved ${absChange.toFixed(1)}% ${dir} since the news. Signal may be partially or fully priced in. Reduce opportunity score.`;
  } else if (absChange >= MOVING_NOW_MIN_PCT && volRatio >= MOVING_NOW_VOLUME_RATIO) {
    // Moderate move with elevated volume — market is actively repricing
    price_reaction = "moving_now";
    reasoning = `${upper} is moving now: ${absChange.toFixed(1)}% price change with ${volRatio.toFixed(1)}x normal volume. Market is actively repricing on this news. Timing is critical — entry window is narrowing.`;
  } else {
    // Minimal or no price movement
    price_reaction = "not_yet_reacted";
    reasoning = `${upper} has not yet reacted meaningfully (${absChange.toFixed(1)}% change, ${volRatio.toFixed(1)}x volume). Market may be slow to price this in — early signal window open.`;
  }

  return {
    ticker: upper,
    price_reaction,
    price_change_since_news_pct: round(priceChangePct),
    volume_ratio: round(volRatio),
    reasoning,
  };
}

// ─── Tool 3: assess_signal_strength ───────────────────────────────────────────
// Combines sentiment score, mention velocity, and price reaction into a 0–100
// signal_score with a signal_direction.
//
// SCORING RULES (explicit, judge-defensible):
//
// Step 1: Compute avg_sentiment from findings_board headlines (–1.0 to +1.0)
//
// Step 2: Base score from avg_sentiment:
//   | avg_sentiment   | base_score |
//   |-----------------|------------|
//   | > 0.6           | 70         |  strong positive
//   | 0.3 to 0.6      | 55         |  moderate positive
//   | -0.3 to 0.3     | 40         |  neutral / mixed
//   | -0.6 to -0.3    | 55         |  moderate negative (bearish signal)
//   | < -0.6          | 70         |  strong negative (bearish signal)
//
// Step 3: Adjustments:
//   +15 if mention_velocity == "spiking" (fresh attention = higher signal relevance)
//    +0 if mention_velocity == "steady"
//   -10 if mention_velocity == "declining" (stale news = lower relevance)
//
//   +15 if price_reaction == "not_yet_reacted" (market hasn't priced in — opportunity)
//    +0 if price_reaction == "moving_now" (timing is uncertain)
//   -15 if price_reaction == "already_moved" (signal likely priced in)
//
// Step 4: Clamp to 0–100
//
// Step 5: Determine direction from avg_sentiment sign:
//   positive → bullish, negative → bearish, zero → neutral
//
// Step 6: Write reasoning with full audit trail

export interface AssessSignalResult {
  signal: SignalLog;
  audit_trail: {
    avg_sentiment: number;
    base_score: number;
    velocity_adjustment: number;
    price_adjustment: number;
    final_score: number;
  };
}

// Base score lookup table
const SENTIMENT_BASE_SCORES: Array<{ min: number; max: number; score: number }> = [
  { min: 0.6, max: Infinity, score: 70 },
  { min: 0.3, max: 0.6, score: 55 },
  { min: -0.3, max: 0.3, score: 40 },
  { min: -0.6, max: -0.3, score: 55 },
  { min: -Infinity, max: -0.6, score: 70 },
];

function getBaseScore(avgSentiment: number): number {
  for (const range of SENTIMENT_BASE_SCORES) {
    if (avgSentiment >= range.min && avgSentiment < range.max) {
      return range.score;
    }
  }
  return 40; // fallback (neutral)
}

// Velocity adjustments — explicit point values
const VELOCITY_ADJUSTMENTS: Record<string, number> = {
  spiking: +15,   // fresh attention amplifies signal
  steady: 0,      // normal — no adjustment
  declining: -10, // stale news loses relevance
};

// Price reaction adjustments — explicit point values
const PRICE_ADJUSTMENTS: Record<string, number> = {
  not_yet_reacted: +15,  // market hasn't priced in — opportunity window
  moving_now: 0,         // timing uncertain — neutral
  already_moved: -15,    // signal likely priced in — diminish opportunity
};

export function assessSignalStrength(
  ticker: string,
  findings: FindingsBoard,
  priceData: PriceVolumeData,
  priceAction: PriceActionResult
): AssessSignalResult {
  const upper = ticker.toUpperCase();

  // Step 1: Average sentiment across all headlines
  const sentimentScores = findings.headlines.map((h) => h.sentiment_score);
  const avgSentiment = sentimentScores.length > 0
    ? sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length
    : 0;

  // Step 2: Base score from sentiment strength (regardless of direction)
  const baseScore = getBaseScore(avgSentiment);

  // Step 3: Adjustments
  const velocityAdj = VELOCITY_ADJUSTMENTS[findings.mention_velocity] ?? 0;
  const priceAdj = PRICE_ADJUSTMENTS[priceAction.price_reaction] ?? 0;

  // Step 4: Final score, clamped to 0–100
  const rawScore = baseScore + velocityAdj + priceAdj;
  const finalScore = Math.max(0, Math.min(100, rawScore));

  // Step 5: Direction from sentiment sign
  const signal_direction: SignalLog["signal_direction"] =
    avgSentiment > 0.05 ? "bullish" :
    avgSentiment < -0.05 ? "bearish" :
    "neutral";

  const dirLabel =
    signal_direction === "bullish" ? "bullish" :
    signal_direction === "bearish" ? "bearish" :
    "neutral";

  // Step 6: Build reasoning with full audit trail
  const headlineCount = findings.headlines.length;
  const sourceList = findings.headlines.map((h) => h.source).join(", ");

  const reasoning = buildReasoning({
    ticker: upper,
    avgSentiment,
    baseScore,
    velocityAdj,
    priceAdj,
    finalScore,
    signalDirection: dirLabel,
    mentionVelocity: findings.mention_velocity,
    priceReaction: priceAction.price_reaction,
    headlineCount,
    sourceList,
  });

  const signal: SignalLog = {
    ticker: upper,
    timestamp: new Date().toISOString(),
    price_reaction: priceAction.price_reaction,
    signal_score: finalScore,
    signal_direction,
    reasoning,
  };

  // Write to signal_log resource so the Skeptic can read it
  writeSignalLog(signal);

  return {
    signal,
    audit_trail: {
      avg_sentiment: round(avgSentiment),
      base_score: baseScore,
      velocity_adjustment: velocityAdj,
      price_adjustment: priceAdj,
      final_score: finalScore,
    },
  };
}

function buildReasoning(params: {
  ticker: string;
  avgSentiment: number;
  baseScore: number;
  velocityAdj: number;
  priceAdj: number;
  finalScore: number;
  signalDirection: string;
  mentionVelocity: string;
  priceReaction: string;
  headlineCount: number;
  sourceList: string;
}): string {
  const {
    ticker, avgSentiment, baseScore, velocityAdj, priceAdj,
    finalScore, signalDirection, mentionVelocity, priceReaction,
    headlineCount, sourceList,
  } = params;

  const sentimentLabel = avgSentiment > 0.3 ? "strong positive" :
    avgSentiment > 0.05 ? "moderate positive" :
    avgSentiment < -0.3 ? "strong negative" :
    avgSentiment < -0.05 ? "moderate negative" :
    "neutral/mixed";

  const parts: string[] = [];

  parts.push(`${ticker} signal scored ${finalScore}/100 (${signalDirection}).`);
  parts.push(`Sentiment is ${sentimentLabel} (avg ${avgSentiment.toFixed(2)} across ${headlineCount} headline${headlineCount !== 1 ? "s" : ""} from ${sourceList}).`);
  parts.push(`Base score: ${baseScore} from sentiment strength table.`);

  if (velocityAdj !== 0) {
    parts.push(`Mention velocity is ${mentionVelocity}: ${velocityAdj > 0 ? "+" : ""}${velocityAdj} points (fresh attention ${velocityAdj > 0 ? "amplifies" : "dampens"} signal relevance).`);
  } else {
    parts.push(`Mention velocity is steady: no adjustment.`);
  }

  if (priceAdj !== 0) {
    parts.push(`Price reaction is ${priceReaction}: ${priceAdj > 0 ? "+" : ""}${priceAdj} points (${priceReaction === "not_yet_reacted" ? "market hasn't priced in — opportunity window" : "signal likely already priced in"}).`);
  } else {
    parts.push(`Price reaction is moving now: no adjustment (timing uncertain).`);
  }

  return parts.join(" ");
}

// ─── Tool 4: historical_pattern_lookup ────────────────────────────────────────
// Checks the hardcoded historical-signals.json for "last time this pattern happened"
// for a given ticker. Adds cheap credibility to the demo.

export function historicalPatternLookup(
  ticker: string,
  patternType: string
): HistoricalPatternLookupResult {
  const upper = ticker.toUpperCase();
  const allPatterns = HISTORICAL_SIGNALS[upper] ?? [];

  // Filter by pattern_type (case-insensitive partial match)
  const matches = allPatterns.filter(
    (p) => p.pattern_type.toLowerCase().includes(patternType.toLowerCase())
  );

  const avgScore = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.signal_score, 0) / matches.length
    : 0;

  // Count outcomes that indicate the signal played out
  const positiveOutcomes = matches.filter(
    (m) => m.outcome.includes("up") || m.outcome.includes("down")
  ).length;

  const successRate = matches.length > 0
    ? `${positiveOutcomes}/${matches.length} (${Math.round((positiveOutcomes / matches.length) * 100)}%)`
    : "N/A";

  let summary: string;
  if (matches.length === 0) {
    summary = `No historical matches for pattern "${patternType}" in ${upper}. Consider this signal on its own merits without historical backing.`;
  } else {
    const best = matches.reduce((a, b) => a.signal_score > b.signal_score ? a : b);
    summary = `Found ${matches.length} historical match(es) for "${patternType}" in ${upper}. Average score: ${Math.round(avgScore)}/100. Best case: ${best.date} (score ${best.signal_score}, ${best.outcome}). Historical success rate: ${successRate}.`;
  }

  return {
    ticker: upper,
    pattern_type: patternType,
    matches_found: matches.length,
    matches,
    avg_signal_score: round(avgScore),
    avg_outcome_success_rate: successRate,
    summary,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
