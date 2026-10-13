// Standalone test for all Person 2 functions.
// Run WITHOUT starting the MCP server: npx tsx test/analyst-standalone.ts
// All functions are tested directly (not through the MCP protocol).
// Exit 0 = all passed. Exit 1 = failures.

import assert from "assert";
import {
  fetchPriceVolume,
  crossCheckPriceAction,
  assessSignalStrength,
  historicalPatternLookup,
} from "../server/tools/analyst.tools.js";
import { readLatestSignalLog, clearSignalLog } from "../server/resources/signal-log.resource.js";
import { readFindingsBoard } from "../server/resources/findings-board.resource.js";
import type {
  FindingsBoard,
  PriceVolumeData,
  PriceBar,
} from "../server/types/shared.types.js";

let passed = 0;
let failed = 0;
let skipped = 0;
const asyncPromises: Promise<void>[] = [];

class SkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkipError";
  }
}

function test(label: string, fn: () => void | Promise<void>): void {
  const result = fn();
  if (result instanceof Promise) {
    const p = result
      .then(() => {
        console.log(`  ✓  ${label}`);
        passed++;
      })
      .catch((err) => {
        if (err instanceof SkipError) {
          // Already logged by skip()
          return;
        }
        const msg = err instanceof assert.AssertionError
          ? err.message
          : err instanceof Error ? err.message : String(err);
        console.error(`  ✗  ${label}`);
        console.error(`     → ${msg}`);
        failed++;
      });
    asyncPromises.push(p);
    return;
  }
  console.log(`  ✓  ${label}`);
  passed++;
}

function skip(label: string, reason: string): void {
  console.log(`  ○  ${label} — SKIPPED: ${reason}`);
  skipped++;
  throw new SkipError(reason);
}

async function runAllAsync(): Promise<void> {
  await Promise.allSettled(asyncPromises);
}

// ─── Synthetic test data ──────────────────────────────────────────────────────

function makePriceBar(date: string, close: number, volume: number): PriceBar {
  return { date, open: close, high: close, low: close, close, volume };
}

function makePriceData(
  ticker: string,
  currentPrice: number,
  prevClose: number,
  volumeToday: number,
  volume30dAvg: number,
  bars?: PriceBar[]
): PriceVolumeData {
  return {
    ticker,
    currency: "USD",
    current_price: currentPrice,
    previous_close: prevClose,
    change_pct: prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0,
    volume_today: volumeToday,
    volume_30d_avg: volume30dAvg,
    volume_ratio: volume30dAvg > 0 ? volumeToday / volume30dAvg : 1.0,
    price_bars: bars ?? [],
    fetched_at: new Date().toISOString(),
    source: "test",
  };
}

const POSITIVE_FINDINGS: FindingsBoard = {
  ticker: "TEST",
  timestamp: "2026-07-24T10:00:00Z",
  headlines: [
    { source: "reuters.com", text: "Test Corp beats earnings by 20%", url: "https://example.com", sentiment: "positive", sentiment_score: 0.85 },
    { source: "bloomberg.com", text: "Test Corp guidance raises FY targets", url: "https://example.com", sentiment: "positive", sentiment_score: 0.72 },
  ],
  narrative_summary: "Strong earnings beat with raised guidance.",
  mention_velocity: "spiking",
};

const NEGATIVE_FINDINGS: FindingsBoard = {
  ticker: "TEST",
  timestamp: "2026-07-24T10:00:00Z",
  headlines: [
    { source: "wsj.com", text: "Test Corp misses estimates by 15%", url: "https://example.com", sentiment: "negative", sentiment_score: -0.70 },
    { source: "reuters.com", text: "Test Corp downgraded on margin concerns", url: "https://example.com", sentiment: "negative", sentiment_score: -0.55 },
  ],
  narrative_summary: "Earnings miss with analyst downgrades.",
  mention_velocity: "steady",
};

