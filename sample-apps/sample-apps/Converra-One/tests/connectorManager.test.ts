import { ConnectorManagerService } from '../src/services/ConnectorManager.service.js';

async function testConnectorManager() {
  console.log('🧪 Testing ConnectorManagerService Integration Harvest...');
  const manager = ConnectorManagerService.getInstance();
  const messages = await manager.fetchAllMessages();

  console.assert(Array.isArray(messages), 'fetchAllMessages should return an array');
  console.assert(messages.length > 0, 'Should harvest aggregated messages across active connectors');

  const statuses = await manager.getPlatformStatuses();
  console.assert(statuses.length >= 5, 'Should return platform status for all configured connectors');
  console.log(`✅ ConnectorManagerService test passed! Harvested ${messages.length} messages from ${statuses.length} platforms.`);
}

testConnectorManager().catch(err => {
  console.error('❌ ConnectorManagerService test failed:', err);
  process.exit(1);
});
