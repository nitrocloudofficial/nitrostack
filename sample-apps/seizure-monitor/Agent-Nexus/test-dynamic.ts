import { DecisionTwinOrchestrator } from './src/modules/decision-twin/decision-twin.orchestrator.js';
import { DecisionTwinTools } from './src/modules/decision-twin/decision-twin.tools.js';

async function testDynamicOutputs() {
  console.log("=== TEST 1: NOMINAL / HEALTHY INPUT (Vib: 1.2, Temp: 48.2, Press: 1.2) ===");
  const res1 = await DecisionTwinOrchestrator.run({
    event_type: 'sensor_anomaly',
    event: {
      machine_id: 'M-001',
      vibration_level: 1.2,
      temperature: 48.2,
      pressure: 1.2,
    }
  });

  console.log("Chosen Action 1:", res1.final_decision?.chosen_action);
  console.log("Confidence 1:", res1.final_decision?.confidence);
  console.log("Trace snippet 1:");
  console.log(res1.trace.slice(0, 15).join('\n'));

  console.log("\n" + "=".repeat(60) + "\n");

  console.log("=== TEST 2: CRITICAL ANOMALY INPUT (Vib: 14.2, Temp: 108.5, Press: 3.8) ===");
  const res2 = await DecisionTwinOrchestrator.run({
    event_type: 'sensor_anomaly',
    event: {
      machine_id: 'M-004',
      vibration_level: 14.2,
      temperature: 108.5,
      pressure: 3.8,
    }
  });

  console.log("Chosen Action 2:", res2.final_decision?.chosen_action);
  console.log("Confidence 2:", res2.final_decision?.confidence);
  console.log("Trace snippet 2:");
  console.log(res2.trace.slice(0, 15).join('\n'));

  console.log("\n" + "=".repeat(60) + "\n");

  console.log("=== STANDALONE TOOL TESTS ===");
  const tools = new DecisionTwinTools();
  const mockCtx: any = { logger: { info: console.log } };

  const sensorDataHealthy = await tools.getSensorData({ machineId: 'M-001', vibration_level: 1.2, temperature: 48.2, pressure: 1.2 }, mockCtx);
  const sensorDataCritical = await tools.getSensorData({ machineId: 'M-004', vibration_level: 14.2, temperature: 108.5, pressure: 3.8 }, mockCtx);

  console.log("Sensor Data Healthy:", sensorDataHealthy.telemetry);
  console.log("Sensor Data Critical:", sensorDataCritical.telemetry);

  const costHealthy = await tools.estimateDowntimeCost({ machineId: 'M-001', hours: 4, vibration_level: 1.2, temperature: 48.2 }, mockCtx);
  const costCritical = await tools.estimateDowntimeCost({ machineId: 'M-004', hours: 4, vibration_level: 14.2, temperature: 108.5 }, mockCtx);

  console.log("Downtime Cost Healthy:", costHealthy);
  console.log("Downtime Cost Critical:", costCritical);

  const simHealthy = await tools.simulateScenario({ action: 'continue_normal_operation', machine_id: 'M-001', vibration_level: 1.2, temperature: 48.2 }, mockCtx);
  const simCritical = await tools.simulateScenario({ action: 'delay_repair', machine_id: 'M-004', vibration_level: 14.2, temperature: 108.5 }, mockCtx);

  console.log("Simulation Healthy:", simHealthy);
  console.log("Simulation Critical:", simCritical);
}

testDynamicOutputs().catch(console.error);
