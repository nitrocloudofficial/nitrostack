import { SyncSchedulerService } from '../src/services/SyncScheduler.service.js';
import { PlatformType } from '../src/shared/enums/platform.enum.js';

async function testSyncScheduler() {
  console.log('🧪 Testing SyncSchedulerService...');
  const scheduler = SyncSchedulerService.getInstance();
  const res = await scheduler.triggerSync(PlatformType.GMAIL);

  console.assert(res.syncedCount >= 0, 'Synced count should be >= 0');
  console.assert(res.timestamp instanceof Date, 'Timestamp should be valid Date');
  console.log('✅ SyncSchedulerService test passed!');
}

testSyncScheduler().catch(err => {
  console.error('❌ SyncSchedulerService test failed:', err);
  process.exit(1);
});
