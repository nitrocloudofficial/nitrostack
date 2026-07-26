/**
 * Care Mediator MCP Server — Smoke Test
 *
 * Connects via STDIO to dist/index.js, lists all registered tools,
 * then exercises each agent.
 *
 * Run: node smoke-test.mjs
 * (requires `npm run build` in root first, and backend running on :4000)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
  });

  const client = new Client({ name: 'care-mediator-smoke-test', version: '1.0.0' });
  await client.connect(transport);

  // ── 1. List all registered tools ─────────────────────────────────────────
  const tools = await client.listTools();
  console.log('=== TOOLS REGISTERED ===');
  console.log(tools.tools.map((t) => `  • ${t.name}`).join('\n'));
  console.log('');

  // ── 2. Hospital — CGHS rate lookup ───────────────────────────────────────
  console.log('=== get_treatment_estimate (CGHS-ORTH-014, Chennai) ===');
  const estimate = await client.callTool({
    name: 'get_treatment_estimate',
    arguments: { procedureCode: 'CGHS-ORTH-014', city: 'Chennai' },
  });
  console.log(JSON.stringify(estimate.content, null, 2));

  // ── 3. Insurer — static claim status ─────────────────────────────────────
  console.log('\n=== get_claim_status (PAT-01) ===');
  const claim = await client.callTool({
    name: 'get_claim_status',
    arguments: { patientId: 'PAT-01' },
  });
  console.log(JSON.stringify(claim.content, null, 2));

  // ── 4. Lender — loan offers with true cost ────────────────────────────────
  console.log('\n=== get_loan_offers ===');
  const loanOffers = await client.callTool({
    name: 'get_loan_offers',
    arguments: {},
  });
  console.log(JSON.stringify(loanOffers.content, null, 2));

  // ── 5. Objectivity — raw input check (gotcha case) ───────────────────────
  console.log('\n=== build_objective_case_report (PAT-02, overbilled) ===');
  const objReport = await client.callTool({
    name: 'build_objective_case_report',
    arguments: {
      patientId: 'PAT-02',
      procedureCode: 'CGHS-ORTH-014',
      city: 'Chennai',
      hospitalBilledAmount: 420000,
    },
  });
  console.log(JSON.stringify(objReport.content, null, 2));

  // ── 6. Orchestrator — raw reconcile (no backend needed) ──────────────────
  console.log('\n=== reconcile_case (PAT-01, clean) ===');
  const reconcileClean = await client.callTool({
    name: 'reconcile_case',
    arguments: {
      patientId: 'PAT-01',
      procedureCode: 'CGHS-CARD-001',
      city: 'Chennai',
      hospitalBilledAmount: 65000,
    },
  });
  console.log(JSON.stringify(reconcileClean.content, null, 2));

  // ── 7. Orchestrator — list live cases (needs backend on :4000) ────────────
  console.log('\n=== list_cases (live backend) ===');
  try {
    const caselist = await client.callTool({ name: 'list_cases', arguments: {} });
    console.log(JSON.stringify(caselist.content, null, 2));
  } catch (err) {
    console.warn('  ⚠  list_cases failed (backend may not be running):', err.message);
  }

  // ── 8. Orchestrator — reconcile by live caseId ───────────────────────────
  console.log('\n=== reconcile_case_by_id (clean-case) ===');
  try {
    const liveCase = await client.callTool({
      name: 'reconcile_case_by_id',
      arguments: { caseId: 'clean-case' },
    });
    console.log(JSON.stringify(liveCase.content, null, 2));
  } catch (err) {
    console.warn('  ⚠  reconcile_case_by_id failed (backend may not be running):', err.message);
  }

  // ── 9. Insurer — get live case status ─────────────────────────────────────
  console.log('\n=== get_live_case_status (gotcha-case) ===');
  try {
    const liveStatus = await client.callTool({
      name: 'get_live_case_status',
      arguments: { caseId: 'gotcha-case' },
    });
    console.log(JSON.stringify(liveStatus.content, null, 2));
  } catch (err) {
    console.warn('  ⚠  get_live_case_status failed (backend may not be running):', err.message);
  }

  await client.close();
  console.log('\n✅ Smoke test complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ SMOKE TEST FAILED:', err);
  process.exit(1);
});
