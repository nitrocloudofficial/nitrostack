import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FACTORYBRAIN_WEBSOCKET_ENABLED = 'false';
delete process.env.MONGODB_URI;
delete process.env.REDIS_URL;

const { DatabaseService } = await import('../dist/services/database.service.js');
const { QueueService } = await import('../dist/services/queue.service.js');
const { RecipientConfigService } = await import('../dist/modules/notification/recipient-config.service.js');
const { MessageTemplateService } = await import('../dist/modules/notification/message-template.service.js');
const { NotificationDeliveryService } = await import('../dist/modules/notification/notification-delivery.service.js');
const { NotificationRealtimeService } = await import('../dist/modules/notification/notification-realtime.service.js');
const { NotificationAgent } = await import('../dist/modules/notification/notification.agent.js');

async function setup() {
  const database = new DatabaseService(); await database.onModuleInit();
  const queue = new QueueService(database); await queue.onModuleInit();
  const managerStatuses = [];
  queue.registerHandler('manager', 'workflow_status', async (event) => { managerStatuses.push(event.payload); });
  const realtime = new NotificationRealtimeService(database); await realtime.onModuleInit();
  const agent = new NotificationAgent(database, queue, new RecipientConfigService(), new MessageTemplateService(), new NotificationDeliveryService(), realtime);
  await agent.onModuleInit();
  const monitoringHandoffs = [];
  queue.registerHandler('monitoring', 'START_MONITORING', async (event) => { monitoringHandoffs.push(event); });
  return { database, queue, realtime, agent, monitoringHandoffs, managerStatuses };
}

