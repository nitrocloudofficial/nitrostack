import { CollectorAgent } from '../src/modules/collector/CollectorAgent.js';

async function testCollectorAgent() {
  console.log('🧪 Testing CollectorAgent...');
  const agent = new CollectorAgent();
  const response = await agent.execute();

  console.assert(response.success === true, 'CollectorAgent execution failed');
  console.assert(Array.isArray(response.data), 'CollectorAgent output should be an array');
  console.assert(response.data!.length > 0, 'CollectorAgent returned zero messages');
  console.log(`✅ CollectorAgent test passed! Harvested ${response.data!.length} messages in ${response.executionTimeMs}ms`);
}

testCollectorAgent().catch(err => {
  console.error('❌ CollectorAgent test failed:', err);
  process.exit(1);
});
