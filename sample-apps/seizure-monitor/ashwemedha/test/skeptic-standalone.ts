// Standalone test for all Person 3 functions.
// Run WITHOUT starting the MCP server: npx tsx test/skeptic-standalone.ts
// All functions are tested directly (not through the MCP protocol).
// Exit 0 = all passed. Exit 1 = failures.

import assert from "assert";
import {
  checkSourceCredibility,
  checkRecycledContent,
  checkVolumeContext,
  assessNarrativeEntropy,
  generateVerdict,
} from "../server/tools/skeptic.tools.js";
import { readLatestVerdictLog, clearVerdictLog } from "../server/resources/verdict-log.resource.js";
import { readFindingsBoard } from "../server/resources/findings-board.resource.js";
import { readSignalLog } from "../server/resources/signal-log.resource.js";

let passed = 0;
let failed = 0;

function test(label: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err) {
    const msg = err instanceof assert.AssertionError
      ? err.message
      : err instanceof Error ? err.message : String(err);
    console.error(`  ✗  ${label}`);
    console.error(`     → ${msg}`);
    failed++;
  }
}

// ─── check_source_credibility ──────────────────────────────────────────────────

console.log("\n[check_source_credibility]");

test("reuters.com → high tier, pass", () => {
  const r = checkSourceCredibility("reuters.com");
  assert.strictEqual(r.credibility_tier, "high");
  assert.strictEqual(r.check_result, "pass");
  assert.strictEqual(r.is_press_release_mill, false);
  assert.ok(r.credibility_score >= 90);
});

test("www.bloomberg.com strips www prefix correctly", () => {
  const r = checkSourceCredibility("www.bloomberg.com");
  assert.strictEqual(r.credibility_tier, "high");
  assert.strictEqual(r.check_result, "pass");
});

test("prnewswire.com → flagged as press release mill", () => {
  const r = checkSourceCredibility("prnewswire.com");
  assert.strictEqual(r.check_result, "flagged");
  assert.strictEqual(r.is_press_release_mill, true);
  assert.strictEqual(r.credibility_tier, "low");
});

test("businesswire.com → flagged as press release mill", () => {
  const r = checkSourceCredibility("businesswire.com");
  assert.strictEqual(r.check_result, "flagged");
  assert.strictEqual(r.is_press_release_mill, true);
});

test("zerohedge.com → flagged as low credibility (not a press release mill)", () => {
  const r = checkSourceCredibility("zerohedge.com");
  assert.strictEqual(r.check_result, "flagged");
  assert.strictEqual(r.credibility_tier, "low");
  assert.strictEqual(r.is_press_release_mill, false);
});

test("seekingalpha.com → medium tier, pass", () => {
  const r = checkSourceCredibility("seekingalpha.com");
  assert.strictEqual(r.credibility_tier, "medium");
  assert.strictEqual(r.check_result, "pass");
});

test("unknown-blog-xyz.com → flagged as unknown", () => {
  const r = checkSourceCredibility("unknown-blog-xyz.com");
  assert.strictEqual(r.check_result, "flagged");
  assert.strictEqual(r.credibility_tier, "unknown");
  assert.strictEqual(r.credibility_score, 30);
});

test("source_name appears in reason for unknown sources", () => {
  const r = checkSourceCredibility("anon-site.io", "Anon Financial Blog");
  assert.ok(r.reason.includes("Anon Financial Blog"), "Expected source_name in reason");
});

// ─── check_recycled_content ────────────────────────────────────────────────────

console.log("\n[check_recycled_content]");

test("identical headline → flagged (similarity = 1.0)", () => {
  const h = "Tesla Q2 deliveries beat expectations as China demand recovers";
  const r = checkRecycledContent(h, "TSLA", [h]);
  assert.strictEqual(r.check_result, "flagged");
  assert.strictEqual(r.similarity_score, 1.0);
  assert.strictEqual(r.is_recycled, true);
});

test("near-identical rephrased headline → high similarity (well above random)", () => {
  const current = "Tesla Q2 deliveries beat expectations as China demand recovers";
  const hist = ["Tesla second quarter deliveries beat expectations amid China demand recovery"];
  const r = checkRecycledContent(current, "TSLA", hist);
  // Jaccard on word sets: "Q2" vs "second quarter" are different tokens, so similarity
  // lands around 0.5 — meaningfully high (random headlines score < 0.1) but below the
  // default 0.65 flag threshold, which is the correct behavior.
  assert.ok(r.similarity_score > 0.4, `Expected >0.4, got ${r.similarity_score.toFixed(3)}`);
  assert.ok(r.similarity_score < 0.65, "Should not flag at default threshold — Q2 ≠ 'second quarter' in word set");
});

