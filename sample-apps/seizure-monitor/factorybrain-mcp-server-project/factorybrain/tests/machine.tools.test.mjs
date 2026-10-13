import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseService } from '../dist/services/database.service.js';
import { MachineTools, readingSchema } from '../dist/modules/machine/machine.tools.js';

test('predict_failure rejects a registry-only request with exact missing telemetry fields', () => {
  const result = readingSchema.safeParse({ machineId: 'M001' });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => issue.path.join('.')), [
    'timestamp', 'airTemperature', 'processTemperature', 'rpm', 'torque', 'vibration',
    'pressure', 'humidity', 'voltage', 'current', 'powerConsumption', 'toolWear', 'operatingHours',
  ]);
});

test('predict_failure rejects a non-ISO timestamp', () => {
  const result = readingSchema.safeParse({
    machineId: 'M001', timestamp: 'today', airTemperature: 1, processTemperature: 1,
    rpm: 1, torque: 1, vibration: 1, pressure: 1, humidity: 1, voltage: 1,
    current: 1, powerConsumption: 1, toolWear: 1, operatingHours: 1,
  });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path.join('.'), 'timestamp');
});

test('predict_failure initializes its machine agent even when dependency injection is unavailable', async () => {
  const database = new DatabaseService();
  await database.onModuleInit();

  const tools = new MachineTools(undefined, database);
  const result = await tools.predictFailure({
    machineId: 'M001',
    timestamp: '2026-07-26T04:28:30.045Z',
    airTemperature: 28,
    processTemperature: 92,
    rpm: 2500,
    torque: 85,
    vibration: 7.8,
    pressure: 26.4,
    humidity: 65,
    voltage: 380,
    current: 45,
    powerConsumption: 15.2,
    toolWear: 78,
    operatingHours: 5420,
  }, { logger: { info() {} } });

  assert.equal(result.machineId, 'M001');
  assert.ok(result.failureProbability >= 0);
  assert.ok(result.evidence.length >= 0);
});
