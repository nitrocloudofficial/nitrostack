import { Injectable } from '@nitrostack/core';
import { DbService } from './db.service.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

@Injectable({ deps: [DbService] })
export class MachineService {
  constructor(private db: DbService) {}

  async getMachine(machineId: string) {
    const row = await this.db.get<any>(`SELECT * FROM machines WHERE id = ?`, [machineId]);
    if (!row) {
      throw new Error(`Machine ${machineId} not found`);
    }
    return row;
  }

  async predictFailure(machineId: string) {
    const machine = await this.getMachine(machineId);

    // Try calling the real Random Forest ML model trained on AI4I 2020 dataset
    try {
      const scriptPath = path.join(process.cwd(), 'factoryos-data', 'maintenance-model', 'predict_failure.py');
      if (fs.existsSync(scriptPath)) {
        const pyResult = execSync(`python "${scriptPath}" ${machineId}`, { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] });
        const jsonMatch = pyResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const mlData = JSON.parse(jsonMatch[0]);
          return {
            machineId,
            failureProbability: mlData.failure_probability,
            confidencePct: mlData.confidence_pct,
            riskLevel: mlData.risk_level,
            likelyCause: mlData.likely_cause,
            modelSource: mlData.model_source,
            inputSensors: mlData.input_sensors,
            currentTemperature: machine.temperature_c,
            currentVibration: machine.vibration_mm_s
          };
        }
      }
    } catch (err: any) {
      console.warn(`Real ML Model execution fallback for ${machineId}:`, err.message);
    }

    // Fallback rule-based estimation if Python is unavailable
    const temp = machine.temperature_c;
    const vib = machine.vibration_mm_s;

    let failureProbability = 0.18;
    let riskLevel = 'normal';
    let predictedAnomalyWindow = '14-21 days';
    let criticalComponents: string[] = [];

    if (vib > 7.0) {
      failureProbability = 0.88;
      riskLevel = 'high';
      predictedAnomalyWindow = '12-24 hours';
      criticalComponents = ['Conveyor Coupling', 'Bearing X52'];
    } else if (temp > 85.0 && vib > 5.0) {
      failureProbability = 0.98;
      riskLevel = 'critical';
      predictedAnomalyWindow = 'Immediate (< 12 hours)';
      criticalComponents = ['Bearing X52'];
    } else if (temp > 80.0) {
      failureProbability = 0.45;
      riskLevel = 'medium';
      predictedAnomalyWindow = '2-5 days';
      criticalComponents = ['Coolant Fluid'];
    }

    return {
      machineId,
      failureProbability,
      riskLevel,
      predictedAnomalyWindow,
      criticalComponents,
      currentTemperature: temp,
      currentVibration: vib,
      modelSource: 'Rule-based fallback estimation'
    };
  }

  async estimateRepair(machineId: string) {
    let repairTimeMinutes = 30;
    let partsNeeded = 'generic_bearing';
    let laborCost = 100;
    let downtimeHours = 1;

    if (machineId === 'M12') {
      repairTimeMinutes = 38;
      partsNeeded = 'bearing_X52';
      laborCost = 150;
      downtimeHours = 4;
    } else if (machineId === 'M21') {
      repairTimeMinutes = 15;
      partsNeeded = 'coolant_fluid';
      laborCost = 50;
      downtimeHours = 0.25;
    } else if (machineId === 'M13') {
      repairTimeMinutes = 45;
      partsNeeded = 'bearing_X52';
      laborCost = 200;
      downtimeHours = 24;
    }

    return {
      machineId,
      repairTimeMinutes,
      partsNeeded,
      estimatedLaborCost: laborCost,
      currency: 'USD',
      estimatedDowntimeHours: downtimeHours,
      estimatedBusinessImpact: downtimeHours * 2500 // $2500 per downtime hour
    };
  }

  async shutdownMachine(machineId: string) {
    await this.db.run(
      `UPDATE machines 
       SET status = 'Offline (Maintenance)', health = 'green', temperature_c = 25.0, vibration_mm_s = 0.0 
       WHERE id = ?`,
      [machineId]
    );

    return {
      machineId,
      status: 'Offline (Maintenance)',
      message: `${machineId} shut down safely. Heat and vibration levels resetting to room ambient.`,
      timestamp: new Date().toISOString()
    };
  }

  async assignTechnician(machineId: string, technicianId: string, taskDetails: string) {
    return {
      assignmentId: `JOB-${Date.now()}`,
      machineId,
      technicianId,
      status: 'assigned',
      scheduledStart: new Date().toISOString(),
      taskDetails
    };
  }
}
