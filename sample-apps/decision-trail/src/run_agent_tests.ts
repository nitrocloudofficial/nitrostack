import { runAgentOrchestration } from './standalone_agent_test.js';

async function main() {
  console.log('🤖 STARTING STANDALONE AGENTIC ORCHESTRATION VERIFICATION');

  // Question 1: Direct match
  await runAgentOrchestration('What database did we choose and why?');

  // Question 2: Graph / Supersedes check
  await runAgentOrchestration('Are we still using PostgreSQL, or did that change?');

  // Question 3: Refusal test
  await runAgentOrchestration('Why did we choose our CI/CD provider?');

  console.log('✨ All 3 Standalone Agent Tests Completed!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Agent Test Execution Error:', err);
  process.exit(1);
});
