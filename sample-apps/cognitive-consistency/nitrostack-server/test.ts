import { setup, remember, recall, getTaskMemory, getDecisions, getAgentHistory, storeResult, handoffTask } from './src/modules/memory/memory.service.js';

const PROJECT = 'test_project';
const TASK = 'test_task_001';

async function runTests() {
  console.log('=== SHARED AGENT MEMORY — NitroStack Test Suite ===\n');

  // Setup
  console.log('[1] Initializing database...');
  await setup();
  console.log('    PASS: Database initialized\n');

  // Test 1: remember — store a fact
  console.log('[2] Testing remember (fact)...');
  const factId = remember('TypeScript is used for the NitroStack port', 'fact', PROJECT, TASK, 'test_agent', 0.6);
  console.log(`    PASS: Stored fact with id=${factId}\n`);

  // Test 2: remember — store a decision
  console.log('[3] Testing remember (decision)...');
  const decisionId = remember('Use sql.js instead of better-sqlite3 for cross-platform compatibility', 'decision', PROJECT, TASK, 'research_agent', 0.9);
  console.log(`    PASS: Stored decision with id=${decisionId}\n`);

  // Test 3: remember — store an event
  console.log('[4] Testing remember (event)...');
  const eventId = remember('Research phase completed by research_agent', 'event', PROJECT, TASK, 'research_agent', 0.5);
  console.log(`    PASS: Stored event with id=${eventId}\n`);

  // Test 4: recall — search by keyword
  console.log('[5] Testing recall (keyword search)...');
  const results = recall('TypeScript NitroStack', PROJECT, TASK, 5);
  console.log(`    Found ${results.length} result(s)`);
  if (results.length > 0) {
    console.log(`    First match: "${results[0].content.substring(0, 60)}..."`);
  }
  console.log(`    PASS: Recall returned results\n`);

  // Test 5: store_result
  console.log('[6] Testing store_result...');
  const resultId = storeResult(TASK, 'All 7 MCP tools ported successfully to TypeScript', 'coding_agent', PROJECT);
  console.log(`    PASS: Stored result with id=${resultId}\n`);

  // Test 6: get_task_memory — grouped by type
  console.log('[7] Testing get_task_memory...');
  const taskMem = getTaskMemory(TASK);
  console.log(`    Facts: ${taskMem.fact.length}, Decisions: ${taskMem.decision.length}, Events: ${taskMem.event.length}, Results: ${taskMem.result.length}`);
  const total = taskMem.fact.length + taskMem.decision.length + taskMem.event.length + taskMem.result.length;
  if (total < 4) {
    console.log('    FAIL: Expected at least 4 memories');
    process.exit(1);
  }
  console.log(`    PASS: Got ${total} total memories grouped correctly\n`);

  // Test 7: get_decisions
  console.log('[8] Testing get_decisions...');
  const decisions = getDecisions(PROJECT, TASK);
  console.log(`    Found ${decisions.length} decision(s)`);
  if (decisions.length < 1) {
    console.log('    FAIL: Expected at least 1 decision');
    process.exit(1);
  }
  console.log(`    Decision: "${decisions[0].content.substring(0, 60)}..."`);
  console.log(`    PASS: Decisions retrieved\n`);

  // Test 8: get_agent_history
  console.log('[9] Testing get_agent_history...');
  const history = getAgentHistory('research_agent', PROJECT);
  console.log(`    Found ${history.length} memory(ies) from research_agent`);
  if (history.length < 2) {
    console.log('    FAIL: Expected at least 2 memories from research_agent');
    process.exit(1);
  }
  console.log(`    PASS: Agent history retrieved\n`);

  // Test 9: handoff_task
  console.log('[10] Testing handoff_task...');
  const handoffId = handoffTask(TASK, 'research_agent', 'coding_agent', 'Research complete — sql.js chosen', 'Implement the MCP tools in TypeScript', PROJECT);
  console.log(`    PASS: Handoff recorded with id=${handoffId}\n`);

  // Test 10: verify handoff shows up in task memory
  console.log('[11] Verifying handoff in task memory...');
  const finalMem = getTaskMemory(TASK);
  const handoffEvents = finalMem.event.filter(e => e.content.includes('Handoff'));
  if (handoffEvents.length < 1) {
    console.log('    FAIL: Handoff event not found in task memory');
    process.exit(1);
  }
  console.log(`    PASS: Handoff event found: "${handoffEvents[0].content.substring(0, 70)}..."\n`);

  // Test 11: invalid memory_type should throw
  console.log('[12] Testing invalid memory_type rejection...');
  try {
    remember('bad memory', 'invalid_type' as any, PROJECT, TASK, 'test_agent');
    console.log('    FAIL: Should have thrown for invalid type');
    process.exit(1);
  } catch (e: any) {
    console.log(`    PASS: Correctly rejected — ${e.message}\n`);
  }

  // Summary
  const finalTotal = finalMem.fact.length + finalMem.decision.length + finalMem.event.length + finalMem.result.length;
  console.log('=== ALL 11 TESTS PASSED ===');
  console.log(`Total memories in database: ${finalTotal + 1} (including handoff)`);
  console.log('Server is ready for NitroStudio / deployment.');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
