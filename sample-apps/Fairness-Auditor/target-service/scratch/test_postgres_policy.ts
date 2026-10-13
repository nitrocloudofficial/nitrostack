import { PolicyService } from '../src/modules/policy/policy.service.js';

async function main() {
  console.log('[Postgres Policy Test] Initializing PolicyService...');
  const policyService = new PolicyService();

  console.log('[Postgres Policy Test] Calling getActive()...');
  const activePolicy = await policyService.getActive();
  console.log('[Postgres Policy Test] getActive() returned row:');
  console.log(JSON.stringify(activePolicy, null, 2));

  console.log('\n[Postgres Policy Test] Calling getHistory()...');
  const history = await policyService.getHistory();
  console.log('[Postgres Policy Test] getHistory() returned count:', history.length);
  if (history.length > 0) {
    console.log('[Postgres Policy Test] getHistory() first row:');
    console.log(JSON.stringify(history[0], null, 2));
  } else {
    console.log('[Postgres Policy Test] getHistory() returned empty array (no rows in mitigation_policy table yet).');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[Postgres Policy Test Error]:', err);
  process.exit(1);
});
