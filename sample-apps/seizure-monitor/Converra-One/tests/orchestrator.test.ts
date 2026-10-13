import { OrchestratorAgent } from '../src/modules/orchestrator/OrchestratorAgent.js';

async function testOrchestratorAgent() {
  console.log('🧪 Testing OrchestratorAgent Master Pipeline...');
  const agent = new OrchestratorAgent();
  const response = await agent.execute({ workflowName: 'DashboardWorkflow', triggerSource: 'TEST_SUITE' });

  console.assert(response.success === true, 'Orchestrator execution failed');
  console.assert(response.data?.metrics !== undefined, 'Dashboard metrics missing');
  console.assert(response.data?.recentMessages.length > 0, 'Recent messages missing');
  console.assert(response.data?.priorityTasks.length > 0, 'Priority tasks missing');

  const timeline = OrchestratorAgent.getTimeline();
  console.assert(timeline.length >= 7, 'Timeline should record 7 sequential agent execution steps');

  console.log(`✅ OrchestratorAgent test passed in ${response.executionTimeMs}ms! Recorded ${timeline.length} timeline entries.`);
}

testOrchestratorAgent().catch(err => {
  console.error('❌ OrchestratorAgent test failed:', err);
  process.exit(1);
});