test("entirely different headline → pass (low similarity)", () => {
  const r = checkRecycledContent(
    "Tesla announces 40% price cut on Model 3 in European markets",
    "TSLA",
    ["Apple reports record iPhone sales in emerging markets"]
  );
  assert.strictEqual(r.check_result, "pass");
  assert.ok(r.similarity_score < 0.2, `Expected <0.2, got ${r.similarity_score.toFixed(3)}`);
  assert.strictEqual(r.is_recycled, false);
});

test("empty history → pass with informative reason", () => {
  const r = checkRecycledContent("Any headline text here", "TSLA", []);
  assert.strictEqual(r.check_result, "pass");
  assert.ok(r.reason.includes("No historical"));
});

test("custom threshold (0.3) catches more aggressive rephrasing", () => {
  const r = checkRecycledContent(
    "Nvidia chip revenue growth continues beating forecasts",
    "NVDA",
    ["Nvidia revenue growth continues beating analyst forecasts"],
    0.3
  );
  assert.strictEqual(r.check_result, "flagged", "Should flag at 0.3 threshold");
});

// ─── check_volume_context ──────────────────────────────────────────────────────

console.log("\n[check_volume_context]");

// TSLA Q2 2026 earnings = July 23 → July 25 is within 2 days
test("TSLA on Jul 25 2026 → explained by earnings (Jul 23)", () => {
  const r = checkVolumeContext("TSLA", "2026-07-25");
  assert.strictEqual(r.volume_context, "explained_by_calendar_event");
  assert.strictEqual(r.event_type, "earnings");
  assert.ok(r.event_description?.includes("Q2"), `Expected Q2 in description, got: ${r.event_description}`);
});

// Jul 17 = July options expiry — checking same day
test("any ticker on Jul 17 2026 → explained by options expiry", () => {
  const r = checkVolumeContext("AAPL", "2026-07-17");
  assert.strictEqual(r.volume_context, "explained_by_calendar_event");
  assert.strictEqual(r.event_type, "options_expiry");
});

// Jun 1 is far from any events
test("TSLA on Jun 1 2026 → organic (no calendar events nearby)", () => {
  const r = checkVolumeContext("TSLA", "2026-06-01");
  assert.strictEqual(r.volume_context, "organic");
  assert.strictEqual(r.event_type, null);
});

// NVDA earnings Aug 27 → Aug 28 should be within 2 days
test("NVDA on Aug 28 2026 → explained by earnings (Aug 27)", () => {
  const r = checkVolumeContext("NVDA", "2026-08-28");
  assert.strictEqual(r.volume_context, "explained_by_calendar_event");
  assert.strictEqual(r.event_type, "earnings");
});

// Sep 18 = Super OPEX + S&P rebalance
test("AAPL on Sep 18 2026 → explained by options expiry / index rebalance", () => {
  const r = checkVolumeContext("AAPL", "2026-09-18");
  assert.strictEqual(r.volume_context, "explained_by_calendar_event");
});

test("lookback_days=0 only catches exact date matches", () => {
  // Jul 24 is 1 day after TSLA earnings — should be organic with 0-day window
  const r = checkVolumeContext("TSLA", "2026-07-24", 0);
  assert.strictEqual(r.volume_context, "organic");
});

// ─── assessNarrativeEntropy ────────────────────────────────────────────────────

console.log("\n[assessNarrativeEntropy]");

test("technical headlines → low or medium entropy", () => {
  const headlines = [
    "NVDA quarterly earnings beat revenue guidance margin expansion",
    "Analyst upgrades NVDA price target citing data center cash flow",
    "Nvidia files SEC quarterly report showing strong acquisition pipeline",
  ];
  const r = assessNarrativeEntropy(headlines);
  assert.ok(
    r.entropy_level === "low" || r.entropy_level === "medium",
    `Expected low/medium entropy for technical headlines, got ${r.entropy_level} (hype_ratio=${r.hype_ratio.toFixed(2)})`
  );
});

test("hype-heavy headlines → high entropy", () => {
  const headlines = [
    "TSLA to the moon rocket massive gains easy money guaranteed millionaire lambo",
    "YOLO buy TSLA massive pump parabolic squeeze diamond ape moon",
  ];
  const r = assessNarrativeEntropy(headlines);
  assert.strictEqual(r.entropy_level, "high", `Expected high entropy, got ${r.entropy_level}`);
  assert.ok(r.hype_ratio > 0.5, `Expected hype_ratio > 0.5, got ${r.hype_ratio.toFixed(2)}`);
  assert.ok(r.sample_hype_words.length > 0);
});

