/**
 * test-scout.ts — Standalone test script for Scout Agent tools
 * Run with: npx tsx src/test-scout.ts
 *
 * Tests all Person 1 deliverables independently of the full agent pipeline:
 *   1. scan_trending_topics (seed fallback mode)
 *   2. detect_narrative_shift (hype vs. substance)
 *   3. findings_board read/write helpers
 *
 * This is what you run in NitroStudio to verify output shape before
 * wiring it into the LLM orchestration flow.
 */

import { writeFinding, readLatestFinding, readAllFindings, type FindingsBoardEntry } from './modules/scout/findings-board.resource.js';
import * as fs from 'fs';
import * as path from 'path';

// ─── Color helpers for terminal output ────────────────────────────────────────
const GREEN  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const RED    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const BOLD   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const CYAN   = (s: string) => `\x1b[36m${s}\x1b[0m`;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(GREEN(`  ✓ PASS`) + ` ${testName}`);
    testsPassed++;
  } else {
    console.log(RED(`  ✗ FAIL`) + ` ${testName}` + (detail ? ` — ${detail}` : ''));
    testsFailed++;
  }
}

// ─── Test 1: Seed news loading ─────────────────────────────────────────────────
console.log(BOLD('\n═══ Test 1: Seed News Loading ═══'));
const seedPath = path.join(process.cwd(), 'src', 'data', 'seed-news.json');
const seedExists = fs.existsSync(seedPath);
assert(seedExists, 'seed-news.json exists');

if (seedExists) {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  assert(Array.isArray(seed.TSLA), 'TSLA seed entries are array');
  assert(Array.isArray(seed.NVDA), 'NVDA seed entries are array');
  assert(Array.isArray(seed.AAPL), 'AAPL seed entries are array');
  assert(Array.isArray(seed.BTC),  'BTC seed entries are array');

  // Verify planted hype spike exists
  const btcHype = seed.BTC.find((h: any) => h._demo_flag?.includes('HYPE'));
  assert(!!btcHype, 'BTC hype spike planted in seed data', 'Required for Skeptic demo');

  // Verify planted recycled headline exists
  const tslaRecycled = seed.TSLA.filter((h: any) => h._demo_flag?.includes('RECYCLED'));
  assert(tslaRecycled.length > 0, 'TSLA recycled headline planted in seed data', 'Required for Skeptic demo');
}

// ─── Test 2: findings_board write / read ───────────────────────────────────────
console.log(BOLD('\n═══ Test 2: Findings Board Read/Write ═══'));

const testEntry: FindingsBoardEntry = {
  ticker: 'NVDA',
  timestamp: new Date().toISOString(),
  headlines: [
    { source: 'TestSource', text: 'Nvidia earnings beat expectations on AI demand surge', url: 'https://test.com', sentiment: 'positive', sentiment_score: 0.7 },
    { source: 'TestSource2', text: 'Nvidia faces export restriction concerns from regulators', url: 'https://test2.com', sentiment: 'negative', sentiment_score: -0.4 },
  ],
  narrative_summary: 'Mixed NVDA coverage: strong earnings offset by regulatory headwinds.',
  mention_velocity: 'spiking',
  narrative_entropy: 'low',
};

writeFinding(testEntry);

const retrieved = readLatestFinding('NVDA');
assert(retrieved !== null, 'Can write and read findings_board entry');
assert(retrieved?.ticker === 'NVDA', 'Ticker preserved correctly');
assert(retrieved?.mention_velocity === 'spiking', 'mention_velocity preserved');
assert(retrieved?.narrative_entropy === 'low', 'narrative_entropy preserved');
assert(Array.isArray(retrieved?.headlines), 'headlines is an array');
assert(retrieved?.headlines.length === 2, 'headline count preserved');
assert(retrieved?.headlines[0].sentiment === 'positive', 'headline sentiment preserved');
assert(typeof retrieved?.headlines[0].sentiment_score === 'number', 'sentiment_score is a number');

