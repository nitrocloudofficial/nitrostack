import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class DecisionTwinResources {
  @Resource({
    uri: 'manufacturing://plant/sensor-overview',
    name: 'Plant Sensor Telemetry Overview',
    description: 'Real-time telemetry overview across all connected manufacturing plant machines.',
    mimeType: 'application/json'
  })
  async getPlantSensorsOverview(ctx: ExecutionContext) {
    ctx.logger.info('Fetching plant sensor overview resource');
    return {
      plantId: 'PLANT-OHIO-01',
      lastUpdated: new Date().toISOString(),
      activeMachines: [
        { machineId: 'M-001', name: 'Stamping Press #1', status: 'normal', tempC: 48.2, vibrationMmS: 1.2 },
        { machineId: 'M-002', name: 'Robotic Welder #2', status: 'warning', tempC: 68.0, vibrationMmS: 4.1 },
        { machineId: 'M-003', name: 'Conveyor Transport #3', status: 'critical', tempC: 91.0, vibrationMmS: 9.2 },
        { machineId: 'M-004', name: 'CNC Milling Center #4', status: 'alarm', tempC: 88.5, vibrationMmS: 8.4 }
      ]
    };
  }

  @Resource({
    uri: 'manufacturing://sop/safety-rules',
    name: 'Plant Standard Operating Procedures (SOP) & Safety Rules',
    description: 'Mandatory safety veto conditions and operational vibration/temperature thresholds.',
    mimeType: 'application/json'
  })
  async getSopSafetyRules(ctx: ExecutionContext) {
    ctx.logger.info('Fetching SOP safety rules resource');
    return {
      documentId: 'SOP-SAFE-2026-V3',
      title: 'Plant Operations Safety & Hazard Mitigation Standard',
      rules: [
        { ruleId: 'SOP-RULE-14', parameter: 'Vibration', limit: '7.5 mm/s', enforcement: 'MANDATORY_SHUTDOWN', description: 'Operating machinery above 7.5 mm/s vibration poses structural failure hazards.' },
        { ruleId: 'SOP-RULE-22', parameter: 'Bearing Temp', limit: '90.0 °C', enforcement: 'MANDATORY_SHUTDOWN', description: 'Bearing thermal runaway (>90°C) requires immediate cooling and repair.' },
        { ruleId: 'SOP-RULE-05', parameter: 'LOTO Protocol', enforcement: 'REQUIRED', description: 'Lockout/Tagout mandatory before any cell entry or mechanical repair.' }
      ]
    };
  }
}
