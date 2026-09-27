import { NitroServer } from './sdk/nitrostack';
import { registerTelemetryModule } from './modules/telemetry/telemetry.controller';
import { registerAnomalyModule } from './modules/anomaly/anomaly.controller';
import { registerAlertsModule } from './modules/alerts/alerts.controller';
import { registerReportsModule } from './modules/reports/reports.controller';
import { registerAuthModule } from './modules/auth/auth.controller';
import { registerNasaModule } from './modules/nasa/nasa.controller';
import { registerResources } from './resources/satelliteResources';
import { registerPrompts } from './prompts/faultPrompts';
import { telemetryStore } from './db/telemetryStore';

async function runTests() {
  console.log('--- Running Satellite Fault Isolation MCP Unit & Integration Tests ---');
  const server = new NitroServer({
    name: 'satellite-fault-isolation-test',
    version: '1.0.0',
    description: 'Test instance'
  });

  registerTelemetryModule(server);
  registerAnomalyModule(server);
  registerAlertsModule(server);
  registerReportsModule(server);
  registerAuthModule(server);
  registerNasaModule(server);
  registerResources(server);
  registerPrompts(server);

  const tools = server.getTools();
  console.log(`[Test] Total registered tools: ${tools.length}`);
  if (tools.length !== 10) throw new Error(`Expected 10 tools, got ${tools.length}`);

  const resources = server.getResources();
  console.log(`[Test] Total registered resources: ${resources.length}`);
  if (resources.length !== 4) throw new Error('Expected 4 resources');

  const prompts = server.getPrompts();
  console.log(`[Test] Total registered prompts: ${prompts.length}`);
  if (prompts.length !== 2) throw new Error('Expected 2 prompts');

  const evalTool = tools.find(t => t.name === 'evaluate_telemetry');
  if (!evalTool) throw new Error('evaluate_telemetry tool not found');

  // Clear history in store for clean testing
  telemetryStore.clearHistory();

  // Test 1: Hard Safety Envelope — Low Voltage (15V)
  console.log('[Test 1] Hard Safety Envelope — Low Voltage Check');
  const lowVoltRes = await evalTool.handler({
    bus_voltage: 15.0,
    battery_temp: 15.0,
    tumbling_rate: 0.05,
    gyro_star_residual: 0.02,
    seu_counter: 0,
    is_saa_crossing: false,
    satellite_id: 'SAT-ALPHA-1'
  });
  if (lowVoltRes.decision !== 'SAFE_MODE' || lowVoltRes.confidence !== 1.0) {
    throw new Error(`Hard safety envelope failed for low voltage (got ${lowVoltRes.decision}, confidence ${lowVoltRes.confidence})`);
  }
  console.log('   PASSED: bus_voltage=15V correctly triggered SAFE_MODE with confidence 1.0');

  // Test 2: Hard Safety Envelope — High Temp (60°C) and High Tumbling (15°/s)
  console.log('[Test 2] Hard Safety Envelope — High Temp & High Tumbling');
  const highTempRes = await evalTool.handler({
    bus_voltage: 28.0,
    battery_temp: 60.0,
    tumbling_rate: 0.05,
    gyro_star_residual: 0.02,
    seu_counter: 0,
    is_saa_crossing: false
  });
  if (highTempRes.decision !== 'SAFE_MODE') {
    throw new Error('Hard safety envelope failed for high battery temp');
  }

  const highTumbleRes = await evalTool.handler({
    bus_voltage: 28.0,
    battery_temp: 20.0,
    tumbling_rate: 15.0,
    gyro_star_residual: 0.02,
    seu_counter: 0,
    is_saa_crossing: false
  });
  if (highTumbleRes.decision !== 'SAFE_MODE') {
    throw new Error('Hard safety envelope failed for high tumbling rate');
  }
  console.log('   PASSED: High temp (60°C) and high tumble (15°/s) correctly triggered SAFE_MODE');

  // Test 3: Decision Tree Classifier Generalization (Sweep bus_voltage with battery_temp=20, tumbling_rate=0.1)
  console.log('[Test 3] Decision Tree Generalization & Out-of-Grid Sweep');
  telemetryStore.clearHistory();

  const sweep26 = await evalTool.handler({
    bus_voltage: 26.0,
    battery_temp: 20.0,
    tumbling_rate: 0.1,
    gyro_star_residual: 0.02,
    seu_counter: 0,
    is_saa_crossing: false
  });
  if (sweep26.decision !== 'NOMINAL') {
    throw new Error(`Generalization failure: bus_voltage=26V predicted as ${sweep26.decision} instead of NOMINAL`);
  }

  const sweep28 = await evalTool.handler({
    bus_voltage: 28.0,
    battery_temp: 20.0,
    tumbling_rate: 0.1,
    gyro_star_residual: 0.02,
    seu_counter: 0,
    is_saa_crossing: false
  });
  if (sweep28.decision !== 'NOMINAL') {
    throw new Error(`Generalization failure: bus_voltage=28V predicted as ${sweep28.decision} instead of NOMINAL`);
  }
  console.log('   PASSED: 26V and 28V correctly predicted as NOMINAL without spurious anomaly classification');

  // Test 4: Space Weather Glitch vs Sensor Fault Escalation
  console.log('[Test 4] Space Weather Glitch & Persistence Escalation');
  telemetryStore.clearHistory();

  const f1 = await evalTool.handler({
    bus_voltage: 28.0,
    battery_temp: 24.0,
    tumbling_rate: 0.1,
    gyro_star_residual: 0.9,
    seu_counter: 10,
    is_saa_crossing: true,
    satellite_id: 'SAT-ALPHA-1'
  });
  console.log('   Frame 1 (Transient SAA):', f1.decision); // Expect CONTINUE_MISSION

  const f2 = await evalTool.handler({
    bus_voltage: 28.0,
    battery_temp: 24.0,
    tumbling_rate: 0.1,
    gyro_star_residual: 0.9,
    seu_counter: 10,
    is_saa_crossing: true,
    satellite_id: 'SAT-ALPHA-1'
  });
  console.log('   Frame 2 (Transient SAA):', f2.decision); // Expect CONTINUE_MISSION

  const f3 = await evalTool.handler({
    bus_voltage: 28.0,
    battery_temp: 24.0,
    tumbling_rate: 0.1,
    gyro_star_residual: 0.9,
    seu_counter: 10,
    is_saa_crossing: true,
    satellite_id: 'SAT-ALPHA-1'
  });
  console.log('   Frame 3 (Persistent Fault Escalation):', f3.decision); // Expect ISOLATE_SENSOR

  const persistencePassed = f1.decision === 'CONTINUE_MISSION' && f2.decision === 'CONTINUE_MISSION' && f3.decision === 'ISOLATE_SENSOR';
  if (!persistencePassed) throw new Error('Persistence escalation check failed');
  console.log('   PASSED: SAA glitch correctly escalated to ISOLATE_SENSOR on frame 3');

  // Test 5: Multi-Satellite Rolling Feature Isolation
  console.log('[Test 5] Multi-Satellite Rolling Feature Isolation');
  telemetryStore.clearHistory();

  // Populate SAT-ALPHA-1 with high gyro residuals (persistence count building up)
  await evalTool.handler({ bus_voltage: 28.0, battery_temp: 20.0, tumbling_rate: 0.1, gyro_star_residual: 0.9, seu_counter: 10, is_saa_crossing: true, satellite_id: 'SAT-ALPHA-1' });
  await evalTool.handler({ bus_voltage: 28.0, battery_temp: 20.0, tumbling_rate: 0.1, gyro_star_residual: 0.9, seu_counter: 10, is_saa_crossing: true, satellite_id: 'SAT-ALPHA-1' });

  // Evaluate single clean frame for SAT-BETA-2
  const betaRes = await evalTool.handler({
    bus_voltage: 28.0,
    battery_temp: 20.0,
    tumbling_rate: 0.1,
    gyro_star_residual: 0.9,
    seu_counter: 10,
    is_saa_crossing: true,
    satellite_id: 'SAT-BETA-2'
  });

  // For SAT-BETA-2, this is frame 1 (persistence count = 1), so it must be CONTINUE_MISSION, NOT ISOLATE_SENSOR!
  if (betaRes.decision !== 'CONTINUE_MISSION') {
    throw new Error(`Multi-satellite leakage detected: SAT-BETA-2 frame 1 got ${betaRes.decision} instead of CONTINUE_MISSION`);
  }
  console.log('   PASSED: SAT-BETA-2 features remained isolated from SAT-ALPHA-1 history');

  // Test 6: Simulation Scenario Tool
  const simTool = tools.find(t => t.name === 'simulate_scenario');
  const simRes = await simTool?.handler({ scenario_type: 'sensor_fault' });
  if (!simRes?.expected_result?.includes('Isolate Sensor')) {
    throw new Error('Simulation scenario test failed');
  }

  // Test 7: Novelty Detection Tool
  const noveltyTool = tools.find(t => t.name === 'detect_novelty_anomaly');
  if (!noveltyTool) throw new Error('detect_novelty_anomaly tool not found');
  const noveltyRes = await noveltyTool.handler({ sample_window: 10 });
  if (noveltyRes.novelty_score === undefined) {
    throw new Error('Novelty score calculation failed');
  }

  // Test 8: Training Dataset Export Tool
  const exportTool = tools.find(t => t.name === 'export_training_dataset');
  if (!exportTool) throw new Error('export_training_dataset tool not found');
  const exportRes = await exportTool.handler({ min_confidence: 0.5 });
  if (exportRes.sample_count === undefined) {
    throw new Error('Dataset export failed');
  }
  console.log(`   Exported ${exportRes.sample_count} historical evaluation samples`);

  console.log('--- All Unit & Integration Tests Passed Successfully ---');
}

runTests().catch(err => {
  console.error('[Test Error]:', err);
  process.exit(1);
});
