import { PriorityAgent } from '../src/modules/priority/PriorityAgent.js';
import { MessageStatus } from '../src/shared/enums/message.enum.js';
import { PriorityLevel } from '../src/shared/enums/priority.enum.js';
import { PlatformType } from '../src/shared/enums/platform.enum.js';

async function testPriorityAgent() {
  console.log('🧪 Testing PriorityAgent...');
  const agent = new PriorityAgent();
  const testMsg = {
    id: 'test-01',
    conversationId: 'c1',
    platform: PlatformType.GMAIL,
    externalId: 'ext1',
    sender: { id: 's1', name: 'Test User' },
    recipients: [],
    subject: 'URGENT: Raft parameters',
    content: 'Review immediately',
    timestamp: new Date(),
    status: MessageStatus.UNREAD,
    priority: PriorityLevel.MEDIUM
  };

  const response = await agent.execute([testMsg]);
  console.assert(response.success === true, 'PriorityAgent failed');
  console.assert(response.data?.urgentCount === 1, 'Should classify subject with URGENT');
  console.log('✅ PriorityAgent test passed!');
}

testPriorityAgent().catch(err => {
  console.error('❌ PriorityAgent test failed:', err);
  process.exit(1);
});
