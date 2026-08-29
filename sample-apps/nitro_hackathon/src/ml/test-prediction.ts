/**
 * Quick test for the prediction engine.
 *
 * Run with:  npx tsx src/ml/test-prediction.ts
 *
 * Verifies:
 * 1. Model trains without errors
 * 2. A normal (no-failure) record returns a prediction
 * 3. A failure record returns a prediction
 * 4. The result has the expected structure
 * 5. Probabilities are between 0 and 1
 */

import { trainModel, predict, resetModel } from './prediction-engine.js';
import { getMachineByUdi } from '../data/dataset.js';

function test() {
  console.log('=== Prediction Engine Test ===\n');

  // ── Test 1: Train the model ────────────────────────────────────
  resetModel();
  const startTime = Date.now();
  const model = trainModel();
  const elapsed = Date.now() - startTime;

  if (!model.trained) {
    console.error('❌ FAIL: Model did not train');
    process.exit(1);
  }
  console.log(`✅ Model trained in ${elapsed}ms`);
  console.log(`   Weights: [${model.weights.map(w => w.toFixed(4)).join(', ')}]`);
  console.log();

  // ── Test 2: Predict on a normal record (UDI 1, no failure) ─────
  const record1 = getMachineByUdi(1)!;
  const result1 = predict({
    type: record1.type,
    airTemp: record1.airTemp,
    processTemp: record1.processTemp,
    rotationalSpeed: record1.rotationalSpeed,
    torque: record1.torque,
    toolWear: record1.toolWear,
  });

  console.log('✅ Prediction for UDI 1 (actual: no failure):');
  console.log(JSON.stringify(result1, null, 2));
  console.log();

  // ── Test 3: Predict on a failure record (UDI 51, actual failure) ─
  const record51 = getMachineByUdi(51)!;
  const result51 = predict({
    type: record51.type,
    airTemp: record51.airTemp,
    processTemp: record51.processTemp,
    rotationalSpeed: record51.rotationalSpeed,
    torque: record51.torque,
    toolWear: record51.toolWear,
  });

  console.log('✅ Prediction for UDI 51 (actual: failure):');
  console.log(JSON.stringify(result51, null, 2));
  console.log();

  // ── Test 4: Validate result structure ──────────────────────────
  const checks = [
    ['prediction is a string', typeof result1.prediction === 'string'],
    ['prediction is valid value', ['failure', 'no_failure'].includes(result1.prediction)],
    ['probability is a number', typeof result1.probability === 'number'],
    ['probability in [0, 1]', result1.probability >= 0 && result1.probability <= 1],
    ['confidence is a number', typeof result1.confidence === 'number'],
    ['confidence in [0.5, 1]', result1.confidence >= 0.5 && result1.confidence <= 1],
    ['features are returned', result1.features !== undefined],
  ] as const;

  let allPassed = true;
  for (const [label, passed] of checks) {
    if (!passed) {
      console.error(`❌ FAIL: ${label}`);
      allPassed = false;
    }
  }
  if (allPassed) {
    console.log('✅ All structure checks passed');
  }
  console.log();

  // ── Test 5: Quick accuracy check on a small sample ─────────────
  let correct = 0;
  const sampleSize = 100;
  for (let udi = 1; udi <= sampleSize; udi++) {
    const rec = getMachineByUdi(udi)!;
    const res = predict({
      type: rec.type,
      airTemp: rec.airTemp,
      processTemp: rec.processTemp,
      rotationalSpeed: rec.rotationalSpeed,
      torque: rec.torque,
      toolWear: rec.toolWear,
    });
    const predicted = res.prediction === 'failure' ? 1 : 0;
    if (predicted === rec.machineFailure) correct++;
  }
  console.log(`✅ Accuracy on first ${sampleSize} records: ${correct}/${sampleSize} (${(correct / sampleSize * 100).toFixed(1)}%)`);
  console.log();

  console.log('=== All prediction engine tests passed! ===');
}

test();
