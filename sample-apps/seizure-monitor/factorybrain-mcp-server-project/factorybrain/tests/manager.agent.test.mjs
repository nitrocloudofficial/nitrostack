import assert from 'node:assert/strict';
import { after, test } from 'node:test';

after(() => setImmediate(() => process.exit(0)));

async function makeManager(threshold = 1000) {
  delete process.env.MONGODB_URI;
  delete process.env.REDIS_URL;
  process.env.FACTORYBRAIN_APPROVAL_THRESHOLD = String(threshold);
  process.env.FACTORYBRAIN_DOWNTIME_COST_PER_HOUR = '2500';
  const [{ DatabaseService }, { FactoryConfigService }, { ManagerAgent }] = await Promise.all([
    import('../dist/services/database.service.js'),
    import('../dist/modules/manager/factory-config.service.js'),
    import('../dist/modules/manager/manager.agent.js'),
  ]);
  const database = new DatabaseService();
  const handlers = new Map();
  const events = [];
  const queue = {
    registerHandler(to, type, handler) { handlers.set(`${to}:${type}`, handler); },
    async publish(event) {
      events.push(event);
      return { ...event, eventId: `event-${events.length}`, timestamp: new Date().toISOString() };
    },
  };
  const manager = new ManagerAgent(database, new FactoryConfigService(database), queue);
  await manager.onModuleInit();
  return { manager, database, handlers, events };
}

async function submitWorkflow(context, { ticketId, purchaseCost }) {
  await context.database.insertPurchaseRequest({
    purchaseRequestId: `PR-${ticketId}`, requestDate: new Date().toISOString(), inventoryId: 'INV001',
    partId: 'P001', partName: 'Bearing X45', supplierId: 'SUP001', supplierName: 'Precision Bearings',
    requestedQuantity: 2, unitCostGbp: purchaseCost / 2, totalCostGbp: purchaseCost,
    urgencyLevel: 'Critical', requestReason: 'Out of Stock', expectedDeliveryDate: '2026-07-27',
    approvalStatus: 'Pending', purchaseStatus: 'Requested', requestedBy: 'Purchase Agent', approvedBy: '',
  });
  const emit = async (type, payload) => context.handlers.get(`manager:${type}`)({
    eventId: `${type}-${ticketId}`, from: 'test', to: 'manager', type, payload, timestamp: new Date().toISOString(),
  });
  await emit('maintenance_summary', {
    ticketId, machineId: 'M002', likelyCause: 'Bearing Wear', requiredPart: 'Bearing X45',
    estimatedRepairHours: 4, assignedTeam: 'Mechanical', urgency: 'Critical',
  });
  await emit('inventory_summary', {
    ticketId, machineId: 'M002', decision: 'out_of_stock', requestedQuantity: 2,
    availableQuantity: 0, warehouseLocation: 'WH-A', reorderRequired: true,
  });
  await emit('purchase_recommendation', {
    ticket: { ticketId, machineId: 'M002' },
    recommendation: {
      purchaseRequest: {
        purchaseRequestId: `PR-${ticketId}`, supplierId: 'SUP001', supplierName: 'Precision Bearings',
        totalCostGbp: purchaseCost, expectedDeliveryDate: '2026-07-27', requestReason: 'Out of Stock', partId: 'P001',
      },
      rankedSuppliers: [], selectedSupplier: {}, message: 'Recommended supplier',
    },
  });
  await emit('RUN_MANAGER', {
    plan: {
      planId: `PLAN-${ticketId}`, createdAt: new Date().toISOString(), status: 'Pending Manager Approval',
      disruption: { machineId: 'M002', downtimeStart: '2026-07-26T09:00:00.000Z', expectedDowntimeHours: 6, reason: 'Bearing Wear', sourceReference: ticketId },
      downtimeEnd: '2026-07-26T15:00:00.000Z', alternateMachine: { exists: true, statusValid: true, productionLineValid: true, machineTypeValid: true, scheduleAvailable: true, loadAvailable: true, reasons: [] },
      affectedOrderCount: 2, orderChanges: [], totalDelayHours: 3, summary: 'Two orders affected',
    },
  });
  return context.manager.listWorkflows().find((workflow) => workflow.ticketId === ticketId);
}

