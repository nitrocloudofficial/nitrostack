import assert from 'node:assert/strict';
import { after, test } from 'node:test';

after(() => setImmediate(() => process.exit(0)));

test('database save methods update the runtime cache when MongoDB is not configured', async () => {
  delete process.env.MONGODB_URI;
  const { DatabaseService } = await import('../dist/services/database.service.js');
  const database = new DatabaseService();

  await database.saveAlert({
    kind: 'machine_failure',
    alertId: 'ALERT-INFRA-001',
    machineId: 'M002',
    failureProbability: 0.9,
    urgency: 'Critical',
    likelyCause: 'Bearing Wear',
    primaryPart: 'Bearing X45',
    timestamp: '2026-07-26T00:00:00.000Z',
    message: 'Infrastructure test alert',
  });

  assert.equal(database.listAlerts('M002').length, 1);
});

test('local queue fallback records queued and delivered audit state', async () => {
  delete process.env.REDIS_URL;
  const { DatabaseService } = await import('../dist/services/database.service.js');
  const { QueueService } = await import('../dist/services/queue.service.js');
  const database = new DatabaseService();
  const queue = new QueueService(database);
  await queue.onModuleInit();
  queue.registerHandler('maintenance', 'test_alert', async () => {});

  const event = await queue.publish(
    { from: 'machine', to: 'maintenance', type: 'test_alert', payload: { alertId: 'A1' } },
    { idempotencyKey: 'infrastructure-event-001' },
  );

  assert.equal(event.eventId, 'infrastructure-event-001');
  assert.equal(database.listAgentEvents().length, 1);
  assert.equal(database.listAgentEvents()[0].status, 'delivered');
});

test('queue awaits handlers and idempotency keys prevent duplicate execution', async () => {
  delete process.env.REDIS_URL;
  const { DatabaseService } = await import('../dist/services/database.service.js');
  const { QueueService } = await import('../dist/services/queue.service.js');
  const database = new DatabaseService();
  const queue = new QueueService(database);
  let executions = 0;
  queue.registerHandler('inventory', 'reserve', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    executions += 1;
  });

  const input = { from: 'maintenance', to: 'inventory', type: 'reserve', payload: { partId: 'P001' } };
  await queue.publish(input, { idempotencyKey: 'reserve-P001-ticket-1' });
  await queue.publish(input, { idempotencyKey: 'reserve-P001-ticket-1' });

  assert.equal(executions, 1);
  assert.equal(database.findAgentEvent('reserve-P001-ticket-1')?.status, 'delivered');
});

test('local queue records an awaited handler failure', async () => {
  delete process.env.REDIS_URL;
  const { DatabaseService } = await import('../dist/services/database.service.js');
  const { QueueService } = await import('../dist/services/queue.service.js');
  const database = new DatabaseService();
  const queue = new QueueService(database);
  queue.registerHandler('purchase', 'reject', async () => {
    throw new Error('supplier unavailable');
  });

  await assert.rejects(
    queue.publish(
      { from: 'inventory', to: 'purchase', type: 'reject', payload: {} },
      { idempotencyKey: 'failed-event-1' },
    ),
    /supplier unavailable/,
  );
  assert.equal(database.findAgentEvent('failed-event-1')?.status, 'failed');
});

test('local queue fails explicitly when the destination handler is missing', async () => {
  delete process.env.REDIS_URL;
  const { DatabaseService } = await import('../dist/services/database.service.js');
  const { QueueService } = await import('../dist/services/queue.service.js');
  const database = new DatabaseService();
  const queue = new QueueService(database);

  await assert.rejects(
    queue.publish(
      { from: 'orchestrator', to: 'not-started', type: 'work', payload: {} },
      { idempotencyKey: 'missing-handler-event-1' },
    ),
    /No agent event handler registered for not-started:work/,
  );
  assert.equal(database.findAgentEvent('missing-handler-event-1')?.status, 'failed');
});
