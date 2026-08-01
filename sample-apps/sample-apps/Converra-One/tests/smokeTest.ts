import { ConnectorManagerService } from '../src/services/ConnectorManager.service.js';
import { OrchestratorAgent } from '../src/modules/orchestrator/OrchestratorAgent.js';
import { DashboardWorkflowService } from '../src/workflows/DashboardWorkflow.service.js';
import { fetchDashboardData, fetchUnifiedInbox, fetchAgentHealthMetrics } from '../src/api/index.js';

interface SubsystemCheck {
  subsystem: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

async function runMasterSmokeTest() {
  console.log('===========================================================');
  console.log('🚀 CONVERRA ONE - MASTER ENTERPRISE SMOKE TEST SUITE');
  console.log('===========================================================');

  const results: SubsystemCheck[] = [];

  // 1. Check ConnectorManager & Integration Adapters
  const t1 = Date.now();
  try {
    const manager = ConnectorManagerService.getInstance();
    const msgs = await manager.fetchAllMessages();
    results.push({
      subsystem: 'ConnectorManager & Integration Adapters',
      passed: msgs.length > 0,
      message: `Harvested ${msgs.length} messages across active platform connectors`,
      durationMs: Date.now() - t1
    });
  } catch (err: unknown) {
    results.push({
      subsystem: 'ConnectorManager & Integration Adapters',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t1
    });
  }

  // 2. Check OrchestratorAgent Multi-Agent Pipeline
  const t2 = Date.now();
  try {
    const orchestrator = new OrchestratorAgent();
    const res = await orchestrator.execute({ workflowName: 'SmokeTest', triggerSource: 'CLI' });
    const timeline = OrchestratorAgent.getTimeline();
    results.push({
      subsystem: 'Multi-Agent Orchestration & Event Bus',
      passed: res.success && timeline.length >= 7,
      message: `Pipeline succeeded in ${res.executionTimeMs}ms with ${timeline.length} timeline traces`,
      durationMs: Date.now() - t2
    });
  } catch (err: unknown) {
    results.push({
      subsystem: 'Multi-Agent Orchestration & Event Bus',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t2
    });
  }

  // 3. Check Workflow Services Layer
  const t3 = Date.now();
  try {
    const service = new DashboardWorkflowService();
    const data = await service.getDashboardData();
    results.push({
      subsystem: 'Workflow Services Layer',
      passed: Boolean(data && data.metrics),
      message: `Dashboard workflow synthesized ${data.recentMessages.length} priority items`,
      durationMs: Date.now() - t3
    });
  } catch (err: unknown) {
    results.push({
      subsystem: 'Workflow Services Layer',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t3
    });
  }

  // 4. Check API Layer Wrappers
  const t4 = Date.now();
  try {
    const dash = await fetchDashboardData();
    const inbox = await fetchUnifiedInbox();
    const health = await fetchAgentHealthMetrics();
    results.push({
      subsystem: 'Explicit API Layer',
      passed: dash.recentMessages.length > 0 && inbox.length > 0 && health.length > 0,
      message: `API Layer validated ${inbox.length} inbox streams & ${health.length} agent metrics`,
      durationMs: Date.now() - t4
    });
  } catch (err: unknown) {
    results.push({
      subsystem: 'Explicit API Layer',
      passed: false,
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t4
    });
  }

  console.log('\n--- Smoke Test Results Summary ---');
  let allPassed = true;
  results.forEach((r) => {
    const icon = r.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} ${r.subsystem}: ${r.message} (${r.durationMs}ms)`);
    if (!r.passed) allPassed = false;
  });

  console.log('===========================================================');
  if (allPassed) {
    console.log('🎉 ALL SUBSYSTEMS PASSED! CONVERRA ONE IS READY FOR DEMO & DEPLOYMENT.');
    console.log('===========================================================');
    process.exit(0);
  } else {
    console.error('💥 SMOKE TEST FAILED: One or more subsystems encountered errors.');
    console.log('===========================================================');
    process.exit(1);
  }
}

runMasterSmokeTest();
