import assert from 'node:assert/strict';
import { buildGoogleCalendarEventPayload } from '../src/modules/assistant/google-calendar.js';

const payload = buildGoogleCalendarEventPayload({
  title: 'Design review',
  startTime: '2026-07-25T09:00:00.000Z',
  endTime: '2026-07-25T10:00:00.000Z',
  description: 'Sync from assistant app'
});

assert.equal(payload.summary, 'Design review');
assert.equal(payload.description, 'Sync from assistant app');
assert.equal(payload.start.dateTime, '2026-07-25T09:00:00.000Z');
assert.equal(payload.end.dateTime, '2026-07-25T10:00:00.000Z');
console.log('calendar payload test passed');
