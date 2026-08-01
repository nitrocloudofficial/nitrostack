import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
  process.env.FACTORYBRAIN_SUPPLIERS_CSV = resolve(root, 'tests/fixtures/suppliers_sample.csv');
  process.env.FACTORYBRAIN_PURCHASE_REQUESTS_CSV = resolve(root, 'tests/fixtures/purchase_requests_sample.csv');
  const [
    { SupplierService },
    { ScoringService },
    { PurchaseRequestService },
    { PurchaseAgent },
    { DatabaseService },
  ] = await Promise.all([
    import('../dist/modules/purchase/supplier.service.js'),
    import('../dist/modules/purchase/scoring.service.js'),
    import('../dist/modules/purchase/purchase-request.service.js'),
    import('../dist/modules/purchase/purchase.agent.js'),
    import('../dist/services/database.service.js'),
  ]);
  const events = [];
  const suppliers = new SupplierService();
  const scoring = new ScoringService();
  const purchaseRequests = new PurchaseRequestService(new DatabaseService());
  await suppliers.onModuleInit();
  await purchaseRequests.onModuleInit();
  return {
    agent: new PurchaseAgent(suppliers, scoring, purchaseRequests, makeQueue(events)),
    suppliers,
    purchaseRequests,
    events,
  };
}

test('findSuppliersForPart filters active suppliers by supplied part', async () => {
  const { suppliers } = await makeAgent();

  const matches = suppliers.findSuppliersForPart('Bearing X45');

  assert.equal(matches.length, 3);
  assert.equal(matches.every((supplier) => supplier.suppliedParts.includes('Bearing X45')), true);
});

test('Critical purchase ranks fast supplier first and creates manager/production handoffs', async () => {
  const { agent, purchaseRequests, events } = await makeAgent();

  const recommendation = await agent.recommendPurchase({
    partId: 'P001',
    partName: 'Bearing X45',
    inventoryId: 'INV001',
    requestedQuantity: 2,
    urgency: 'Critical',
    requestReason: 'Out of Stock',
    unitCostGbp: 45,
    ticketId: 'MT-M002-TEST',
    machineId: 'M002',
  });

  assert.equal(recommendation.selectedSupplier.supplier.supplierName, 'Rapid Bearing Express');
  assert.equal(recommendation.purchaseRequest.purchaseRequestId, 'PR002');
  assert.equal(recommendation.purchaseRequest.requestedQuantity, 4);
  assert.equal(recommendation.purchaseRequest.approvalStatus, 'Pending');
  assert.equal(recommendation.purchaseRequest.approvedBy, '');
  assert.equal(purchaseRequests.listRequests().length, 2);
  assert.deepEqual(events.map((event) => `${event.from}->${event.to}:${event.type}`), [
    'purchase->production:RUN_PRODUCTION_PLANNING',
    'purchase->manager:purchase_recommendation',
  ]);
});

test('Low urgency scoring prefers lower total cost when delivery is less important', async () => {
  const { agent } = await makeAgent();

  const recommendation = await agent.recommendPurchase({
    partId: 'P001',
    partName: 'Bearing X45',
    inventoryId: 'INV001',
    requestedQuantity: 2,
    urgency: 'Low',
    requestReason: 'Safety Stock Replenishment',
    unitCostGbp: 45,
  });

  assert.equal(recommendation.selectedSupplier.supplier.supplierName, 'Budget Bearing Co');
  assert.equal(recommendation.rankedSuppliers[0].rank, 1);
});

test('stock replenishment does not add supplier delivery time to an already-reserved repair', async () => {
  const { agent, events } = await makeAgent();
  await agent.recommendPurchase({
    partId: 'P001', partName: 'Bearing X45', inventoryId: 'INV001', requestedQuantity: 2,
    urgency: 'High', requestReason: 'Low Stock - Below Reorder Level', unitCostGbp: 45,
    ticketId: 'MT-M002-RESERVED', machineId: 'M002', fulfillmentContext: 'stock_replenishment',
  }, { ticketId: 'MT-M002-RESERVED', machineId: 'M002' });

  assert.deepEqual(events.map((event) => `${event.from}->${event.to}:${event.type}`), [
    'purchase->manager:purchase_recommendation',
  ]);
});