test('auto-approval generates report, audit trail, and Notification handoff below threshold', async () => {
  const context = await makeManager(1000);
  const workflow = await submitWorkflow(context, { ticketId: 'AUTO-001', purchaseCost: 500 });
  const approval = context.database.listApprovalRequests()[0];

  assert.equal(approval.status, 'Approved');
  assert.equal(approval.autoApproved, true);
  assert.equal(workflow.state, 'Notification Pending');
  assert.equal(workflow.report.lossEstimate.downtimeLoss, 15000);
  assert.equal(context.events.some((event) => event.to === 'notification' && event.type === 'RUN_NOTIFICATION'), true);
  assert.equal(context.database.findPurchaseRequest('PR-AUTO-001').approvalStatus, 'Approved');
  assert.equal(context.database.findPurchaseRequest('PR-AUTO-001').purchaseStatus, 'Ordered');
  assert.equal(context.database.findPurchaseRequest('PR-AUTO-001').approvedBy, 'Manager Agent');
  assert.equal(context.database.listAuditLogs(workflow.workflowId).length > 0, true);
});

test('high-value purchase waits for a human and resumes after approval', async () => {
  const context = await makeManager(1000);
  let workflow = await submitWorkflow(context, { ticketId: 'HUMAN-001', purchaseCost: 2500 });
  const approval = context.database.listApprovalRequests()[0];

  assert.equal(approval.status, 'Pending');
  assert.equal(workflow.state, 'Pending Human Approval');
  assert.equal(context.events.some((event) => event.to === 'notification'), false);

  const result = await context.manager.decideApproval({
    approvalId: approval.approvalId, action: 'Approve', decidedBy: 'Plant Manager', comments: 'Approved for urgent recovery',
  });
  workflow = result.workflow;
  assert.equal(result.approval.status, 'Approved');
  assert.equal(workflow.state, 'Notification Pending');
  assert.equal(context.events.some((event) => event.to === 'notification'), true);
  assert.equal(context.database.findPurchaseRequest('PR-HUMAN-001').approvalStatus, 'Approved');
  assert.equal(context.database.findPurchaseRequest('PR-HUMAN-001').purchaseStatus, 'Ordered');
  assert.equal(context.database.findPurchaseRequest('PR-HUMAN-001').approvedBy, 'Plant Manager');
});

test('human rejection is persisted and sends the workflow back for replanning', async () => {
  const context = await makeManager(1000);
  const workflow = await submitWorkflow(context, { ticketId: 'REJECT-001', purchaseCost: 3000 });
  const approval = context.database.listApprovalRequests()[0];
  const result = await context.manager.decideApproval({
    approvalId: approval.approvalId, action: 'Reject', decidedBy: 'Plant Manager', comments: 'Use a lower-cost supplier and reduce delay',
  });

  assert.equal(result.approval.status, 'Rejected');
  assert.equal(result.workflow.state, 'Replanning Requested');
  assert.equal(context.events.some((event) => event.to === 'production' && event.type === 'replan_requested'), true);
  assert.equal(context.database.findApprovalRequest(approval.approvalId).status, 'Rejected');
  assert.equal(context.database.findPurchaseRequest('PR-REJECT-001').approvalStatus, 'Rejected');
  assert.equal(context.database.findPurchaseRequest('PR-REJECT-001').purchaseStatus, 'Cancelled');
  assert.equal(context.database.findPurchaseRequest('PR-REJECT-001').approvedBy, 'Plant Manager');
  assert.equal(context.database.listAuditLogs(workflow.workflowId).some((log) => log.action === 'human_reject'), true);
});
