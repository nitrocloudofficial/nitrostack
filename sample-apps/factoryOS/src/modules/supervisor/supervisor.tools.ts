import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { DbService } from '../../services/db.service.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

@Injectable({ deps: [DbService] })
export class SupervisorTools {
  constructor(private db: DbService) {}

  @Tool({
    name: 'applyScenario',
    description: 'Supervisor Agent tool to trigger a specific smart manufacturing scenario simulation, patching the SQLite state and setting expected agent workflows.',
    inputSchema: z.object({
      scenarioName: z.enum(['bearing_failure', 'overheating', 'inventory_stockout', 'supplier_delay', 'safety_breach']).describe('The name of the scenario to apply')
    })
  })
  async applyScenario(input: { scenarioName: string }, _ctx: ExecutionContext) {
    let scenarioFile = path.join(process.cwd(), 'scenarios', `${input.scenarioName}.json`);
    if (!fs.existsSync(scenarioFile)) {
      scenarioFile = path.join(process.cwd(), 'factoryos-data', 'scenarios', `${input.scenarioName}.json`);
    }
    if (!fs.existsSync(scenarioFile)) {
      throw new Error(`Scenario definition not found for name: ${input.scenarioName}`);
    }

    const scenarioData = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));

    // Also trigger factoryos-data/apply_scenario.js if present to keep state.json in 100% sync
    try {
      const applyScript = path.join(process.cwd(), 'factoryos-data', 'apply_scenario.js');
      if (fs.existsSync(applyScript)) {
        execSync(`node "${applyScript}" ${input.scenarioName}`, { encoding: 'utf8', timeout: 5000 });
      }
    } catch (err: any) {
      console.warn(`state.json scenario sync warning:`, err.message);
    }

    // Reset database to safe defaults before applying the scenario
    await this.db.run(`DELETE FROM safety_incidents`);
    await this.db.run(`DELETE FROM purchase_orders`);
    await this.db.run(`UPDATE meta SET value = NULL WHERE key = 'active_incident'`);
    
    // Reset machines to healthy state
    await this.db.run(`UPDATE machines SET status = 'Operational', health = 'green', temperature_c = 68.0, vibration_mm_s = 0.04, sensor_type = 'L', air_temp_k = 300.5, process_temp_k = 311.2, rotational_speed_rpm = 1270, torque_nm = 67.5, tool_wear_min = 208 WHERE id = 'M12'`);
    await this.db.run(`UPDATE machines SET status = 'Operational', health = 'green', temperature_c = 65.0, vibration_mm_s = 0.03, sensor_type = 'M', air_temp_k = 302.8, process_temp_k = 312.3, rotational_speed_rpm = 1290, torque_nm = 70.5, tool_wear_min = 234 WHERE id = 'M13'`);
    await this.db.run(`UPDATE machines SET status = 'Operational', health = 'green', temperature_c = 66.0, vibration_mm_s = 0.05, sensor_type = 'H', air_temp_k = 298.5, process_temp_k = 309.8, rotational_speed_rpm = 1300, torque_nm = 65.0, tool_wear_min = 180 WHERE id = 'M18'`);
    await this.db.run(`UPDATE machines SET status = 'Operational', health = 'green', temperature_c = 70.0, vibration_mm_s = 0.04, sensor_type = 'L', air_temp_k = 303.0, process_temp_k = 314.5, rotational_speed_rpm = 1200, torque_nm = 60.0, tool_wear_min = 150 WHERE id = 'M21'`);
    await this.db.run(`UPDATE machines SET status = 'Operational', health = 'green', temperature_c = 67.0, vibration_mm_s = 0.03, sensor_type = 'M', air_temp_k = 301.2, process_temp_k = 311.5, rotational_speed_rpm = 1250, torque_nm = 68.0, tool_wear_min = 120 WHERE id = 'M27'`);
    
    // Reset inventory
    await this.db.run(`UPDATE inventory SET on_hand = 0 WHERE part_number = 'bearing_X52'`);
    await this.db.run(`UPDATE inventory SET on_hand = 40 WHERE part_number = 'coolant_fluid'`);
    await this.db.run(`UPDATE inventory SET on_hand = 0 WHERE part_number = 'bearing_X40'`);
    await this.db.run(`UPDATE inventory SET on_hand = 45 WHERE part_number = 'B-104'`);
    
    // Reset suppliers
    await this.db.run(`UPDATE suppliers SET delivery_time_hrs = 4, price = 126.00 WHERE id = 'SUP-A'`);
    await this.db.run(`UPDATE suppliers SET delivery_time_hrs = 24, price = 120.00 WHERE id = 'SUP-B'`);
    await this.db.run(`UPDATE suppliers SET delivery_time_hrs = 96, price = 110.00 WHERE id = 'SUP-C'`);
    
    // Reset production lines
    await this.db.run(`UPDATE production_lines SET status = 'Operational', active_job = 'JOB-8821' WHERE id = 'Line1'`);
    await this.db.run(`UPDATE production_lines SET status = 'Operational', active_job = 'JOB-9104' WHERE id = 'Line2'`);

    // Apply the scenario JSON patch
    await this.db.applyPatch(scenarioData.patch, scenarioData.id, scenarioData.description);

    return {
      success: true,
      scenarioId: scenarioData.id,
      label: scenarioData.label,
      description: scenarioData.description,
      expectedAgentFlow: scenarioData.expected_agent_flow,
      recoverySummary: scenarioData.recovery_summary
    };
  }
}
