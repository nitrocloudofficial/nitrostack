import 'reflect-metadata';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JournalService } from '../src/txn/services/journal.service.js';
import { TransactionService } from '../src/txn/services/transaction.service.js';
import { CompensatorRegistry } from '../src/txn/services/registry.service.js';
import { ReversibilityClassifier } from '../src/txn/services/classifier.service.js';
import { CrmTools } from '../src/targets/crm/crm.tools.js';
import { MessagingTools } from '../src/targets/messaging/messaging.tools.js';
import { BillingTools } from '../src/targets/billing/billing.tools.js';
import type { Step } from '../src/txn/types.js';

/**
 * Fixed so importers (acceptance-tests.ts) can reference it without re-running
 * seed(); paired with TransactionService.open()'s optional `id` param.
 */
export const DEMO_TXN_ID = 'txn_demo_onboard_acme_corp';

const DB_PATH = process.env.DB_PATH ?? './data/journal.db';

/** Wipes any previously seeded demo data so re-running this script is idempotent. */
function clearDemoData(): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, label TEXT NOT NULL, actor TEXT NOT NULL, scope TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN', pivot_seq INTEGER, opened_at TEXT NOT NULL,
      closed_at TEXT, ttl_seconds INTEGER NOT NULL DEFAULT 3600
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY, txn_id TEXT NOT NULL, seq INTEGER NOT NULL, server TEXT NOT NULL,
      tool_name TEXT NOT NULL, input_json TEXT NOT NULL, output_json TEXT, prior_state_json TEXT,
      resource_ref TEXT, resource_version TEXT, reversibility TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'EXECUTED', compensation_key TEXT NOT NULL UNIQUE,
      compensation_note TEXT, executed_at TEXT NOT NULL, UNIQUE(txn_id, seq)
    )
  `);
  db.prepare(`DELETE FROM steps WHERE txn_id IN (SELECT id FROM transactions WHERE actor = 'agent:demo')`).run();
  db.prepare(`DELETE FROM transactions WHERE actor = 'agent:demo'`).run();
  db.close();
}

/**
 * Appends a step the way JournalInterceptor would, without one — this bypasses
 * the interceptor entirely (it needs a live MCP request context, which a
 * standalone script doesn't have), so pre-read capture and classification are
 * done by hand here, calling the same registry/classifier the interceptor uses.
 */
function recordStep(
  journal: JournalService,
  params: Omit<Step, 'id' | 'executedAt' | 'compensationKey' | 'status' | 'compensationNote'> & {
    compensationKey: string;
  }
): Step {
  return journal.append({ ...params, status: 'EXECUTED', compensationNote: null });
}

export async function seed(): Promise<string> {
  clearDemoData();

  const journal = new JournalService();
  const txns = new TransactionService();
  const registry = new CompensatorRegistry();
  const classifier = new ReversibilityClassifier();
  registry.registerFromClass(CrmTools);
  registry.registerFromClass(MessagingTools);
  registry.registerFromClass(BillingTools);

  const crm = new CrmTools(registry);
  const messaging = new MessagingTools(registry);
  const billing = new BillingTools(registry);

  const txn = txns.open({
    id: DEMO_TXN_ID,
    label: 'onboard acme-corp',
    scope: ['crm', 'messaging', 'billing'],
    actor: 'agent:demo',
    ttlSeconds: 3600,
  });

  // Step 1: create_account -> CLEAN
  const account = await crm.create_account({ name: 'Acme Corp', domain: 'acme.example' });
  recordStep(journal, {
    txnId: txn.id,
    seq: 1,
    server: 'crm',
    toolName: 'create_account',
    input: { name: 'Acme Corp', domain: 'acme.example' },
    output: account,
    priorState: null,
    resourceRef: null,
    resourceVersion: null,
    reversibility: classifier.classifyStatic(registry.lookup('create_account')),
    compensationKey: 'demo-key-1',
  });

  // Step 2: update_tier -> RESTORATIVE (pre-read captured by hand, as the
  // interceptor/pipe pair would via crm.get_account, before the write).
  const preRead = await crm.get_account({ accountId: account.id });
  const priorState = {
    id: preRead.id,
    name: preRead.name,
    domain: preRead.domain,
    tier: preRead.tier,
    apiKeys: preRead.apiKeys,
  };
  const tierUpdate = await crm.update_tier({ accountId: account.id, tier: 'premium' });
  const updateTierSpec = registry.lookup('update_tier');
  recordStep(journal, {
    txnId: txn.id,
    seq: 2,
    server: 'crm',
    toolName: 'update_tier',
    input: { accountId: account.id, tier: 'premium' },
    output: tierUpdate,
    priorState,
    resourceRef: preRead.ref,
    resourceVersion: preRead.version,
    reversibility: classifier.classify({ spec: updateTierSpec, prior: priorState, at: new Date() }),
    compensationKey: 'demo-key-2',
  });

  // Step 3: capture_payment -> MITIGABLE (the pivot: after this, full clean
  // rollback is no longer possible — only a counteracting refund).
  const charge = await billing.capture_payment({ accountId: account.id, amount: 40000, currency: 'INR' });
  recordStep(journal, {
    txnId: txn.id,
    seq: 3,
    server: 'billing',
    toolName: 'capture_payment',
    input: { accountId: account.id, amount: 40000, currency: 'INR' },
    output: charge,
    priorState: null,
    resourceRef: null,
    resourceVersion: null,
    reversibility: classifier.classifyStatic(registry.lookup('capture_payment')),
    compensationKey: 'demo-key-3',
  });

  // Step 4: grant_api_key -> CLEAN
  const apiKey = await crm.grant_api_key({ accountId: account.id, scope: 'write' });
  recordStep(journal, {
    txnId: txn.id,
    seq: 4,
    server: 'crm',
    toolName: 'grant_api_key',
    input: { accountId: account.id, scope: 'write' },
    output: apiKey,
    priorState: null,
    resourceRef: null,
    resourceVersion: null,
    reversibility: classifier.classifyStatic(registry.lookup('grant_api_key')),
    compensationKey: 'demo-key-4',
  });

  // Step 5: post_message -> TOMBSTONED
  const message = await messaging.post_message({ channel: '#general', text: 'Welcome Acme Corp!' });
  recordStep(journal, {
    txnId: txn.id,
    seq: 5,
    server: 'messaging',
    toolName: 'post_message',
    input: { channel: '#general', text: 'Welcome Acme Corp!' },
    output: message,
    priorState: null,
    resourceRef: null,
    resourceVersion: null,
    reversibility: classifier.classifyStatic(registry.lookup('post_message')),
    compensationKey: 'demo-key-5',
  });

  // Step 6: send_email -> MITIGABLE
  const email = await messaging.send_email({ to: 'ops@acme.example', template: 'welcome' });
  recordStep(journal, {
    txnId: txn.id,
    seq: 6,
    server: 'messaging',
    toolName: 'send_email',
    input: { to: 'ops@acme.example', template: 'welcome' },
    output: email,
    priorState: null,
    resourceRef: null,
    resourceVersion: null,
    reversibility: classifier.classifyStatic(registry.lookup('send_email')),
    compensationKey: 'demo-key-6',
  });

  // Step 7: invite_user -> TOMBSTONED
  const invite = await messaging.invite_user({ email: 'admin@acme.example' });
  recordStep(journal, {
    txnId: txn.id,
    seq: 7,
    server: 'messaging',
    toolName: 'invite_user',
    input: { email: 'admin@acme.example' },
    output: invite,
    priorState: null,
    resourceRef: null,
    resourceVersion: null,
    reversibility: classifier.classifyStatic(registry.lookup('invite_user')),
    compensationKey: 'demo-key-7',
  });

  console.log(`DEMO_TXN_ID=${txn.id}`);
  return txn.id;
}

// Only auto-run when this file is the actual entrypoint (`node --loader
// ts-node/esm fixtures/seed.ts`), not when acceptance-tests.ts imports
// DEMO_TXN_ID/seed from it.
//
// NOTE: plain `npx ts-node fixtures/seed.ts` does NOT work on this project —
// package.json has "type": "module" and ts-node's default CJS hook can't
// handle that. Run it as:
//   node --loader ts-node/esm fixtures/seed.ts
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
