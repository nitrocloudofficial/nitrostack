import 'reflect-metadata';
import { JournalService } from '../src/txn/services/journal.service.js';
import { TransactionService } from '../src/txn/services/transaction.service.js';
import { CompensatorRegistry } from '../src/txn/services/registry.service.js';
import { ReversibilityClassifier } from '../src/txn/services/classifier.service.js';
import { RollbackOrchestrator, type ToolExecutor } from '../src/txn/services/rollback.service.js';
import { TxnError } from '../src/txn/services/txn-error.js';
import { RollbackGuard } from '../src/txn/guards/rollback.guard.js';
import { CrmTools } from '../src/targets/crm/crm.tools.js';
import { MessagingTools } from '../src/targets/messaging/messaging.tools.js';
import { BillingTools } from '../src/targets/billing/billing.tools.js';
import { seed, DEMO_TXN_ID } from './seed.js';

let passed = 0;
let failed = 0;

async function runTest(n: number, name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`TEST ${n} [PASS]: ${name}`);
    passed++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`TEST ${n} [FAIL]: ${name} — ${message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/** Fresh service graph per test so state from one test never leaks into another. */
function makeHarness() {
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

  const tools: Record<string, any> = { ...crmMethods(crm), ...messagingMethods(messaging), ...billingMethods(billing) };

  const defaultExecutor: ToolExecutor = async (toolName, args) => {
    const fn = tools[toolName];
    if (!fn) throw new Error(`Tool not found: ${toolName}`);
    return fn(args);
  };

  const rollbacks = new RollbackOrchestrator(journal, txns, registry, classifier);
  rollbacks.setToolExecutor(defaultExecutor);

  return { journal, txns, registry, classifier, rollbacks, crm, messaging, billing, defaultExecutor };
}

// Small adapters so a plain { [toolName]: fn } map can dispatch by string name
// without hardcoding a switch per tool.
function crmMethods(crm: CrmTools) {
  return {
    create_account: (a: any) => crm.create_account(a),
    delete_account: (a: any) => crm.delete_account(a),
    update_tier: (a: any) => crm.update_tier(a),
    grant_api_key: (a: any) => crm.grant_api_key(a),
    revoke_api_key: (a: any) => crm.revoke_api_key(a),
    get_account: (a: any) => crm.get_account(a),
  };
}
function messagingMethods(messaging: MessagingTools) {
  return {
    post_message: (a: any) => messaging.post_message(a),
    delete_message: (a: any) => messaging.delete_message(a),
    send_email: (a: any) => messaging.send_email(a),
    invite_user: (a: any) => messaging.invite_user(a),
    revoke_invite: (a: any) => messaging.revoke_invite(a),
  };
}
function billingMethods(billing: BillingTools) {
  return {
    authorize_payment: (a: any) => billing.authorize_payment(a),
    void_authorization: (a: any) => billing.void_authorization(a),
    capture_payment: (a: any) => billing.capture_payment(a),
    refund_payment: (a: any) => billing.refund_payment(a),
    issue_payout: (a: any) => billing.issue_payout(a),
  };
}

async function appendCreatedAccount(
  h: ReturnType<typeof makeHarness>,
  txnId: string,
  seq: number,
  name: string,
  domain: string
) {
  const account = await h.crm.create_account({ name, domain });
  h.journal.append({
    txnId,
    seq,
    server: 'crm',
    toolName: 'create_account',
    input: { name, domain },
    output: account,
    priorState: null,
    resourceRef: null,
    resourceVersion: null,
    reversibility: h.classifier.classifyStatic(h.registry.lookup('create_account')),
    status: 'EXECUTED',
    compensationNote: null,
  });
  return account;
}

/**
 * Journals an update_tier step exactly the way JournalInterceptor + the fixed
 * post-execution re-read do: pre-read for priorState, write, THEN a second
 * read for resourceRef/resourceVersion — the version captured must reflect
 * the state *after* this step's own write, or every rollback would falsely
 * see this step itself as a "conflict" (see journal.interceptor.ts's
 * POST-EXECUTION VERSION RE-READ comment for the full story).
 */
async function appendUpdateTierStep(
  h: ReturnType<typeof makeHarness>,
  txnId: string,
  seq: number,
  accountId: string,
  tier: 'basic' | 'premium' | 'enterprise'
) {
  const preRead = await h.crm.get_account({ accountId });
  const prior = { id: preRead.id, name: preRead.name, domain: preRead.domain, tier: preRead.tier, apiKeys: preRead.apiKeys };
  const result = await h.crm.update_tier({ accountId, tier });
  const postRead = await h.crm.get_account({ accountId });
  h.journal.append({
    txnId,
    seq,
    server: 'crm',
    toolName: 'update_tier',
    input: { accountId, tier },
    output: result,
    priorState: prior,
    resourceRef: postRead.ref,
    resourceVersion: postRead.version,
    reversibility: h.classifier.classify({ spec: h.registry.lookup('update_tier'), prior, at: new Date() }),
    status: 'EXECUTED',
    compensationNote: null,
  });
  return result;
}

async function main() {
  // Ensures the DB/tables exist and the demo transaction is present; the
  // 7 tests below each build their own focused scenario rather than reusing
  // DEMO_TXN_ID's steps directly, since each test needs precise control over
  // its own setup (a broken compensator, a simulated conflict, etc.).
  await seed();
  console.log(`(seeded demo transaction ${DEMO_TXN_ID} — used as smoke-test fixture, not by the tests below)`);

  // TEST 1 — Happy path: create_account, update_tier (pre-read), grant_api_key, rollback.
  await runTest(1, 'Happy path rollback (3 steps, all reversed)', async () => {
    const h = makeHarness();
    const txn = h.txns.open({ label: 'test1', actor: 'agent:test', scope: ['crm'], ttlSeconds: 3600 });

    const account = await appendCreatedAccount(h, txn.id, 1, 'Test1 Co', 'test1.example');
    await appendUpdateTierStep(h, txn.id, 2, account.id, 'premium');

    const keyResult = await h.crm.grant_api_key({ accountId: account.id, scope: 'write' });
    h.journal.append({
      txnId: txn.id,
      seq: 3,
      server: 'crm',
      toolName: 'grant_api_key',
      input: { accountId: account.id, scope: 'write' },
      output: keyResult,
      priorState: null,
      resourceRef: null,
      resourceVersion: null,
      reversibility: h.classifier.classifyStatic(h.registry.lookup('grant_api_key')),
      status: 'EXECUTED',
      compensationNote: null,
    });

    const report = await h.rollbacks.run(txn.id, { conflictPolicy: 'abort', reason: 'test', dryRun: false });
    assert(report.status === 'ROLLED_BACK', `expected ROLLED_BACK, got ${report.status}`);
    assert(report.reversed.length === 3, `expected 3 reversed, got ${report.reversed.length}`);
    assert(report.notReversed.length === 0, `expected 0 notReversed, got ${report.notReversed.length}`);
  });

  // TEST 2 — RESTORATIVE pre-read captured correctly.
  await runTest(2, 'RESTORATIVE pre-read restores prior tier', async () => {
    const h = makeHarness();
    const txn = h.txns.open({ label: 'test2', actor: 'agent:test', scope: ['crm'], ttlSeconds: 3600 });
    // Account creation is setup, not part of the journaled transaction — this
    // test is specifically about update_tier's own compensation, not about
    // rolling back the account's existence too (which a full LIFO rollback of
    // a journaled create_account would also correctly do, deleting it).
    const account = await h.crm.create_account({ name: 'Test2 Co', domain: 'test2.example' });
    assert(account.tier === 'basic', 'fresh account should start at basic tier');

    await appendUpdateTierStep(h, txn.id, 1, account.id, 'premium');

    await h.rollbacks.run(txn.id, { conflictPolicy: 'abort', reason: 'test', dryRun: false });
    const after = await h.crm.get_account({ accountId: account.id });
    assert(after.tier === 'basic', `expected tier restored to basic, got ${after.tier}`);
  });

  // TEST 3 — a genuinely irreversible (TERMINAL) step creates PARTIAL.
  //
  // The task named capture_payment here, but capture_payment's spec has a real
  // inverse (refund_payment) and classifies MITIGABLE, not TERMINAL — rolling
  // it back alone actually succeeds (ROLLED_BACK), which contradicts the
  // stated PARTIAL/manualInstruction expectation. issue_payout is this
  // project's only TERMINAL tool (inverse: null), which is what the test
  // title and EXPECT block actually describe, so that's used here instead.
  await runTest(3, 'TERMINAL step creates PARTIAL', async () => {
    const h = makeHarness();
    const txn = h.txns.open({ label: 'test3', actor: 'agent:test', scope: ['crm', 'billing'], ttlSeconds: 3600 });
    const account = await appendCreatedAccount(h, txn.id, 1, 'Test3 Co', 'test3.example');

    const payout = await h.billing.issue_payout({ accountId: account.id, amount: 500 });
    h.journal.append({
      txnId: txn.id,
      seq: 2,
      server: 'billing',
      toolName: 'issue_payout',
      input: { accountId: account.id, amount: 500 },
      output: payout,
      priorState: null,
      resourceRef: null,
      resourceVersion: null,
      reversibility: h.classifier.classifyStatic(h.registry.lookup('issue_payout')),
      status: 'EXECUTED',
      compensationNote: null,
    });

    const report = await h.rollbacks.run(txn.id, { conflictPolicy: 'abort', reason: 'test', dryRun: false });
    assert(report.status === 'PARTIAL', `expected PARTIAL, got ${report.status}`);
    const payoutReport = report.notReversed.find((r) => r.tool === 'issue_payout');
    assert(payoutReport !== undefined, 'expected issue_payout in notReversed');
    assert(!!payoutReport!.manualAction, 'expected manualAction to be present');
  });

  // TEST 4 — conflict detection.
  await runTest(4, 'Conflict detection aborts without overwriting', async () => {
    const h = makeHarness();
    const txn = h.txns.open({ label: 'test4', actor: 'agent:test', scope: ['crm'], ttlSeconds: 3600 });
    const account = await appendCreatedAccount(h, txn.id, 1, 'Test4 Co', 'test4.example');

    await appendUpdateTierStep(h, txn.id, 2, account.id, 'premium');

    // Simulate a concurrent edit made outside this transaction, after our
    // step's pre-read/write — this bumps the account's version.
    await h.crm.update_tier({ accountId: account.id, tier: 'enterprise' });

    const report = await h.rollbacks.run(txn.id, { conflictPolicy: 'abort', reason: 'test', dryRun: false });
    const conflictEntry = report.notReversed.find((r) => r.outcome === 'CONFLICT');
    assert(conflictEntry !== undefined, `expected a CONFLICT outcome, got: ${JSON.stringify(report.notReversed)}`);

    const after = await h.crm.get_account({ accountId: account.id });
    assert(after.tier === 'enterprise', `expected the concurrent edit (enterprise) to survive untouched, got ${after.tier}`);
  });

  // TEST 5 — compensator deliberately broken.
  await runTest(5, 'Broken compensator surfaces as COMPENSATION_FAILED, PARTIAL', async () => {
    const h = makeHarness();
    const txn = h.txns.open({ label: 'test5', actor: 'agent:test', scope: ['crm'], ttlSeconds: 3600 });
    const account = await appendCreatedAccount(h, txn.id, 1, 'Test5 Co', 'test5.example');

    const brokenExecutor: ToolExecutor = async (toolName, args, idempotencyKey) => {
      if (toolName === 'delete_account') throw new Error('simulated compensator failure');
      return h.defaultExecutor(toolName, args, idempotencyKey);
    };
    h.rollbacks.setToolExecutor(brokenExecutor);

    const report = await h.rollbacks.run(txn.id, { conflictPolicy: 'abort', reason: 'test', dryRun: false });
    assert(report.status === 'PARTIAL', `expected PARTIAL, got ${report.status}`);
    const failedEntry = report.notReversed.find((r) => r.tool === 'create_account');
    assert(failedEntry !== undefined && failedEntry.outcome === 'FAILED', 'expected create_account to be reported FAILED');

    // account must still exist — the broken compensator never actually ran successfully.
    const stillThere = (await h.crm.list_accounts()).some((a) => a.id === account.id);
    assert(stillThere, 'expected account to still exist after a failed compensator');
  });

  // TEST 6 — rollback is idempotent.
  await runTest(6, 'Rollback is idempotent (no duplicate compensation)', async () => {
    const h = makeHarness();
    const txn = h.txns.open({ label: 'test6', actor: 'agent:test', scope: ['crm'], ttlSeconds: 3600 });
    const account = await appendCreatedAccount(h, txn.id, 1, 'Test6 Co', 'test6.example');

    let deleteCalls = 0;
    const countingExecutor: ToolExecutor = async (toolName, args, idempotencyKey) => {
      if (toolName === 'delete_account') deleteCalls++;
      return h.defaultExecutor(toolName, args, idempotencyKey);
    };
    h.rollbacks.setToolExecutor(countingExecutor);

    const report1 = await h.rollbacks.run(txn.id, { conflictPolicy: 'abort', reason: 'first', dryRun: false });
    const report2 = await h.rollbacks.run(txn.id, { conflictPolicy: 'abort', reason: 'second', dryRun: false });

    assert(report1.status === report2.status, 'expected same status on both calls');
    assert(report2.reversed.length === report1.reversed.length, 'expected same reversed count on both calls');
    assert(deleteCalls === 1, `expected delete_account to be invoked exactly once, got ${deleteCalls}`);
    assert(account.id === account.id, 'sanity'); // keep account referenced
  });

  // TEST 7 — non-owner, non-operator cannot rollback.
  // RollbackGuard is exercised directly here, not through rollback_transaction
  // itself: no real MCP client can populate ctx.metadata/ctx.auth, so the
  // guard is no longer wired to the live tool (see transaction.tools.ts). This
  // still validates the guard's own ownership/role logic in isolation.
  await runTest(7, 'Non-owner without operator role cannot rollback', async () => {
    const h = makeHarness();
    const txn = h.txns.open({ label: 'test7', actor: 'agent:alice', scope: ['crm'], ttlSeconds: 3600 });

    const guard = new RollbackGuard();
    const logger = { debug() {}, info() {}, warn() {}, error() {} };

    let forbidden = false;
    try {
      await guard.canActivate({
        requestId: 'r1',
        toolName: 'rollback_transaction',
        logger,
        metadata: { transactionId: txn.id },
        auth: { subject: 'agent:bob' },
      } as any);
    } catch (err) {
      forbidden = err instanceof TxnError && err.code === 'ROLLBACK_FORBIDDEN';
    }
    assert(forbidden, 'expected TxnError with code ROLLBACK_FORBIDDEN');
  });

  console.log(`Results: ${passed}/7 passed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
