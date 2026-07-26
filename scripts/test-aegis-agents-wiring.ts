import { AegisAgents } from '../src/agents/AegisAgents.js';
import { AegisOrchestratorTools } from '../src/agents/aegis-agents.tools.js';

async function testAegisAgentsWiring() {
  console.log('Testing AegisAgents wiring via AegisOrchestratorTools...\n');
  const agents = new AegisAgents();
  const orchestrator = new AegisOrchestratorTools(agents);
  const mockCtx = { logger: { info: console.log, error: console.error } } as any;

  console.log('1. Testing Safe Scenario (Score < 80)...');
  const safeResult = await orchestrator.runThreatAnalysis({ scenario: 'safe' }, mockCtx);
  console.log('\nSafe Scenario Result:', JSON.stringify({
    adjudication_id: safeResult.adjudication_id,
    threat_score: safeResult.threat_score,
    threat_level: safeResult.threat_level,
    requires_hitl: safeResult.requires_hitl,
    resolution: safeResult.resolution,
  }, null, 2));

  console.log('\n2. Testing Critical Scenario (Score >= 80) with HITL Auto-Approval...');
  
  // Schedule auto-approval after 500ms so HITL gate unblocks
  setTimeout(async () => {
    console.log('\n[TEST HARNESS] Approving freeze action via aegis_approve_freeze_report...');
    const freezeRes = await orchestrator.approveFreezeReport({ approved: true, officer_id: 'AZ-99' }, mockCtx);
    console.log('[TEST HARNESS] Freeze Approval Result:', freezeRes);
  }, 500);

  const criticalResult = await orchestrator.runThreatAnalysis({ scenario: 'high' }, mockCtx);
  console.log('\nCritical Scenario Final Result:', JSON.stringify({
    adjudication_id: criticalResult.adjudication_id,
    threat_score: criticalResult.threat_score,
    threat_level: criticalResult.threat_level,
    requires_hitl: criticalResult.requires_hitl,
    resolution: criticalResult.resolution,
    mha_dispatch: criticalResult.mha_dispatch,
  }, null, 2));
}

testAegisAgentsWiring().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
