import { formatForWidget, summarizeOutput } from './src/integration.js';

const mockOutput = {
  originalRequest: { text: 'Book meeting with eng for incident war-room', userId: 'user-1', timestamp: '2025-01-15T10:00:00Z' },
  schedulingResult: { time: '2025-01-15T14:00:00Z', attendees: ['alice', 'bob'], duration: 60, confidence: 'high' as const },
  delegationResult: { taskId: 'task-001', owner: 'alice', deadline: '2025-01-17T17:00:00Z', priority: 'high' as const, reasoning: 'Lowest workload' },
  adminResult: { approved: true, reason: 'Within policy', escalationRequired: false },
  finalMessage: { text: 'Meeting booked for Tuesday 2pm. Alice owns postmortem.', channel: '#incidents', format: 'slack' as const },
};

console.log('Widget data:', JSON.stringify(formatForWidget(mockOutput), null, 2));
console.log('Summary:', summarizeOutput(mockOutput));
