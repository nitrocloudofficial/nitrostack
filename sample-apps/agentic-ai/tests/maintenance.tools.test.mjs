import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseService } from '../dist/services/database.service.js';
import { MaintenanceTools } from '../dist/modules/maintenance/maintenance.tools.js';

test('create_maintenance_ticket initializes its services when dependency injection is unavailable', async () => {
  const database = new DatabaseService();
  const tools = new MaintenanceTools(undefined, database);

  const result = await tools.createMaintenanceTicket({
    alertId: 'ALERT-M001-20260726-051500',
    machineId: 'M001',
    failureProbability: 0.5,
    urgency: 'Critical',
    likelyCause: 'Bearing degradation',
    primaryPart: 'Bearing X45',
    timestamp: '2026-07-26T05:15:00.000Z',
    message: 'Critical abnormal sensor reading',
  }, { logger: { info() {} } });

  assert.equal(result.ticket.machineId, 'M001');
  assert.equal(result.ticket.sourceAlertId, 'ALERT-M001-20260726-051500');
  assert.equal(result.ticket.urgency, 'Critical');
  assert.equal(result.ticket.requiredPart, 'Bearing X45');
  assert.equal(database.listMaintenanceTickets('M001').length, 1);
});
