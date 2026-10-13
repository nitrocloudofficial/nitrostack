import assert from 'node:assert/strict';
import { AssistantTools } from '../src/modules/assistant/assistant.tools.js';

async function testDynamicRescheduling() {
  console.log('--- Testing Dynamic Task Rescheduling Scenario ---');

  const tools = new AssistantTools();
  const mockCtx = { logger: console } as any;

  // Scenario: User creates two overlapping tasks for today
  // Task 1: 2:00 PM to 3:00 PM
  // Task 2: 2:30 PM to 3:30 PM (COLLISION!)
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const overlappingTasks = [
    {
      title: 'Sprint Planning',
      startTime: `${dateStr}T14:00:00+05:30`,
      endTime: `${dateStr}T15:00:00+05:30`,
      status: 'pending',
      priority: 'high'
    },
    {
      title: 'Client Demo',
      startTime: `${dateStr}T14:30:00+05:30`, // overlaps with Sprint Planning!
      endTime: `${dateStr}T15:30:00+05:30`,
      status: 'pending',
      priority: 'high'
    }
  ];

  console.log('Input Overlapping Tasks:');
  console.log(` Task 1 (${overlappingTasks[0].title}): 14:00 - 15:00`);
  console.log(` Task 2 (${overlappingTasks[1].title}): 14:30 - 15:30 [COLLISION DETECTED]`);

  const result = await tools.rescheduleConflicts({ tasks: overlappingTasks }, mockCtx);

  console.log('\nRescheduling Result:');
  console.log(` Summary: ${result.summary}`);
  console.log(` Rescheduled Count: ${result.rescheduledCount}`);

  assert.equal(result.status, 'success');
  assert.equal(result.rescheduledCount, 1);
  assert.equal(result.suggestions.length, 2);

  const t1 = result.suggestions[0];
  const t2 = result.suggestions[1];

  console.log(`\nUpdated Task 1 (${t1.title}): ${t1.startTime} to ${t1.endTime}`);
  console.log(`Updated Task 2 (${t2.title}): ${t2.startTime} to ${t2.endTime} [Status: ${t2.status}]`);

  // Assert Task 2 start time is shifted to Task 1 end time
  const t1End = new Date(t1.endTime as string).getTime();
  const t2Start = new Date(t2.startTime as string).getTime();

  assert.equal(t2Start, t1End, 'Task 2 start time should equal Task 1 end time to prevent overlap');
  assert.equal(t2.status, 'rescheduled');

  console.log('\n✅ Dynamic Task Rescheduling test passed successfully!\n');
}

testDynamicRescheduling().catch((err) => {
  console.error('❌ Dynamic Task Rescheduling test failed:', err);
  process.exit(1);
});
