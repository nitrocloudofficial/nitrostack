#!/usr/bin/env node

/**
 * SentryFlow Trigger Script
 * 
 * CLI tool to trigger a fraud incident for live demo.
 * Supports --return-rate override for Q&A re-runs.
 * 
 * Usage:
 *   npx ts-node scripts/trigger-incident.ts
 *   npx ts-node scripts/trigger-incident.ts --return-rate 0.6
 *   npx ts-node scripts/trigger-incident.ts --order-id 408-98213-1104
 */

import { MockAmazonService } from '../src/modules/sentryflow/services/mock-amazon.service';
import { FraudScoringService } from '../src/modules/sentryflow/services/fraud-scoring.service';

async function main() {
  const args = process.argv.slice(2);
  
  let orderId = '408-98213-1102';
  let returnRateOverride: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--order-id' && args[i + 1]) {
      orderId = args[i + 1];
      i++;
    }
    if (args[i] === '--return-rate' && args[i + 1]) {
      returnRateOverride = parseFloat(args[i + 1]);
      i++;
    }
  }

  console.log('\n🔍 SentryFlow Incident Trigger');
  console.log('================================\n');

  const amazon = new MockAmazonService();
  const scoring = new FraudScoringService();

  try {
    console.log(`📦 Order ID: ${orderId}`);
    
    const dispatch = await amazon.getDispatchLog(orderId);
    const returned = await amazon.getReturnLog(orderId);
    let orderMeta = await amazon.getOrderMeta(orderId);

    if (returnRateOverride !== undefined) {
      console.log(`📊 Return rate override: ${(returnRateOverride * 100).toFixed(0)}%`);
      orderMeta = { ...orderMeta, accountReturnRate90d: returnRateOverride };
    }

    console.log(`💰 Claim value: ₹${orderMeta.claimValueINR.toLocaleString('en-IN')}`);
    console.log(`📈 Account return rate (90d): ${(orderMeta.accountReturnRate90d * 100).toFixed(0)}%`);
    console.log(`📦 Dispatch weight: ${dispatch.weightGrams}g`);
    console.log(`📦 Return weight: ${returned.weightGrams}g`);
    console.log(`📝 Courier notes: ${returned.courierNotes}\n`);

    const result = scoring.scoreIncident(dispatch, returned, orderMeta);

    console.log('📊 Signal Analysis:');
    console.log('-------------------');
    for (const signal of result.signals) {
      const status = signal.triggered ? '✓' : '✗';
      const contribution = signal.triggered ? `+${(signal.weight * 100).toFixed(0)}%` : '0%';
      console.log(`${status} ${signal.name.padEnd(30)} [${contribution.padStart(5)}] ${signal.detail}`);
    }

    console.log('\n🎯 Final Score: ' + result.score + '%\n');

    if (result.score >= 80) {
      console.log('🚨 HIGH FRAUD CONFIDENCE — Recommend immediate review');
    } else if (result.score >= 50) {
      console.log('⚠️  AMBIGUOUS CONFIDENCE — Hold for human review');
    } else {
      console.log('✅ LOW FRAUD CONFIDENCE — Safe to auto-clear');
    }

    console.log('\n🛡️  Guard Decision:');
    console.log('-------------------');
    if (orderMeta.claimValueINR > 20000) {
      console.log('❌ BLOCKED: Claim exceeds ₹20,000 auto-dispatch threshold');
    } else if (result.score >= 50 && result.score < 80) {
      console.log('❌ BLOCKED: Fraud score in ambiguous confidence band (50-80)');
    } else {
      console.log('✅ ALLOWED: Claim passed all thresholds for auto-dispatch');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
