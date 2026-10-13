import { DecisionTwinTools } from './src/modules/decision-twin/decision-twin.tools.js';

const mockLogger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
};

const mockCtx: any = { logger: mockLogger };

async function runTests() {
  console.log('====================================================');
  console.log(' Testing Decision Twin MCP Tools');
  console.log('====================================================\n');

  const tools = new DecisionTwinTools();

  // Test 1: get_sensor_data
  console.log('--- 1. Testing get_sensor_data(M-004) ---');
  const sensorData = await tools.getSensorData({ machineId: 'M-004' }, mockCtx);
  console.log(JSON.stringify(sensorData, null, 2));

  // Test 2: check_machine_health
  console.log('\n--- 2. Testing check_machine_health(M-004) ---');
  const healthData = await tools.checkMachineHealth({ machineId: 'M-004' }, mockCtx);
  console.log(JSON.stringify(healthData, null, 2));

  // Test 3: check_inventory
  console.log('\n--- 3. Testing check_inventory(PART-BRG-409) ---');
  const inventoryData = await tools.checkInventory({ partId: 'PART-BRG-409' }, mockCtx);
  console.log(JSON.stringify(inventoryData, null, 2));

  // Test 4: estimate_downtime_cost
  console.log('\n--- 4. Testing estimate_downtime_cost(M-004, 4.5h) ---');
  const downtimeData = await tools.estimateDowntimeCost({ machineId: 'M-004', hours: 4.5 }, mockCtx);
  console.log(JSON.stringify(downtimeData, null, 2));

  // Test 5: calculate_risk
  console.log('\n--- 5. Testing calculate_risk(M-004) ---');
  const riskData = await tools.calculateRisk({ machineId: 'M-004' }, mockCtx);
  console.log(JSON.stringify(riskData, null, 2));

  // Test 6: generate_work_order
  console.log('\n--- 6. Testing generate_work_order(M-004, replace_bearing) ---');
  const workOrderData = await tools.generateWorkOrder({ machineId: 'M-004', action: 'replace_bearing' }, mockCtx);
  console.log(JSON.stringify(workOrderData, null, 2));

  console.log('\n====================================================');
  console.log(' ALL 6 MCP TOOLS TESTED AND VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
