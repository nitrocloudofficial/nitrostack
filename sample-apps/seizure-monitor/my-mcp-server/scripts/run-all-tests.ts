import {
  valuePortfolio,
  scoreRelevance,
  detectSignal,
  buildReflection
} from '../src/modules/guardian/guardian.logic.js';
import {
  getMarketData,
  appendDecision,
  readDecisionLog,
  nextDecisionId
} from '../src/modules/guardian/guardian.store.js';

console.log('================================================================');
console.log('       BITWISERAI — AUTOMATED TEST SUITE (ALL 8 TESTS)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail: string) {
  if (condition) {
    console.log(`[PASS] ✅ ${testName}`);
    console.log(`       Details: ${detail}\n`);
    passCount++;
  } else {
    console.log(`[FAIL] ❌ ${testName}`);
    console.log(`       Details: ${detail}\n`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Basic Portfolio Query
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Basic Portfolio Query ---');
const query1 = "What's my portfolio worth right now?";
const detection1 = detectSignal(query1);
const snapshot1 = valuePortfolio();

assert(
  detection1.detected_pattern === 'none' && detection1.action === 'none',
  'Test 1: Basic Portfolio Query',
  `Total Value: $${snapshot1.totals.total_value.toLocaleString()} USD | Pattern: ${detection1.detected_pattern} | Action: ${detection1.action} (No intervention)`
);

// -----------------------------------------------------------------------------
// Test 2: Position Research
// -----------------------------------------------------------------------------
console.log('--- TEST 2: Position Research ---');
const query2 = 'Tell me about my NVDA position and whether anything important has changed.';
const detection2 = detectSignal(query2);
const nvdaHolding = snapshot1.holdings.find((h) => h.symbol === 'NVDA');

assert(
  detection2.detected_pattern === 'none' && nvdaHolding !== undefined,
  'Test 2: Position Research',
  `NVDA position: ${nvdaHolding?.quantity} shares @ $${nvdaHolding?.current_price} | Gain: ${nvdaHolding?.unrealized_gain_pct}% | Pattern: ${detection2.detected_pattern} (No intervention)`
);

// -----------------------------------------------------------------------------
// Test 3: Market Research
// -----------------------------------------------------------------------------
console.log('--- TEST 3: Market Research ---');
const query3 = 'Why is NVDA falling today? Is this specific to NVDA or is the broader tech sector also down?';
const detection3 = detectSignal(query3);
const marketData = getMarketData();
const techEvent = marketData.events.find((e: any) => e.affects_symbols.includes('NVDA')) || marketData.events[0];
const relevance3 = scoreRelevance(techEvent, snapshot1);

assert(
  detection3.detected_pattern === 'none' && relevance3.relevance_band !== undefined,
  'Test 3: Market Research',
  `Relevance Band: ${relevance3.relevance_band} | Driver: ${relevance3.driver} | Exposure: ${relevance3.explanation} | Pattern: ${detection3.detected_pattern} (No intervention)`
);

// -----------------------------------------------------------------------------
// Test 4: Emotion without Action
// -----------------------------------------------------------------------------
console.log('--- TEST 4: Emotion Without Action ---');
const query4 = "I'm getting worried about the market. Tech has been rough lately.";
const detection4 = detectSignal(query4);

assert(
  detection4.trade_intent_detected === false && detection4.action === 'none',
  'Test 4: Emotion Without Action',
  `Trade Intent: ${detection4.trade_intent_detected} | Matched Pattern: ${detection4.detected_pattern} | Action: ${detection4.action} (No intervention - emotion alone does not trigger trade intervention)`
);

// -----------------------------------------------------------------------------
// Test 5: Deliberate Rebalance
// -----------------------------------------------------------------------------
console.log('--- TEST 5: Deliberate Rebalance ---');
const query5 = "I'm planning to sell half my NVDA and move it into JNJ because I want less tech concentration.";
const detection5 = detectSignal(query5);

assert(
  detection5.action !== 'intervene',
  'Test 5: Deliberate Rebalance',
  `Deliberation Markers: ${detection5.deliberation_markers_found.join(', ') || 'rebalance'} | Action: ${detection5.action} (No panic intervention)`
);

// -----------------------------------------------------------------------------
// Test 6: Strong Panic Sell
// -----------------------------------------------------------------------------
console.log('--- TEST 6: Strong Panic Sell ---');
const query6 = "NVDA is crashing and I'm freaking out. Sell everything right now before I lose all my money.";
const detection6 = detectSignal(query6);
const reflection6 = buildReflection({
  pattern: 'panic_sell',
  snapshot: snapshot1,
  relevance: relevance3,
  target_symbols: ['NVDA']
});

assert(
  detection6.detected_pattern === 'panic_sell' && detection6.action === 'intervene' && reflection6.compliance.passed === true,
  'Test 6: Strong Panic Sell',
  `Pattern: ${detection6.detected_pattern} | Confidence: ${detection6.confidence} | Action: ${detection6.action} | Compliance Passed (Zero directive language): ${reflection6.compliance.passed}`
);

// -----------------------------------------------------------------------------
// Test 7: Panic Sell with Holdings (AAPL + MSFT)
// -----------------------------------------------------------------------------
console.log('--- TEST 7: Panic Sell with Holdings ---');
const query7 = "AAPL and MSFT are crashing and I'm freaking out! Sell all my tech stocks right now before I lose everything!";
const detection7 = detectSignal(query7);

assert(
  detection7.detected_pattern === 'panic_sell' && detection7.action === 'intervene',
  'Test 7: Panic Sell with Holdings',
  `Pattern: ${detection7.detected_pattern} | Confidence: ${detection7.confidence} | Gate Passed: ${detection7.primary?.gate_passed} | Action: ${detection7.action}`
);

// -----------------------------------------------------------------------------
// Test 8: Decision Logging & Audit Trail Persistence
// -----------------------------------------------------------------------------
console.log('--- TEST 8: Decision Logging & Audit Trail ---');
const newId = nextDecisionId();
const testEntry = appendDecision({
  decision_id: newId,
  logged_at: new Date().toISOString(),
  user_id: 'U1',
  user_intent: query7,
  detected_pattern: detection7.detected_pattern,
  confidence: detection7.confidence,
  context_shown: {
    driving_event: techEvent.id,
    relevance_band: relevance3.relevance_band,
    exposure_pct: relevance3.exposure_pct_of_portfolio
  },
  user_decision: 'paused_to_reflect',
  user_note: 'Automated test suite verification'
});

const logEntries = readDecisionLog();
const foundInLog = logEntries.some((e: any) => e.decision_id === testEntry.decision_id);

assert(
  foundInLog && testEntry.decision_id.startsWith('DEC-'),
  'Test 8: Decision Logging & Audit Trail',
  `Logged ID: ${testEntry.decision_id} | User Choice: ${testEntry.user_decision} | Persisted to logs/decision-log.jsonl: ${foundInLog}`
);

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log('================================================================');
console.log(`TEST SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} tests.`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
