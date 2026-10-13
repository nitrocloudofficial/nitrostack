import { SecurityTools } from './src/modules/security/security.tools.js';
import { RemediationTools } from './src/modules/remediation/remediation.tools.js';

async function runTest3() {
  console.log('🧪 Starting Execution Test for Person 3 (Security & Remediation)...\n');

  const secTools = new SecurityTools();
  const remTools = new RemediationTools();

  // Test 1: Scan Security Posture
  console.log('--------------------------------------------------');
  console.log('🔍 Test 1: Scanning Security Posture (minSeverity: HIGH)...');
  const posture = await secTools.scan({ minSeverity: 'HIGH' });
  console.dir(posture, { depth: null });

  // Test 2: Generate Remediation Plan for first finding
  if (posture.length > 0) {
    const targetFindingId = posture[0].findingId;
    console.log('\n--------------------------------------------------');
    console.log(`🛠️ Test 2: Generating Remediation Plan for '${targetFindingId}'...`);
    const plan = await remTools.generatePlan({ findingId: targetFindingId });
    console.dir(plan, { depth: null });
  } else {
    console.log('\n⚠️ No findings returned for Test 2.');
  }

  // Test 3: Edge Case Test (Unknown findingId)
  console.log('\n--------------------------------------------------');
  console.log("🔍 Test 3: Testing edge case with unknown findingId ('non-existent-id')...");
  const invalidResult = await remTools.generatePlan({ findingId: 'non-existent-id' });
  console.log('Result:', invalidResult);

  console.log('\n--------------------------------------------------');
  console.log('🎉 PERSON 3 TEST COMPLETE!');
}

runTest3().catch((err) => console.error('❌ Test Failed:', err));