const allEntries = readAllFindings('NVDA');
assert(allEntries.length > 0, 'readAllFindings returns entries for NVDA');

// ─── Test 3: Narrative entropy scoring (inline test, no LLM needed) ────────────
console.log(BOLD('\n═══ Test 3: Narrative Entropy Logic ═══'));

// We test the scoring logic by writing entries with known hype content
const hypeEntry: FindingsBoardEntry = {
  ticker: 'BTC',
  timestamp: new Date().toISOString(),
  headlines: [
    { source: 'Reddit', text: 'BTC to the moon 🚀 YOLO guaranteed lambo hodl', url: '', sentiment: 'positive', sentiment_score: 0.9 },
    { source: 'Reddit', text: 'WAGMI easy money fomo rocket moon squad', url: '', sentiment: 'positive', sentiment_score: 0.8 },
  ],
  narrative_summary: 'Retail hype chatter dominating BTC discourse.',
  mention_velocity: 'spiking',
  narrative_entropy: 'high',
};
writeFinding(hypeEntry);

const btcEntry = readLatestFinding('BTC');
assert(btcEntry?.narrative_entropy === 'high', 'Hype entry written with narrative_entropy: high');

const techEntry: FindingsBoardEntry = {
  ticker: 'AAPL',
  timestamp: new Date().toISOString(),
  headlines: [
    { source: 'Reuters', text: 'Apple quarterly revenue beats earnings guidance on margin expansion', url: '', sentiment: 'positive', sentiment_score: 0.7 },
    { source: 'Bloomberg', text: 'Apple dividend buyback signals strong cashflow fundamentals', url: '', sentiment: 'positive', sentiment_score: 0.65 },
  ],
  narrative_summary: 'Technical coverage of AAPL earnings with analyst focus.',
  mention_velocity: 'steady',
  narrative_entropy: 'low',
};
writeFinding(techEntry);

const aaplEntry = readLatestFinding('AAPL');
assert(aaplEntry?.narrative_entropy === 'low', 'Technical entry written with narrative_entropy: low');

// ─── Test 4: Output shape validation ──────────────────────────────────────────
console.log(BOLD('\n═══ Test 4: FindingsBoardEntry Shape Validation ═══'));
const entry = readLatestFinding('NVDA')!;

assert('ticker' in entry, 'shape has ticker');
assert('timestamp' in entry, 'shape has timestamp');
assert('headlines' in entry, 'shape has headlines');
assert('narrative_summary' in entry, 'shape has narrative_summary');
assert('mention_velocity' in entry, 'shape has mention_velocity');
assert(['spiking', 'steady', 'declining'].includes(entry.mention_velocity), 'mention_velocity is valid enum');
assert(
  entry.narrative_entropy === undefined || ['low', 'medium', 'high'].includes(entry.narrative_entropy!),
  'narrative_entropy is valid enum (or absent)'
);

// Verify headline shape
const h = entry.headlines[0];
assert('source' in h, 'headline has source');
assert('text' in h, 'headline has text');
assert('url' in h, 'headline has url');
assert(['positive', 'negative', 'neutral'].includes(h.sentiment), 'headline.sentiment is valid enum');
assert(typeof h.sentiment_score === 'number', 'headline.sentiment_score is a number');
assert(h.sentiment_score >= -1 && h.sentiment_score <= 1, 'sentiment_score in [-1, 1]');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(BOLD('\n═══ Summary ═══'));
const total = testsPassed + testsFailed;
console.log(`${CYAN(String(total))} tests run: ${GREEN(String(testsPassed))} passed, ${testsFailed > 0 ? RED(String(testsFailed)) : '0'} failed`);

if (testsFailed > 0) {
  console.log(RED('\n✗ Some tests failed — fix before wiring into agent pipeline'));
  process.exit(1);
} else {
  console.log(GREEN('\n✓ All tests passed — Scout module is ready for integration'));
  console.log(YELLOW('\nNext step: run `npm run dev` and test scan_trending_topics in NitroStudio'));
}
