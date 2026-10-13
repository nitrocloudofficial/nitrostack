import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.TEST_MONGODB_URI;
const redisUrl = process.env.TEST_REDIS_URL;
const hasRealInfrastructure = Boolean(mongoUri && redisUrl);

test('Machine -> Maintenance -> Inventory -> Purchase persists through real MongoDB and Redis', {
  skip: hasRealInfrastructure ? false : 'Set TEST_MONGODB_URI and TEST_REDIS_URL to real services',
  timeout: 30_000,
}, async () => {
  const suffix = `${Date.now()}-${process.pid}`;
  process.env.MONGODB_URI = mongoUri;
  process.env.MONGODB_DATABASE = `factorybrain_integration_${suffix.replace(/-/g, '_')}`;
  process.env.REDIS_URL = redisUrl;
  process.env.FACTORYBRAIN_QUEUE_PREFIX = `factorybrain-integration-${suffix}`;

  const [
    { DatabaseService },
    { QueueService },
    { MachineAgent },
    { MaintenanceAgent },
    { InventoryCsvService },
    { InventoryAgent },
    { SupplierService },
    { ScoringService },
    { PurchaseRequestService },
    { PurchaseAgent },
    { ProductionDataService },
    { ProductionAgent },
    { OrchestratorService },
    { OrchestratorProcessor },
    { WorkflowStateService },
  ] = await Promise.all([
    import('../dist/services/database.service.js'),
    import('../dist/services/queue.service.js'),
    import('../dist/modules/machine/machine.agent.js'),
    import('../dist/modules/maintenance/maintenance.agent.js'),
    import('../dist/modules/inventory/inventory-csv.service.js'),
    import('../dist/modules/inventory/inventory.agent.js'),
    import('../dist/modules/purchase/supplier.service.js'),
    import('../dist/modules/purchase/scoring.service.js'),
    import('../dist/modules/purchase/purchase-request.service.js'),
    import('../dist/modules/purchase/purchase.agent.js'),
    import('../dist/modules/production/production-data.service.js'),
    import('../dist/modules/production/production.agent.js'),
    import('../dist/orchestrator/orchestrator.service.js'),
    import('../dist/orchestrator/orchestrator.processor.js'),
    import('../dist/orchestrator/workflow-state.service.js'),
  ]);

  const database = new DatabaseService();
  const queue = new QueueService(database);
  const inventoryStore = new InventoryCsvService(database);
  const supplierService = new SupplierService();
  const purchaseRequests = new PurchaseRequestService(database);
  const maintenance = new MaintenanceAgent(database, queue);
  const inventory = new InventoryAgent(inventoryStore, queue);
  const purchase = new PurchaseAgent(
    supplierService,
    new ScoringService(),
    purchaseRequests,
    queue,
  );
  const productionData = new ProductionDataService(database);
  const production = new ProductionAgent(database, productionData, queue);
  const machine = new MachineAgent(database, queue);
  const workflowState = new WorkflowStateService(database);
  const processor = new OrchestratorProcessor(database, queue, workflowState);
  const orchestrator = new OrchestratorService(queue, workflowState, { decideApproval: async () => { throw new Error('Manager Agent is outside this infrastructure test scope'); } });
  const verificationClient = new MongoClient(mongoUri);
  let verificationConnected = false;

  try {
    await database.onModuleInit();
    await queue.onModuleInit();
    await inventoryStore.onModuleInit();
    await supplierService.onModuleInit();
    await purchaseRequests.onModuleInit();
    await productionData.onModuleInit();
    await maintenance.onModuleInit();
    await inventory.onModuleInit();
    await purchase.onModuleInit();
    await production.onModuleInit();
    await workflowState.onModuleInit();
    await processor.onModuleInit();
    await orchestrator.onModuleInit();

    await verificationClient.connect();
    verificationConnected = true;
    const mongoDatabase = verificationClient.db(process.env.MONGODB_DATABASE);
    await mongoDatabase.collection('inventory').updateOne(
      { partName: 'Bearing X45' },
      { $set: { quantityAvailable: 0, availableQuantity: 0, inventoryStatus: 'Out of Stock' } },
    );
    await inventoryStore.onModuleInit();
    const initialRequestCount = purchaseRequests.listRequests().length;

    for (let index = 0; index < 3; index += 1) {
      await machine.analyzeReading(extremeReading(`2035-01-01T00:0${index}:00.000Z`));
    }

    await waitFor(() => purchaseRequests.listRequests().length > initialRequestCount, 20_000);

    assert.equal(await mongoDatabase.collection('alerts').countDocuments({ machineId: 'M002' }) > 0, true);
    assert.equal(await mongoDatabase.collection('maintenance_tickets').countDocuments({ machineId: 'M002' }) > 0, true);
    assert.equal(await mongoDatabase.collection('spare_part_requests').countDocuments({ machineId: 'M002' }) > 0, true);
    assert.equal(await mongoDatabase.collection('reservations').countDocuments({ machineId: 'M002' }) > 0, true);
    assert.equal(await mongoDatabase.collection('purchase_requests').countDocuments({ partName: 'Bearing X45' }) > 0, true);
    await waitFor(
      async () => await mongoDatabase.collection('production_plans').countDocuments({ 'disruption.machineId': 'M002' }) > 0,
      20_000,
    );
    assert.equal(await mongoDatabase.collection('production_plans').countDocuments({ status: 'Pending Manager Approval' }) > 0, true);
    assert.equal(await mongoDatabase.collection('agent_events').countDocuments({ status: 'delivered' }) >= 3, true);
    assert.equal(await mongoDatabase.collection('agent_events').countDocuments({ kind: 'orchestration_event' }) > 0, true);
  } finally {
    if (verificationConnected) {
      await verificationClient.db(process.env.MONGODB_DATABASE).dropDatabase();
    }
    await verificationClient.close();
    await queue.close();
    await database.close();
  }
});

function extremeReading(timestamp) {
  return {
    machineId: 'M002', timestamp,
    airTemperature: 450, processTemperature: 500, rpm: 4000, torque: 150,
    vibration: 5, pressure: 20, humidity: 95, voltage: 400, current: 100,
    powerConsumption: 50, toolWear: 500, operatingHours: 50_000,
  };
}

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}
