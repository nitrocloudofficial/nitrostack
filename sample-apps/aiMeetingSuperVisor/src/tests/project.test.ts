import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MeetingsService } from '../modules/meetings/meetings.service.js';
import { TasksService } from '../modules/tasks/tasks.service.js';
import { TasksTools } from '../modules/tasks/tasks.tools.js';
import { CalendarService } from '../modules/calendar/calendar.service.js';
import { DatabaseService } from '../services/database.service.js';
import { ExecutionContext } from '@nitrostack/core';

// Mock Database Service to intercept and mock Supabase queries
class MockDatabaseService {
  public operations: Array<{
    type: 'table' | 'select' | 'order' | 'eq' | 'single' | 'insert' | 'update';
    args: any[];
  }> = [];

  public insertCalls: Array<{ table: string; data: any }> = [];
  public updateCalls: Array<{ table: string; data: any }> = [];

  private currentTable: string = '';
  public mockResponses: Record<string, any> = {};

  table(name: string) {
    this.currentTable = name;
    this.operations.push({ type: 'table', args: [name] });
    return this;
  }

  select(...args: any[]) {
    this.operations.push({ type: 'select', args });
    return this;
  }

  order(...args: any[]) {
    this.operations.push({ type: 'order', args });
    return this;
  }

  eq(...args: any[]) {
    this.operations.push({ type: 'eq', args });
    return this;
  }

  single(...args: any[]) {
    this.operations.push({ type: 'single', args });
    return this;
  }

  insert(data: any) {
    this.operations.push({ type: 'insert', args: [data] });
    this.insertCalls.push({ table: this.currentTable, data });
    return this;
  }

  update(data: any) {
    this.operations.push({ type: 'update', args: [data] });
    this.updateCalls.push({ table: this.currentTable, data });
    return this;
  }

  then(onfulfilled: any) {
    const responseData = this.mockResponses[this.currentTable] ?? null;
    return Promise.resolve(onfulfilled({ data: responseData, error: null }));
  }
}

// Dummy execution context for tool calls
const dummyExecutionContext = {
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  },
  auth: {
    subject: 'test-user-id'
  }
} as unknown as ExecutionContext;