function approvedPayload(id = 'APR-1') {
  const report = { reportId: 'REPORT-1', workflowId: 'WF-MT-1', generatedAt: new Date().toISOString(), machineId: 'M7', incident: 'Bearing failure', maintenancePlan: 'Repair bearing', inventoryPosition: 'Out of stock', purchaseRecommendation: 'Supplier B', productionImpact: 'Reroute', lossEstimate: { downtimeHours: 2, downtimeLoss: 5000, productionDelayLoss: 0, purchaseCost: 145, totalEstimatedImpact: 5145, currency: 'GBP' }, recommendation: 'Proceed' };
  const purchaseRequest = { purchaseRequestId: 'PR1', requestDate: '2026-07-26', inventoryId: 'I1', partId: 'P1', partName: 'Bearing X45', supplierId: 'S1', supplierName: 'Supplier B', requestedQuantity: 1, unitCostGbp: 145, totalCostGbp: 145, urgencyLevel: 'Critical', requestReason: 'MT-1', expectedDeliveryDate: '2026-07-27', approvalStatus: 'Approved', purchaseStatus: 'Requested', requestedBy: 'Maintenance Agent', approvedBy: 'Manager Agent' };
  const workflow = { workflowId: 'WF-MT-1', ticketId: 'MT-1', machineId: 'M7', state: 'Notification Pending', maintenance: { ticketId: 'MT-1', machineId: 'M7', likelyCause: 'Bearing failure', requiredPart: 'Bearing X45', estimatedRepairHours: 2, assignedTeam: 'Mechanical Team', urgency: 'Critical' }, purchase: { ticketId: 'MT-1', purchaseRequestId: 'PR1', supplierId: 'S1', supplierName: 'Supplier B', totalCost: 145, expectedDeliveryDate: '2026-07-27', recommendation: { purchaseRequest, rankedSuppliers: [], selectedSupplier: {}, message: 'Buy' } }, production: { ticketId: 'MT-1', planId: 'PLAN-1', affectedOrderCount: 1, totalDelayHours: 0, plan: { planId: 'PLAN-1', createdAt: new Date().toISOString(), status: 'Pending Manager Approval', disruption: { machineId: 'M7', downtimeStart: new Date().toISOString(), expectedDowntimeHours: 2, reason: 'Failure' }, downtimeEnd: new Date().toISOString(), alternateMachine: { exists: true, statusValid: true, productionLineValid: true, machineTypeValid: true, scheduleAvailable: true, loadAvailable: true, reasons: [] }, affectedOrderCount: 1, orderChanges: [], totalDelayHours: 0, summary: 'Order rerouted.' } }, report, approvalId: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const approval = { approvalId: id, requestKey: `key-${id}`, workflowId: workflow.workflowId, purchaseRequestId: 'PR1', productionPlanId: 'PLAN-1', amount: 145, threshold: 1000, currency: 'GBP', status: 'Approved', autoApproved: true, requestedAt: new Date().toISOString(), decidedAt: new Date().toISOString(), decidedBy: 'Manager Agent', report };
  return { workflow, approval, report };
}

test('sends the approved plan to maintenance, procurement, requester, floor, and dashboard', async () => {
  const context = await setup();
  const records = await context.agent.notifyTeams(context.agent.standardize(approvedPayload()));
  assert.equal(records.length, 5);
  assert.deepEqual(new Set(records.map((record) => record.status)), new Set(['Sent']));
  assert.deepEqual(new Set(records.map((record) => record.audience)), new Set(['Maintenance', 'Procurement', 'Requester', 'Floor Supervisor', 'Manager Dashboard']));
  assert.equal(context.database.listNotifications().length, 5);
  assert.equal(context.database.listNotificationAudits().filter((log) => log.action === 'notification_sent').length, 5);
});

test('tracks failures and retries up to the configured attempt limit', async () => {
  process.env.FACTORYBRAIN_NOTIFICATION_FAIL_RECIPIENTS = 'procurement@factorybrain.local';
  const context = await setup();
  const payload = approvedPayload('APR-FAIL');
  await context.database.saveManagerWorkflow(payload.workflow);
  await context.database.createApprovalRequest(payload.approval);
  await context.queue.publish({ from: 'manager', to: 'notification', type: 'RUN_NOTIFICATION', payload }, { idempotencyKey: 'approved-APR-FAIL' });
  const failed = context.database.listNotifications({ status: 'Failed' });
  assert.equal(failed.length, 1); assert.equal(failed[0].attempts, 3); assert.match(failed[0].lastError, /Simulated delivery failure/);
  assert.equal(context.managerStatuses.at(-1).state, 'Failed');
  assert.equal(context.monitoringHandoffs.length, 0);
  delete process.env.FACTORYBRAIN_NOTIFICATION_FAIL_RECIPIENTS;
  await context.agent.retryNotification(failed[0].notificationId);
  assert.equal(context.database.listNotifications({ status: 'Failed' }).length, 0);
  assert.equal(context.monitoringHandoffs.length, 1);
  assert.equal(context.managerStatuses.at(-1).state, 'Notifications Sent');
});

test('suppresses duplicate notifications for the same approval and recipient', async () => {
  const context = await setup(); const input = context.agent.standardize(approvedPayload('APR-DUP'));
  await context.agent.notifyTeams(input); await context.agent.notifyTeams(input);
  assert.equal(context.database.listNotifications().length, 5);
  assert.equal(context.database.listNotificationAudits().filter((log) => log.action === 'duplicate_notification_suppressed').length, 5);
});

test('publishes real-time status changes and recovers missed sequences', async () => {
  const context = await setup(); const live = []; const unsubscribe = context.realtime.subscribe((event) => live.push(event));
  await context.agent.notifyTeams(context.agent.standardize(approvedPayload('APR-LIVE'))); unsubscribe();
  assert.equal(live.length, 10); assert.equal(live.some((event) => event.notification.status === 'Sending'), true); assert.equal(live.some((event) => event.notification.status === 'Sent'), true);
  const recovered = context.realtime.recover(3); assert.equal(recovered.length, 2); assert.equal(recovered.every((event) => event.sequence > 3), true);
});
