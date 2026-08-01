import assert from 'node:assert/strict';
import test from 'node:test';
import { InventoryTools } from '../dist/modules/inventory/inventory.tools.js';
import { MachineTools } from '../dist/modules/machine/machine.tools.js';
import { MonitoringTools } from '../dist/modules/monitoring/monitoring.tools.js';
import { PurchaseTools } from '../dist/modules/purchase/purchase.tools.js';

const context = { logger: { info() {} } };

test('inventory tools initialize when NitroStudio constructs the controller without DI', async () => {
  const tools = new InventoryTools();
  const items = await tools.listItems();
  assert.ok(items.some((item) => item.partId === 'P001'));
  const result = await tools.checkInventory({
    partId: 'P001', quantity: 1, ticketId: 'MT-DIRECT-INVENTORY', machineId: 'M002', urgency: 'High',
  }, context);
  assert.match(result.decision, /in_stock|low_stock/);
});

test('supplier lookup initializes when NitroStudio constructs the controller without DI', async () => {
  const tools = new PurchaseTools();
  const suppliers = await tools.findSuppliers({ partName: 'Bearing X45' });
  assert.ok(suppliers.length > 0);
  assert.ok(suppliers.every((supplier) => supplier.suppliedParts.includes('Bearing X45')));
});

test('machine and monitoring alert feeds initialize without DI', async () => {
  const machine = new MachineTools();
  const monitoring = new MonitoringTools();
  assert.deepEqual(await machine.listAlerts({ machineId: 'M002' }), []);
  assert.deepEqual(await monitoring.listAlerts({}), []);
});
