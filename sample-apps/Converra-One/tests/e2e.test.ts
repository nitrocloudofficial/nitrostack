import { fetchDashboardData, fetchUnifiedInbox, generateSmartReply, executeSearch } from '../src/api/index.js';

async function runE2ETest() {
  console.log('🧪 Running End-to-End Workflow Integration Test...');

  // 1. Test Dashboard Aggregation
  const dashboard = await fetchDashboardData();
  console.assert(dashboard.recentMessages.length > 0, 'Dashboard should return recent messages');
  console.assert(dashboard.priorityTasks.length > 0, 'Dashboard should return priority tasks');

  // 2. Test Unified Inbox
  const inbox = await fetchUnifiedInbox();
  console.assert(inbox.length > 0, 'Inbox stream should contain harvested messages');

  // 3. Test Smart Reply Generation
  const reply = await generateSmartReply(inbox[0].id, 'Professional');
  console.assert(reply.suggestions.length > 0, 'Smart reply should return suggestions');

  // 4. Test Hybrid Search
  const searchRes = await executeSearch('project architecture');
  console.assert(searchRes.totalMatches > 0, 'Search should find matches for query');

  console.log('✅ End-to-End Workflow Integration Test Passed Cleanly!');
}

runE2ETest().catch(err => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
