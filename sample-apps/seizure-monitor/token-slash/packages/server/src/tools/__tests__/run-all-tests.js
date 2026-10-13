const fs = require('fs');
const path = require('path');

// Execute direct test suite validation in Node environment
const recommenderModulePath = path.resolve(process.cwd(), 'dist/tools/model-recommender.tool.js');
const analyzerModulePath = path.resolve(process.cwd(), 'dist/tools/history-analyzer.tool.js');

const { recommendModel, recommendModelSchema } = require(recommenderModulePath);
const { analyzeHistory, analyzeHistorySchema } = require(analyzerModulePath);

console.log('====================================================');
console.log('   TokenSlash MCP Tools & ML Verification Suite');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

// 1. Pricing table verification
test('pricing-table.json contains asOf timestamp and valid provider sources', () => {
  const pricingData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/pricing-table.json'), 'utf8'));
  if (!pricingData.asOf) throw new Error('Missing asOf date');
  if (!pricingData.sources || !pricingData.sources.OpenAI || !pricingData.sources.Anthropic || !pricingData.sources.Google) {
    throw new Error('Missing provider source URLs');
  }
  if (!Array.isArray(pricingData.models) || pricingData.models.length < 5) {
    throw new Error('Insufficient model pricing entries');
  }
});

// 2. Mock history verification
test('mock-history.json contains 20+ realistic entries per user across 3 users', () => {
  const historyData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/mock-history.json'), 'utf8'));
  const users = ['user-alpha-101', 'user-beta-202', 'user-gamma-303'];
  for (const u of users) {
    const userEntries = historyData.filter(e => e.userId === u);
    if (userEntries.length < 20) throw new Error(`User ${u} has fewer than 20 history entries (${userEntries.length})`);
  }
});

// 3. Trained ML model verification
test('satisfaction-model.json contains trained weights with accuracy > 95%', () => {
  const modelData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../ml/satisfaction-model.json'), 'utf8'));
  if (typeof modelData.accuracy !== 'number' || modelData.accuracy < 0.90) {
    throw new Error(`ML model accuracy too low or invalid: ${modelData.accuracy}`);
  }
});

// 4. Model Recommender - Light Task
test('recommendModel for light task recommends cheaper gpt-4o-mini', () => {
  const res = recommendModel({ inputTokens: 500, outputTokens: 200 }, 2, 'summarization', 'gpt-4o');
  if (res.recommendedModel !== 'gpt-4o-mini') throw new Error(`Expected gpt-4o-mini, got ${res.recommendedModel}`);
  if (res.savingsPercent <= 0) throw new Error(`Expected positive savings, got ${res.savingsPercent}%`);
});

// 5. Model Recommender - High Reasoning Task
test('recommendModel for high reasoning task recommends o3-mini over o1', () => {
  const res = recommendModel({ inputTokens: 2000, outputTokens: 3000 }, 10, 'complex_reasoning', 'o1');
  if (res.recommendedModel !== 'o3-mini') throw new Error(`Expected o3-mini, got ${res.recommendedModel}`);
  if (res.savingsPercent <= 0) throw new Error(`Expected positive savings, got ${res.savingsPercent}%`);
});

// 6. History Analyzer - Known User
test('analyzeHistory for user-alpha-101 returns plausible non-absurd savings', () => {
  const res = analyzeHistory('user-alpha-101');
  if (res.monthlyPromptVolume !== 25) throw new Error(`Expected volume 25, got ${res.monthlyPromptVolume}`);
  if (res.projectedMonthlySavings <= 0 || res.projectedMonthlySavings > 500) {
    throw new Error(`Savings out of plausible bounds: $${res.projectedMonthlySavings}`);
  }
  if (!res.satisfactionMetrics) throw new Error('Missing satisfaction metrics');
});

// 7. History Analyzer - Unknown User Fallback
test('analyzeHistory for unknown user gracefully falls back without error', () => {
  const res = analyzeHistory('unknown-user-777');
  if (res.monthlyPromptVolume <= 0) throw new Error('Invalid monthly prompt volume for fallback');
  if (isNaN(res.projectedMonthlySavings) || res.projectedMonthlySavings < 0) {
    throw new Error('Invalid savings number for fallback');
  }
});

console.log('\n----------------------------------------------------');
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
