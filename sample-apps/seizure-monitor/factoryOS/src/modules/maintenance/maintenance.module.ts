import { Module, ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { execFileSync } from 'child_process';
import * as path from 'path';
import { MaintenanceResources } from './maintenance.resources.js';
import { MaintenancePrompts } from './maintenance.prompts.js';
import { StateService } from './state.service.js';
import { autonomyLedger } from './autonomy-ledger.service.js';

interface ModelPrediction {
  machine: string;
  machine_name: string;
  failure_probability: number;
  confidence_pct: number;
  risk_level: 'critical' | 'elevated' | 'watch' | 'normal';
  likely_cause: string;
  model_source: string;
}

const RISK_LEVEL_TO_NUMBER: Record<string, number> = {
  critical: 9,
  elevated: 6,
  watch: 3,
  normal: 1,
};

@Injectable({ deps: [StateService] })
export class MaintenanceTools {
  constructor(private state: StateService) {}

  @Tool({
    name: 'predict_failure',
    description: 'Runs the real AI4I-2020-trained RandomForest model on a machine\'s live sensor block to get a genuine failure probability.',
    inputSchema: z.object({ machineId: z.string() }),
  })
  async predict_failure({ machineId }: { machineId: string }) {
    const scriptPath = path.join(process.cwd(), 'data', 'maintenance-model', 'predict_failure.py');

    let prediction: ModelPrediction;
    try {
      const raw = execFileSync('python3', [scriptPath, machineId], { encoding: 'utf-8' });
      prediction = JSON.parse(raw);
    } catch (err: any) {
      return { error: `Model inference failed for ${machineId}: ${err.message}` };
    }

    const riskLevel = RISK_LEVEL_TO_NUMBER[prediction.risk_level] ?? 5;

    autonomyLedger.recordAction({
      agentName: 'Maintenance',
      actionType: 'predict_failure',
      inputSummary: `Predict failure for ${machineId}`,
      decision: `${prediction.risk_level} risk, ${prediction.confidence_pct}% confidence`,
      confidence: prediction.failure_probability,
      reasoning: prediction.likely_cause,
      policyParams: {},
    });

    return {
      machineId,
      riskLevel,
      failureProbability: prediction.failure_probability,
      confidencePct: prediction.confidence_pct,
      riskLevelLabel: prediction.risk_level,
      likelyCause: prediction.likely_cause,
      modelSource: prediction.model_source,
    };
  }

  @Tool({
    name: 'estimate_repair',
    description: 'Estimates repair time and the part required, based on the machine\'s bearing_id and current health.',
    inputSchema: z.object({ machineId: z.string() }),
  })
  async estimate_repair({ machineId }: { machineId: string }) {
    const state = this.state.getState();
    const m = state.machines[machineId];
    if (!m) return { error: `Machine ${machineId} not found` };

    const severity = m.health === 'red' ? 'severe' : m.health === 'yellow' ? 'moderate' : 'none';
    const estimatedMinutes = severity === 'severe' ? 38 : severity === 'moderate' ? 15 : 0;
    const partNeeded = severity === 'severe' ? m.bearing_id : (severity === 'moderate' && m.temperature_c > state.thresholds.temperature_c.warning) ? 'coolant_fluid' : null;

    const result = {
      machineId,
      estimatedMinutes,
      partNeeded,
      severity,
      downtimeCost: Math.round((estimatedMinutes / 60) * state.finance.downtime_cost_per_hour),
    };

    autonomyLedger.recordAction({
      agentName: 'Maintenance',
      actionType: 'estimate_repair',
      inputSummary: `Estimate repair for ${machineId}`,
      decision: `${estimatedMinutes} min, needs ${partNeeded ?? 'no parts'}, est. downtime cost $${result.downtimeCost}`,
      confidence: 0.8,
      reasoning: `Health status "${m.health}" maps to "${severity}" severity.`,
      policyParams: {},
    });

    return result;
  }

  @Tool({
    name: 'shutdown_machine',
    description: 'Shuts down a machine immediately (sets status to Fault-Shutdown). Used when risk exceeds the safety floor.',
    inputSchema: z.object({ machineId: z.string(), riskLevel: z.number().min(1).max(10) }),
  })
  async shutdown_machine({ machineId, riskLevel }: { machineId: string; riskLevel: number }) {
    const state = this.state.getState();
    const m = state.machines[machineId];
    if (!m) return { error: `Machine ${machineId} not found` };

    m.status = 'Fault';
    m.health = 'red';
    this.state.saveState(state);

    const entry = autonomyLedger.recordAction({
      agentName: 'Maintenance',
      actionType: 'shutdown_machine',
      inputSummary: `Shutdown request for ${machineId}, risk ${riskLevel}/10`,
      decision: `Machine ${machineId} shut down`,
      confidence: 0.95,
      reasoning:
        riskLevel >= 8
          ? 'Risk exceeds critical safety floor — auto-executed immediately, no approval wait.'
          : 'Shutdown requested below critical floor — logged, notification sent.',
      policyParams: { riskLevel },
    });

    return { machineId, status: 'SHUTDOWN', autonomyLevel: entry.autonomyLevel };
  }

  @Tool({
    name: 'assign_technician',
    description: 'Assigns the best-matched available technician (by specialty) to a machine issue.',
    inputSchema: z.object({ machineId: z.string(), specialty: z.string().optional() }),
  })
  async assign_technician({ machineId, specialty }: { machineId: string; specialty?: string }) {
    const state = this.state.getState();
    const m = state.machines[machineId];
    if (!m) return { error: `Machine ${machineId} not found` };

    const wantedSpecialty = specialty ?? 'Mechanical';
    const candidates = state.technicians
      .filter((t) => t.specialty === wantedSpecialty)
      .sort((a, b) => Number(b.available) - Number(a.available));

    const chosen = candidates[0];
    if (!chosen) return { machineId, status: 'NO_TECHNICIAN_AVAILABLE' };

    const wasAvailable = chosen.available;
    if (chosen.available) {
      chosen.available = false;
      this.state.saveState(state);
    }

    const entry = autonomyLedger.recordAction({
      agentName: 'Maintenance',
      actionType: 'assign_technician',
      inputSummary: `Assign technician to ${machineId} (${wantedSpecialty})`,
      decision: `Assigned ${chosen.name} (${chosen.id})`,
      confidence: 0.85,
      reasoning: wasAvailable
        ? `${chosen.name} matches specialty "${wantedSpecialty}" and was available.`
        : `${chosen.name} is the best specialty match but was not available.`,
      policyParams: { technicianAvailable: wasAvailable, overtimeRequired: chosen.shift === 'Night' },
    });

    return {
      machineId,
      technicianId: chosen.id,
      technicianName: chosen.name,
      specialty: chosen.specialty,
      autonomyLevel: entry.autonomyLevel,
    };
  }
}

@Module({
  name: 'maintenance',
  description: 'FactoryOS Machine Maintenance & Health Diagnostics Module',
  controllers: [MaintenanceTools, MaintenanceResources, MaintenancePrompts],
  providers: [StateService],
})
export class MaintenanceModule {}
