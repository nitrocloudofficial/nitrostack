/**
 * trigger-random.ts — DEV/TEST Random Account Investigation Trigger
 *
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  [DEV/TEST MODE — not for demo]                              ║
 * ║  Picks a random account from the fully-loaded in-memory      ║
 * ║  graph and runs the investigation pipeline against it.       ║
 * ║  Useful for stress-testing the flow against data we didn't   ║
 * ║  hand-pick, without touching what happens on stage.          ║
 * ╚════════════════════════════════════════════════════════════════╝
 *
 * Usage: npm run trigger:random
 *        node node_modules/tsx/dist/cli.mjs scripts/trigger-random.ts
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  ⚠️  [DEV/TEST MODE — not for demo]                           ║');
console.log('║  Random Account Investigation Trigger                         ║');
console.log('║  This picks a random account from ALL loaded mock data.       ║');
console.log('║  DO NOT use this for the actual stage demo.                   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

interface MockTransaction {
  transaction_id: string;
  destination_account: any;
  device_fingerprint?: { device_id: string };
  rbi_cluster_id?: string | null;
  velocity_score?: number;
  geographic_mismatch?: { mismatch_severity?: string };
  attempted_transfer_amount?: number;
  source_account?: { account_id?: string };
}

// Load ALL bank_event*.json files (same policy as the graph engine)
const mocksDir = path.resolve(process.cwd(), 'mocks');
const bankFiles = fs.readdirSync(mocksDir).filter(
  (f) => f.startsWith('bank_event') && f.endsWith('.json')
);

const allTransactions: MockTransaction[] = [];
for (const file of bankFiles) {
  const raw = fs.readFileSync(path.join(mocksDir, file), 'utf-8');
  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed) ? parsed : [parsed];
  allTransactions.push(...records);
}

// Collect unique destination account IDs
const uniqueAccounts = new Set<string>();
for (const txn of allTransactions) {
  const destId = typeof txn.destination_account === 'object'
    ? txn.destination_account?.account_id
    : txn.destination_account;
  if (destId) uniqueAccounts.add(destId);
}

const accountList = Array.from(uniqueAccounts);
if (accountList.length === 0) {
  console.error('❌ No accounts found in mock data.');
  process.exit(1);
}

// Pick a random account
const randomAccount = accountList[Math.floor(Math.random() * accountList.length)];

console.log(`📊 Loaded ${allTransactions.length} transactions from ${bankFiles.length} file(s)`);
console.log(`📋 Found ${accountList.length} unique destination accounts`);
console.log('');
console.log(`🎯 Randomly selected account: ${randomAccount}`);
console.log('');

// Find all transactions involving this account
const relevantTxns = allTransactions.filter((txn) => {
  const destId = typeof txn.destination_account === 'object'
    ? txn.destination_account?.account_id
    : txn.destination_account;
  return destId === randomAccount;
});

console.log(`📌 Found ${relevantTxns.length} transaction(s) targeting this account:`);
console.log('');

for (const txn of relevantTxns) {
  const srcId = txn.source_account?.account_id ?? 'UNKNOWN';
  const deviceId = txn.device_fingerprint?.device_id ?? 'N/A';
  const rbiCluster = txn.rbi_cluster_id ?? 'none';
  const velocity = txn.velocity_score ?? 0;
  const geoSeverity = txn.geographic_mismatch?.mismatch_severity ?? 'N/A';
  const amount = txn.attempted_transfer_amount ?? 0;

  console.log(`  TXN: ${txn.transaction_id}`);
  console.log(`    Source: ${srcId} → Dest: ${randomAccount}`);
  console.log(`    Device: ${deviceId} | RBI Cluster: ${rbiCluster}`);
  console.log(`    Velocity: ${velocity} | Geo Mismatch: ${geoSeverity} | Amount: ₹${amount.toLocaleString()}`);
  console.log('');
}

// Now trigger the demo scenario with this account via trigger.mjs
console.log('───────────────────────────────────────────────────────');
console.log(`🚀 Launching trigger.mjs with target account: ${randomAccount}`);
console.log('   [DEV/TEST MODE — not for demo]');
console.log('───────────────────────────────────────────────────────');
console.log('');

// Execute trigger.mjs in critical mode (or pass account ID for investigation)
import { execSync } from 'child_process';
try {
  execSync(`node scripts/trigger.mjs critical`, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      AEGIS_RANDOM_ACCOUNT: randomAccount,
      AEGIS_DEV_TEST_MODE: 'true',
    },
  });
} catch (err) {
  // trigger.mjs may exit with non-zero, that's okay for a demo trigger
  console.log('');
  console.log('[DEV/TEST MODE] Trigger completed.');
}
