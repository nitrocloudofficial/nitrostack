/**
 * Automated Verification Script — Aegis Protocol E2E Integration Test
 * 
 * Verifies that:
 * 1. Express backend processes all 4 test cases correctly according to payload.
 * 2. High/Critical cases (threat score >= 80) halt execution with HTTP 202 FROZEN_PENDING_REVIEW.
 * 3. Low/Benign cases (threat score < 80) complete execution with HTTP 200 PROCESSED.
 * 4. HITL Guard resolution (/api/v1/guard/resolve) unblocks the backend gate and dispatches MHA alert.
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function runE2EVerification() {
  console.log('----------------------------------------------------------------------');
  console.log('🛡️  AEGIS PROTOCOL — FRONTEND / BACKEND E2E VERIFICATION SUITE');
  console.log(`📡 Target API Gateway: ${API_BASE_URL}`);
  console.log('----------------------------------------------------------------------\n');

  // Load test cases
  const suitePath = path.resolve(process.cwd(), 'mocks', 'test_cases.json');
  if (!fs.existsSync(suitePath)) {
    throw new Error(`Test suite not found at ${suitePath}`);
  }

  const testCases = JSON.parse(fs.readFileSync(suitePath, 'utf-8'));
  console.log(`📋 Loaded ${testCases.length} test cases from test_cases.json\n`);

  let totalPassed = 0;
  let totalFailed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`======================================================================`);
    console.log(`  [TEST ${i + 1}/${testCases.length}] ${tc.id}: ${tc.caseTitle}`);
    console.log(`  Severity: ${tc.severity} | Expected Score: ~${tc.expectedThreatScore}`);
    console.log(`  Payload: phone=${tc.senderPhone}, account=${tc.destinationAccount}, amount=${tc.amount}`);
    console.log(`======================================================================`);

    try {
      // Step 1: Send process request to Express Backend
      const processRes = await fetch(`${API_BASE_URL}/api/v1/transaction/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: tc.rawAmount,
          sender_phone: tc.senderPhone,
          destination_account: tc.destinationAccount,
        }),
      });

      const httpStatus = processRes.status;
      const data = await processRes.json();

      console.log(`  📥 Express Response Status: HTTP ${httpStatus}`);
      console.log(`  📄 Response Payload Status: "${data.status}"`);
      console.log(`  🎯 Calculated Threat Score: ${data.threat_score ?? data.result?.threat_score}`);

      // Verification checks
      if (tc.expectedThreatScore >= 80) {
        if (httpStatus !== 202 || data.status !== 'FROZEN_PENDING_REVIEW') {
          throw new Error(`Expected HTTP 202 FROZEN_PENDING_REVIEW, got HTTP ${httpStatus} status=${data.status}`);
        }
        console.log('  ✅ [PASS] High-threat transaction correctly halted by ThreatScoreGuard.');

        // Step 2: Resolve active HITL guard with FREEZE action
        console.log(`  🛡️ Resolving HITL Guard for ${data.transaction_id} with action: FREEZE...`);
        const resolveRes = await fetch(`${API_BASE_URL}/api/v1/guard/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'FREEZE',
            transaction_id: data.transaction_id,
          }),
        });

        const resolveStatus = resolveRes.status;
        const resolveData = await resolveRes.json();

        if (resolveStatus !== 200 || resolveData.status !== 'RESOLVED' || !resolveData.mha_dispatch_triggered) {
          throw new Error(`Guard resolution failed: HTTP ${resolveStatus} data=${JSON.stringify(resolveData)}`);
        }

        console.log(`  ✅ [PASS] HITL Guard resolved. MHA Dispatch Case ID: ${resolveData.details?.mha_dispatch?.mha_case_id}`);
      } else {
        if (httpStatus !== 200 || data.status !== 'PROCESSED') {
          throw new Error(`Expected HTTP 200 PROCESSED, got HTTP ${httpStatus} status=${data.status}`);
        }
        console.log('  ✅ [PASS] Low-threat transaction auto-cleared without halting execution.');
      }

      totalPassed++;
      console.log(`  ✨ Scenario ${tc.id} VERIFIED SUCCESSFULLY!\n`);
    } catch (err: any) {
      totalFailed++;
      console.error(`  ❌ [FAIL] Scenario ${tc.id} failed: ${err.message}\n`);
    }
  }

  console.log('----------------------------------------------------------------------');
  console.log(`📊 VERIFICATION SUMMARY: ${totalPassed} Passed | ${totalFailed} Failed`);
  console.log('----------------------------------------------------------------------');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runE2EVerification().catch((err) => {
  console.error('Fatal Verification Failure:', err);
  process.exit(1);
});
