import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(root, 'tests/fixtures/inventory_sample.csv');

after(() => setImmediate(() => process.exit(0)));

function makeQueue(events) {
  return {
    async publish(event) {
      events.push(event);
      return { ...event, timestamp: new Date().toISOString() };
    },
  };
}

async function makeAgent() {
  process.env.FACTORYBRAIN_INVENTORY_CSV = fixturePath;
  const { InventoryCsvService } = await import('../dist/modules/inventory/inventory-csv.service.js');
  const { DatabaseService } = await import('../dist/services/database.service.js');
  const { InventoryAgent } = await import('../dist/modules/inventory/inventory.agent.js');
  const events = [];
  const csv = new InventoryCsvService(new DatabaseService());
  await csv.onModuleInit();
  return {
    agent: new InventoryAgent(csv, makeQueue(events)),
    csv,
    events,
  };
}

test('checkInventory reserves available stock and forwards to production', async () => {
  const { agent, csv, events } = await makeAgent();

  const response = await agent.checkInventory({
    partName: 'Bearing X45',
    quantity: 1,
    ticketId: 'MT-M002-TEST',
    machineId: 'M002',
    urgency: 'Critical',
  });

  assert.equal(response.decision, 'in_stock');
  assert.equal(response.reservation?.status, 'Reserved');
  assert.equal(response.availableQuantity, 3);
  assert.equal(csv.listReservations('MT-M002-TEST').length, 1);
  assert.deepEqual(events.map((event) => `${event.to}:${event.type}`), [
    'manager:inventory_summary',
    'production:RUN_PRODUCTION_PLANNING',
  ]);
});

test('checkInventory falls back to part name when Maintenance sends a non-canonical part ID', async () => {
  const { agent, events } = await makeAgent();

  const response = await agent.checkInventory({
    partId: 'BEARING_X45',
    partName: 'Bearing X45',
    quantity: 1,
    ticketId: 'MT-M002-MAINTENANCE-PAYLOAD',
    machineId: 'M002',
    urgency: 'Critical',
  });

  assert.equal(response.decision, 'in_stock');
  assert.equal(response.item?.partId, 'P001');
  assert.equal(response.reservation?.partId, 'P001');
  assert.deepEqual(events.map((event) => `${event.to}:${event.type}`), [
    'manager:inventory_summary',
    'production:RUN_PRODUCTION_PLANNING',
  ]);
});

test('checkInventory reserves stock and forwards replenishment when reorder threshold is reached', async () => {
  const { agent, events } = await makeAgent();

  const response = await agent.checkInventory({
    partId: 'P002',
    quantity: 1,
    ticketId: 'MT-M003-TEST',
    machineId: 'M003',
    urgency: 'High',
  });

  assert.equal(response.decision, 'low_stock');
  assert.equal(response.reorderRequired, true);
  assert.equal(response.availableQuantity, 0);
  assert.deepEqual(events.map((event) => `${event.to}:${event.type}`), [
    'manager:inventory_summary',
    'production:RUN_PRODUCTION_PLANNING',
    'purchase:RUN_PURCHASE',
  ]);
  assert.equal(events[2].payload.fulfillmentContext, 'stock_replenishment');
});

test('checkInventory forwards out-of-stock parts to purchase', async () => {
  const { agent, events } = await makeAgent();

  const response = await agent.checkInventory({
    partId: 'P003',
    quantity: 1,
    ticketId: 'MT-M009-TEST',
    machineId: 'M009',
    urgency: 'Critical',
  });

  assert.equal(response.decision, 'out_of_stock');
  assert.equal(response.reorderRequired, true);
  assert.equal(response.availableQuantity, 0);
  assert.deepEqual(events.map((event) => `${event.to}:${event.type}`), [
    'manager:inventory_summary',
    'purchase:RUN_PURCHASE',
  ]);
});

test('checkInventory rejects an invalid part ID and does not call downstream agents', async () => {
  const { agent, events } = await makeAgent();

  await assert.rejects(agent.checkInventory({
    partId: 'P999',
    quantity: 1,
    ticketId: 'MT-INVALID-PART',
    machineId: 'M001',
    urgency: 'High',
  }), (error) => {
    assert.match(error.message, /Inventory part not found: P999/);
    assert.match(error.message, /Valid part IDs: P001, P002, P003/);
    assert.match(error.message, /Provide a valid partId or exact partName/);
    return true;
  });
  assert.deepEqual(events, []);
});