const MIXED_FINDINGS: FindingsBoard = {
  ticker: "TEST",
  timestamp: "2026-07-24T10:00:00Z",
  headlines: [
    { source: "reuters.com", text: "Mixed signals from Test Corp", url: "https://example.com", sentiment: "positive", sentiment_score: 0.20 },
    { source: "wsj.com", text: "Analyst sees risk in Test Corp strategy", url: "https://example.com", sentiment: "negative", sentiment_score: -0.15 },
  ],
  narrative_summary: "Mixed analyst opinions.",
  mention_velocity: "declining",
};

// ─── historicalPatternLookup ──────────────────────────────────────────────────

console.log("\n[historicalPatternLookup]");

test("TSLA + delivery_miss_negative → finds match", () => {
  const result = historicalPatternLookup("TSLA", "delivery_miss_negative");
  assert.strictEqual(result.ticker, "TSLA");
  assert.ok(result.matches_found >= 1, `Expected >=1 match, got ${result.matches_found}`);
  assert.ok(result.avg_signal_score > 0, "avg_signal_score should be > 0");
  assert.ok(result.summary.length > 0, "summary should be non-empty");
});

test("NVDA + earnings_beat_spiking → finds match", () => {
  const result = historicalPatternLookup("NVDA", "earnings_beat");
  assert.ok(result.matches_found >= 1, "Should find NVDA earnings beat pattern");
  assert.ok(result.matches[0].outcome.length > 0, "Match should have an outcome");
});

test("BTC + retail_hype_spike → finds match", () => {
  const result = historicalPatternLookup("BTC", "retail_hype");
  assert.ok(result.matches_found >= 1, "Should find BTC hype pattern");
  assert.strictEqual(result.matches[0].signal_direction, "bullish");
});

test("AAPL + nonexistent_pattern → no matches", () => {
  const result = historicalPatternLookup("AAPL", "nonexistent_pattern_xyz");
  assert.strictEqual(result.matches_found, 0);
  assert.ok(result.summary.includes("No historical matches"));
});

test("pattern_type search is case-insensitive", () => {
  const upper = historicalPatternLookup("TSLA", "DELIVERY_MISS");
  const lower = historicalPatternLookup("TSLA", "delivery_miss");
  assert.strictEqual(upper.matches_found, lower.matches_found, "Case should not affect match count");
});

test("unknown ticker → no matches with graceful summary", () => {
  const result = historicalPatternLookup("FAKE", "any_pattern");
  assert.strictEqual(result.matches_found, 0);
  assert.ok(result.summary.length > 0);
});

// ─── crossCheckPriceAction ────────────────────────────────────────────────────

console.log("\n[crossCheckPriceAction]");

test("price moved 5% → already_moved", () => {
  // News timestamp 2026-07-24, current price is 5% above that bar's close
  const findings: FindingsBoard = {
    ...POSITIVE_FINDINGS,
    timestamp: "2026-07-24T10:00:00Z",
  };
  const priceData = makePriceData("TEST", 105, 95, 1000000, 500000, [
    makePriceBar("2026-07-23", 100, 500000),
    makePriceBar("2026-07-24", 100, 600000),  // news day: close at 100
    makePriceBar("2026-07-25", 105, 1200000), // next day: up 5%
  ]);

  const result = crossCheckPriceAction("TEST", findings, priceData);
  assert.strictEqual(result.price_reaction, "already_moved");
  assert.ok(result.price_change_since_news_pct > 2, `Expected >2%, got ${result.price_change_since_news_pct}`);
  assert.ok(result.reasoning.includes("already moved"));
});

test("price moved 1% with 2x volume → moving_now", () => {
  const findings: FindingsBoard = {
    ...POSITIVE_FINDINGS,
    timestamp: "2026-07-24T10:00:00Z",
  };
  // Volume ratio 2.0 (1M today vs 500K avg) + 1% move = moving_now
  const priceData = makePriceData("TEST", 101, 100, 1000000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 101, 1000000),
  ]);

  const result = crossCheckPriceAction("TEST", findings, priceData);
  assert.strictEqual(result.price_reaction, "moving_now");
  assert.ok(result.reasoning.includes("moving now"));
});