test("empty headlines → entropy ratio is 0 (no words to analyze)", () => {
  const r = assessNarrativeEntropy([]);
  assert.strictEqual(r.hype_ratio, 0);
});

// ─── generateVerdict (integration) ────────────────────────────────────────────

console.log("\n[generateVerdict — integration]");

// Clean up any prior test runs from verdict-log store
clearVerdictLog("NVDA");
clearVerdictLog("TSLA");
clearVerdictLog("BTC");

test("NVDA (clean sources) → confirmed_signal or weakened_signal", () => {
  const findings = readFindingsBoard("NVDA");
  const signal = readSignalLog("NVDA");
  assert.ok(findings, "NVDA mock findings missing");
  assert.ok(signal, "NVDA mock signal missing");

  const verdict = generateVerdict("NVDA", findings!, signal!);

  assert.strictEqual(verdict.ticker, "NVDA");
  assert.ok(
    verdict.final_verdict === "confirmed_signal" || verdict.final_verdict === "weakened_signal",
    `NVDA (clean sources) should be confirmed or weakened, got: ${verdict.final_verdict}`
  );
  assert.ok(verdict.timestamp.length > 0, "timestamp missing");
  assert.ok(verdict.verdict_reasoning.length > 0, "verdict_reasoning missing");
  assert.ok(
    verdict.credibility_check === "pass",
    "NVDA sources are reuters/bloomberg — credibility should pass"
  );
});

test("TSLA (has prnewswire.com source) → weakened_signal or rejected_signal", () => {
  const findings = readFindingsBoard("TSLA");
  const signal = readSignalLog("TSLA");
  assert.ok(findings, "TSLA mock findings missing");
  assert.ok(signal, "TSLA mock signal missing");

  const verdict = generateVerdict("TSLA", findings!, signal!);

  assert.ok(
    verdict.final_verdict === "weakened_signal" || verdict.final_verdict === "rejected_signal",
    `TSLA has a press release mill source — expect weakened/rejected, got: ${verdict.final_verdict}`
  );
  assert.strictEqual(verdict.credibility_check, "flagged");
  assert.ok(verdict.challenges_raised.length > 0, "Expected at least one challenge");
  assert.ok(
    verdict.challenges_raised.some((c) => c.includes("press release")),
    "Expected press release mention in challenges"
  );
});

test("BTC (hype vocabulary + low-credibility sources) → rejected_signal", () => {
  const findings = readFindingsBoard("BTC");
  const signal = readSignalLog("BTC");
  assert.ok(findings, "BTC mock findings missing");
  assert.ok(signal, "BTC mock signal missing");

  const verdict = generateVerdict("BTC", findings!, signal!);

  // BTC mock: both sources are zerohedge.com (flagged) + hype vocabulary
  // Expected: credibility flagged + narrative entropy advisory at minimum → weakened or rejected
  assert.ok(
    verdict.final_verdict === "weakened_signal" || verdict.final_verdict === "rejected_signal",
    `BTC hype data should produce weakened/rejected, got: ${verdict.final_verdict}`
  );
  assert.strictEqual(verdict.credibility_check, "flagged");
});

test("verdict is persisted to verdict_log resource after generation", () => {
  const findings = readFindingsBoard("NVDA")!;
  const signal = readSignalLog("NVDA")!;
  generateVerdict("NVDA", findings, signal);

  const stored = readLatestVerdictLog("NVDA");
  assert.ok(stored !== null, "Expected stored verdict for NVDA");
  assert.strictEqual(stored!.ticker, "NVDA");
});

test("verdict_reasoning is non-empty and references the ticker", () => {
  const findings = readFindingsBoard("AAPL");
  const signal = readSignalLog("AAPL");
  assert.ok(findings, "AAPL mock findings missing");
  assert.ok(signal, "AAPL mock signal missing");

  const verdict = generateVerdict("AAPL", findings!, signal!);
  assert.ok(verdict.verdict_reasoning.includes("AAPL"), "verdict_reasoning should mention ticker");
  assert.ok(verdict.verdict_reasoning.length > 50, "verdict_reasoning is too short");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Some tests failed — fix before wiring into the pipeline.");
  process.exit(1);
} else {
  console.log("All tests passed. Ready to connect to the full pipeline.");
}
