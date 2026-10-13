import { ConnectorCapabilityRegistryService } from '../src/services/ConnectorCapabilityRegistry.service.js';
import { PlatformType } from '../src/shared/enums/platform.enum.js';

async function testCapabilitiesRegistry() {
  console.log('🧪 Testing ConnectorCapabilityRegistryService...');
  const registry = ConnectorCapabilityRegistryService.getInstance();
  const gmailCaps = registry.getCapabilities(PlatformType.GMAIL);

  console.assert(gmailCaps.supportsSearch === true, 'Gmail should support search');
  console.assert(gmailCaps.supportsReply === true, 'Gmail should support reply');
  console.assert(gmailCaps.supportsCalendar === false, 'Gmail does not directly handle calendar events');
  console.log('✅ ConnectorCapabilityRegistryService test passed!');
}

testCapabilitiesRegistry().catch(err => {
  console.error('❌ ConnectorCapabilityRegistryService test failed:', err);
  process.exit(1);
});