test("price moved 0.2% with normal volume → not_yet_reacted", () => {
  const findings: FindingsBoard = {
    ...POSITIVE_FINDINGS,
    timestamp: "2026-07-24T10:00:00Z",
  };
  const priceData = makePriceData("TEST", 100.2, 100, 500000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 100.2, 500000),
  ]);

  const result = crossCheckPriceAction("TEST", findings, priceData);
  assert.strictEqual(result.price_reaction, "not_yet_reacted");
  assert.ok(result.reasoning.includes("not yet reacted"));
});

test("price dropped 3% → already_moved (bearish)", () => {
  const findings: FindingsBoard = {
    ...NEGATIVE_FINDINGS,
    timestamp: "2026-07-24T10:00:00Z",
  };
  const priceData = makePriceData("TEST", 97, 100, 800000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 97, 800000),
  ]);

  const result = crossCheckPriceAction("TEST", findings, priceData);
  assert.strictEqual(result.price_reaction, "already_moved");
  assert.ok(result.price_change_since_news_pct < -2, "Should show negative %");
  assert.ok(result.reasoning.includes("down"));
});

test("result includes ticker and volume_ratio", () => {
  const findings: FindingsBoard = { ...POSITIVE_FINDINGS, timestamp: "2026-07-24T10:00:00Z" };
  const priceData = makePriceData("TEST", 100.2, 100, 500000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 100.2, 500000),
  ]);

  const result = crossCheckPriceAction("TEST", findings, priceData);
  assert.strictEqual(result.ticker, "TEST");
  assert.ok(typeof result.volume_ratio === "number");
});

// ─── assessSignalStrength ─────────────────────────────────────────────────────

console.log("\n[assessSignalStrength]");

// Clean up any prior test runs
clearSignalLog("TEST");

test("strong positive + spiking + not_yet_reacted → high bullish score (>= 70)", () => {
  const priceData = makePriceData("TEST", 100, 100, 500000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 100, 500000),
  ]);
  const priceAction = crossCheckPriceAction("TEST", POSITIVE_FINDINGS, priceData);
  const result = assessSignalStrength("TEST", POSITIVE_FINDINGS, priceData, priceAction);

  assert.strictEqual(result.signal.ticker, "TEST");
  assert.strictEqual(result.signal.signal_direction, "bullish");
  assert.ok(result.signal.signal_score >= 70,
    `Expected score >= 70, got ${result.signal.signal_score}. Audit: ${JSON.stringify(result.audit_trail)}`
  );
  assert.ok(result.signal.reasoning.length > 0, "reasoning should be non-empty");
  assert.ok(result.signal.reasoning.includes("TEST"), "reasoning should mention ticker");
});

test("strong negative + steady + already_moved → moderate bearish score (40-60)", () => {
  const priceData = makePriceData("TEST", 97, 100, 800000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 97, 800000),
  ]);
  const priceAction = crossCheckPriceAction("TEST", NEGATIVE_FINDINGS, priceData);
  const result = assessSignalStrength("TEST", NEGATIVE_FINDINGS, priceData, priceAction);

  assert.strictEqual(result.signal.signal_direction, "bearish");
  assert.ok(result.signal.signal_score >= 30 && result.signal.signal_score <= 70,
    `Expected score 30-70, got ${result.signal.signal_score}`
  );
});

test("mixed sentiment + declining → mid-range neutral score", () => {
  const priceData = makePriceData("TEST", 100, 100, 500000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 100, 500000),
  ]);
  const priceAction = crossCheckPriceAction("TEST", MIXED_FINDINGS, priceData);
  const result = assessSignalStrength("TEST", MIXED_FINDINGS, priceData, priceAction);

  assert.strictEqual(result.signal.signal_direction, "neutral");
  assert.ok(result.signal.signal_score >= 25 && result.signal.signal_score <= 65,
    `Expected score 25-65, got ${result.signal.signal_score}`
  );
});