describe('Meeting Supervisor - Project Tests', () => {
  let mockDb: MockDatabaseService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
  });

  // Test Case 1: MeetingsService.create and MeetingsService.list
  test('Test Case 1: Create and list meetings', async () => {
    const meetingsService = new MeetingsService(mockDb as unknown as DatabaseService);

    const fakeMeeting = {
      id: 'meeting-uuid-123',
      title: 'Weekly Sync',
      scheduled_start: '2026-08-01T10:00:00Z',
      scheduled_end: '2026-08-01T10:30:00Z',
      status: 'scheduled'
    };

    mockDb.mockResponses['meetings'] = fakeMeeting;
    mockDb.mockResponses['meeting_participants'] = { success: true };

    const result = await meetingsService.create({
      title: 'Weekly Sync',
      scheduled_start: '2026-08-01T10:00:00Z',
      scheduled_end: '2026-08-01T10:30:00Z',
      organizer_id: 'test-user-id',
      participant_ids: ['user-a', 'user-b']
    });

    // Check created meeting output
    assert.deepEqual(result, fakeMeeting);

    // Verify correct inserts
    assert.equal(mockDb.insertCalls.length, 2);
    assert.equal(mockDb.insertCalls[0].table, 'meetings');
    assert.equal(mockDb.insertCalls[0].data.title, 'Weekly Sync');
    assert.equal(mockDb.insertCalls[1].table, 'meeting_participants');
    assert.equal(mockDb.insertCalls[1].data.length, 2);
    assert.equal(mockDb.insertCalls[1].data[0].user_id, 'user-a');

    // Test list functionality
    const fakeMeetingsList = [fakeMeeting];
    mockDb.mockResponses['meetings'] = fakeMeetingsList;

    const listResult = await meetingsService.list('scheduled');
    assert.deepEqual(listResult, fakeMeetingsList);

    // Check eq filters applied
    const eqOps = mockDb.operations.filter(op => op.type === 'eq');
    assert.ok(eqOps.some(op => op.args[0] === 'status' && op.args[1] === 'scheduled'));
  });

  // Test Case 2: MeetingsService.complete and MeetingsService.markMissed
  test('Test Case 2: Complete and mark meeting as missed', async () => {
    const meetingsService = new MeetingsService(mockDb as unknown as DatabaseService);

    // Complete meeting
    const completedMeeting = { id: 'meeting-123', status: 'completed', transcript: 'Hello world' };
    mockDb.mockResponses['meetings'] = completedMeeting;

    const completedResult = await meetingsService.complete('meeting-123', 'Hello world');
    assert.deepEqual(completedResult, completedMeeting);
    assert.equal(mockDb.updateCalls.length, 1);
    assert.equal(mockDb.updateCalls[0].table, 'meetings');
    assert.equal(mockDb.updateCalls[0].data.status, 'completed');
    assert.equal(mockDb.updateCalls[0].data.transcript, 'Hello world');

    // Mark missed meeting
    const missedMeeting = { id: 'meeting-123', status: 'missed' };
    mockDb.mockResponses['meetings'] = missedMeeting;

    const missedResult = await meetingsService.markMissed('meeting-123');
    assert.deepEqual(missedResult, missedMeeting);
    assert.equal(mockDb.updateCalls.length, 2);
    assert.equal(mockDb.updateCalls[1].table, 'meetings');
    assert.equal(mockDb.updateCalls[1].data.status, 'missed');
  });

  // Test Case 3: TasksService.create and TasksService.list
  test('Test Case 3: Create and list tasks', async () => {
    const tasksService = new TasksService(mockDb as unknown as DatabaseService);

    const fakeTask = {
      id: 'task-uuid-456',
      title: 'Action Item 1',
      description: 'Review PR',
      status: 'proposed',
      assigned_to: 'user-a'
    };
    mockDb.mockResponses['tasks'] = fakeTask;

    const result = await tasksService.create({
      title: 'Action Item 1',
      description: 'Review PR',
      assigned_to: 'user-a'
    });

    assert.deepEqual(result, fakeTask);
    assert.equal(mockDb.insertCalls.length, 1);
    assert.equal(mockDb.insertCalls[0].table, 'tasks');
    assert.equal(mockDb.insertCalls[0].data.status, 'proposed');

    // Listing tasks
    mockDb.mockResponses['tasks'] = [fakeTask];
    const tasksList = await tasksService.list('user-a', 'proposed');
    assert.deepEqual(tasksList, [fakeTask]);

    const eqOps = mockDb.operations.filter(op => op.type === 'eq');
    assert.ok(eqOps.some(op => op.args[0] === 'assigned_to' && op.args[1] === 'user-a'));
    assert.ok(eqOps.some(op => op.args[0] === 'status' && op.args[1] === 'proposed'));
  });

  // Test Case 4: TasksTools.decideTask Validation and Execution
  test('Test Case 4: Decide task and validate denial reason requirements', async () => {
    const tasksService = new TasksService(mockDb as unknown as DatabaseService);
    const tasksTools = new TasksTools(tasksService);

    // Test accept a task
    const acceptedTask = { id: 'task-123', status: 'accepted' };
    mockDb.mockResponses['tasks'] = acceptedTask;

    const acceptResult = await tasksTools.decideTask({ task_id: 'task-123', status: 'accepted' });
    assert.deepEqual(acceptResult, acceptedTask);
    assert.equal(mockDb.updateCalls.length, 1);
    assert.equal(mockDb.updateCalls[0].table, 'tasks');
    assert.equal(mockDb.updateCalls[0].data.status, 'accepted');

    // Test deny a task with reason
    const deniedTask = { id: 'task-123', status: 'denied', denial_reason: 'Too busy' };
    mockDb.mockResponses['tasks'] = deniedTask;

    const denyResult = await tasksTools.decideTask({ task_id: 'task-123', status: 'denied', denial_reason: 'Too busy' });
    assert.deepEqual(denyResult, deniedTask);
    assert.equal(mockDb.updateCalls.length, 2);
    assert.equal(mockDb.updateCalls[1].table, 'tasks');
    assert.equal(mockDb.updateCalls[1].data.status, 'denied');
    assert.equal(mockDb.updateCalls[1].data.denial_reason, 'Too busy');

    // Test deny a task WITHOUT reason (should throw error)
    await assert.rejects(
      async () => {
        await tasksTools.decideTask({ task_id: 'task-123', status: 'denied' });
      },
      /denial_reason is required when denying a task/
    );
  });

  // Test Case 5: Calendar OAuth URL Generation
  test('Test Case 5: Google Calendar OAuth authentication URL generation', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost/oauth2callback';

    const calendarService = new CalendarService();
    const authUrl = calendarService.getAuthUrl();

    assert.ok(authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
    assert.match(authUrl, /client_id=test-client-id/);
    assert.match(authUrl, /redirect_uri=http%3A%2F%2Flocalhost%2Foauth2callback/);
    assert.match(authUrl, /scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar/);
  });
});
