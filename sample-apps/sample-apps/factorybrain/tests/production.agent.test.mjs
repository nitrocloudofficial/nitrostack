import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { disruptionSchema } from '../dist/modules/production/production.tools.js';

after(() => setImmediate(() => process.exit(0)));

async function makeAgent() {
  delete process.env.MONGODB_URI;
  delete process.env.REDIS_URL;
  const [
    { DatabaseService },
    { ProductionDataService },
    { ProductionAgent },
  ] = await Promise.all([
    import('../dist/services/database.service.js'),
    import('../dist/modules/production/production-data.service.js'),
    import('../dist/modules/production/production.agent.js'),
  ]);
  const database = new DatabaseService();
  await database.onModuleInit();
  const data = new ProductionDataService(database);
  await data.onModuleInit();
  const events = [];
  const queue = {
    async publish(event) {
      events.push(event);
      return { ...event, eventId: `test-${events.length}`, timestamp: new Date().toISOString() };
    },
  };
  return { agent: new ProductionAgent(database, data, queue), data, events };
}

test('planner identifies affected orders, prioritizes them, and finds non-conflicting alternate slots', async () => {
  const { agent, data, events } = await makeAgent();
  const plan = await agent.planDisruption({
    machineId: 'M002',
    downtimeStart: '2026-07-26T09:00:00.000Z',
    expectedDowntimeHours: 6,
    reason: 'Bearing Wear',
    sourceReference: 'MT-M002-TEST',
  });

  assert.equal(plan.status, 'Pending Manager Approval');
  assert.equal(plan.affectedOrderCount, 2);
  assert.deepEqual(plan.orderChanges.map((change) => change.orderId), ['O125', 'O126']);
  assert.deepEqual(plan.orderChanges.map((change) => change.decision), ['reroute', 'reroute']);
  assert.equal(plan.orderChanges[0].revisedMachineId, 'M001');
  assert.equal(plan.orderChanges[0].revisedStart, '2026-07-26T11:00:00.000Z');
  assert.equal(plan.orderChanges[1].revisedStart, '2026-07-26T16:00:00.000Z');
  assert.equal(data.listPlans().length, 1);
  assert.equal(events[0].to, 'manager');
  assert.equal(events[0].type, 'RUN_MANAGER');
});

test('planner delays an order when the configured alternate machine is incompatible', async () => {
  const { agent } = await makeAgent();
  const plan = await agent.planDisruption({
    machineId: 'M003',
    downtimeStart: '2026-07-26T08:00:00.000Z',
    expectedDowntimeHours: 8,
    reason: 'Hydraulic Leak',
    sourceReference: 'ALERT-M003-TEST',
  });

  assert.equal(plan.affectedOrderCount, 1);
  assert.equal(plan.alternateMachine.machineId, 'M008');
  assert.equal(plan.alternateMachine.machineTypeValid, false);
  assert.equal(plan.orderChanges[0].decision, 'delay');
  assert.equal(plan.orderChanges[0].revisedMachineId, 'M003');
  assert.match(plan.orderChanges[0].rationale, /incompatible/);
});

test('planner returns no changes when no orders overlap the downtime window', async () => {
  const { agent } = await makeAgent();
  const plan = await agent.planDisruption({
    machineId: 'M002',
    downtimeStart: '2026-07-26T20:00:00.000Z',
    expectedDowntimeHours: 1,
    reason: 'Inspection',
    sourceReference: 'MT-M002-INSPECTION',
  });

  assert.equal(plan.affectedOrderCount, 0);
  assert.deepEqual(plan.orderChanges, []);
  assert.match(plan.summary, /no schedule change is required/i);
});

test('plan_production rejects an ambiguous request with exact required fields', () => {
  const result = disruptionSchema.safeParse({
    reason: 'Machine might be down for a while',
  });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => issue.path.join('.')), [
    'machineId', 'downtimeStart', 'expectedDowntimeHours', 'sourceReference',
  ]);
});