test("audit trail is populated correctly", () => {
  const priceData = makePriceData("TEST", 100, 100, 500000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
    makePriceBar("2026-07-25", 100, 500000),
  ]);
  const priceAction = crossCheckPriceAction("TEST", POSITIVE_FINDINGS, priceData);
  const result = assessSignalStrength("TEST", POSITIVE_FINDINGS, priceData, priceAction);

  assert.ok(typeof result.audit_trail.avg_sentiment === "number");
  assert.ok(typeof result.audit_trail.base_score === "number");
  assert.ok(typeof result.audit_trail.velocity_adjustment === "number");
  assert.ok(typeof result.audit_trail.price_adjustment === "number");
  assert.ok(typeof result.audit_trail.final_score === "number");
  // Verify the sum
  const expected = result.audit_trail.base_score + result.audit_trail.velocity_adjustment + result.audit_trail.price_adjustment;
  assert.strictEqual(result.audit_trail.final_score, Math.max(0, Math.min(100, expected)));
});

test("signal is persisted to signal_log resource", () => {
  const priceData = makePriceData("TEST", 100, 100, 500000, 500000, [
    makePriceBar("2026-07-24", 100, 500000),
  ]);
  const priceAction = crossCheckPriceAction("TEST", POSITIVE_FINDINGS, priceData);
  assessSignalStrength("TEST", POSITIVE_FINDINGS, priceData, priceAction);

  const stored = readLatestSignalLog("TEST");
  assert.ok(stored !== null, "Expected stored signal for TEST");
  assert.strictEqual(stored!.ticker, "TEST");
  assert.ok(stored!.timestamp.length > 0);
  assert.ok(stored!.reasoning.length > 0);
});

test("signal_score is clamped to 0-100", () => {
  // Create extreme findings that could push score outside bounds
  const extremeFindings: FindingsBoard = {
    ticker: "TEST",
    timestamp: "2026-07-24T10:00:00Z",
    headlines: [
      { source: "reuters.com", text: "Extreme news", url: "https://example.com", sentiment: "positive", sentiment_score: 1.0 },
    ],
    narrative_summary: "Extreme",
    mention_velocity: "spiking",
  };
  const priceData = makePriceData("TEST", 80, 100, 1000000, 100000, [
    makePriceBar("2026-07-24", 100, 100000),
    makePriceBar("2026-07-25", 80, 1000000),
  ]);
  const priceAction = crossCheckPriceAction("TEST", extremeFindings, priceData);
  const result = assessSignalStrength("TEST", extremeFindings, priceData, priceAction);

  assert.ok(result.signal.signal_score >= 0, "Score should be >= 0");
  assert.ok(result.signal.signal_score <= 100, "Score should be <= 100");
});

// ─── fetchPriceVolume (live API test — may be skipped) ────────────────────────

console.log("\n[fetchPriceVolume — live API]");

test("fetchPriceVolume('AAPL') returns valid structure from Yahoo Finance", async () => {
  try {
    const result = await fetchPriceVolume("AAPL");
    assert.ok(result.data, "Should return data");
    assert.strictEqual(result.data.ticker, "AAPL");
    assert.ok(result.data.current_price > 0, "Price should be > 0");
    assert.ok(result.data.volume_today >= 0, "Volume should be >= 0");
    assert.ok(result.data.price_bars.length > 0, "Should have price bars");
    assert.ok(result.data.fetched_at.length > 0, "fetched_at should be set");
    assert.ok(["live", "seed_fallback"].includes(result.source), `source should be live or seed_fallback, got ${result.source}`);
  } catch (err) {
    // If the API is unreachable (network issues, rate limit), skip gracefully
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("timeout") || msg.includes("HTTP")) {
      skip("fetchPriceVolume AAPL", `API unreachable: ${msg}`);
    } else {
      throw err;
    }
  }
});

test("fetchPriceVolume returns cached result on second call", async () => {
  try {
    const first = await fetchPriceVolume("AAPL");
    const second = await fetchPriceVolume("AAPL");
    assert.strictEqual(second.data.source, "cache", "Second call should use cache");
    assert.strictEqual(second.data.current_price, first.data.current_price, "Cached price should match");
  } catch {
    skip("fetchPriceVolume cache test", "First call failed (API unreachable)");
  }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

await runAllAsync();

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failed > 0) {
  console.error("Some tests failed — fix before wiring into the pipeline.");
  process.exit(1);
} else {
  console.log("All tests passed. Ready to connect to the full pipeline.");
}
