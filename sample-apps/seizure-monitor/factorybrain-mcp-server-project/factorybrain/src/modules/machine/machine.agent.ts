import { Injectable } from '@nitrostack/core';
import { DatabaseService, MachineAlert, MachineRecord, RiskLevel, SensorReading } from '../../services/database.service.js';
import { QueueService } from '../../services/queue.service.js';
import { ORCHESTRATOR_EVENTS } from '../../orchestrator/orchestrator.jobs.js';

type SensorKey =
  | 'airTemperature'
  | 'processTemperature'
  | 'rpm'
  | 'torque'
  | 'vibration'
  | 'pressure'
  | 'humidity'
  | 'voltage'
  | 'current'
  | 'powerConsumption'
  | 'toolWear'
  | 'operatingHours';

export interface MachineAnalysisResult {
  machineId: string;
  failureProbability: number;
  urgency: RiskLevel;
  likelyCause: string;
  primaryPart: string;
  timestamp: string;
  consecutiveAnomalies: number;
  evidence: string[];
  alert?: MachineAlert;
}

const SENSOR_KEYS: SensorKey[] = [
  'airTemperature',
  'processTemperature',
  'rpm',
  'torque',
  'vibration',
  'pressure',
  'humidity',
  'voltage',
  'current',
  'powerConsumption',
  'toolWear',
  'operatingHours',
];

const PROFILE_BASELINES: Record<string, Partial<Record<SensorKey, { mean: number; stdDev: number }>>> = {
  CNC_STANDARD: {
    airTemperature: { mean: 298, stdDev: 2.5 },
    processTemperature: { mean: 308, stdDev: 3 },
    rpm: { mean: 1500, stdDev: 120 },
    torque: { mean: 40, stdDev: 5 },
    vibration: { mean: 0.38, stdDev: 0.08 },
    pressure: { mean: 98, stdDev: 4 },
    toolWear: { mean: 95, stdDev: 35 },
  },
  HYDRAULIC: {
    airTemperature: { mean: 299, stdDev: 2.5 },
    processTemperature: { mean: 310, stdDev: 3.5 },
    vibration: { mean: 0.45, stdDev: 0.1 },
    pressure: { mean: 120, stdDev: 6 },
    torque: { mean: 52, stdDev: 6 },
  },
  ROBOTIC: {
    airTemperature: { mean: 297, stdDev: 2 },
    processTemperature: { mean: 304, stdDev: 3 },
    rpm: { mean: 1300, stdDev: 110 },
    torque: { mean: 32, stdDev: 4 },
    vibration: { mean: 0.28, stdDev: 0.07 },
    voltage: { mean: 230, stdDev: 8 },
    current: { mean: 18, stdDev: 3 },
  },
  CONVEYOR: {
    rpm: { mean: 900, stdDev: 90 },
    torque: { mean: 28, stdDev: 5 },
    vibration: { mean: 0.32, stdDev: 0.08 },
    powerConsumption: { mean: 5.2, stdDev: 1 },
  },
  PACKAGING: {
    rpm: { mean: 1100, stdDev: 100 },
    torque: { mean: 35, stdDev: 5 },
    vibration: { mean: 0.34, stdDev: 0.08 },
    powerConsumption: { mean: 6.1, stdDev: 1.1 },
  },
};

@Injectable({ deps: [DatabaseService, QueueService] })
export class MachineAgent {
  constructor(
    private readonly database: DatabaseService,
    private readonly queue: QueueService,
  ) {}

  async analyzeReading(reading: SensorReading): Promise<MachineAnalysisResult> {
    const machine = this.requireMachine(reading.machineId);
    const previousWindow = this.database.getRecentReadings(reading.machineId, 19);
    const persistedReading = await this.database.saveSensorReading({
      ...reading,
      timestamp: reading.timestamp || new Date().toISOString(),
    });

    const window = [...previousWindow, persistedReading].slice(-20);
    const baseline = this.database.getHealthyBaseline(reading.machineId) ?? this.profileBaseline(machine);
    const anomalousRows = window.map((row) => this.getAnomalyEvidence(row, baseline));
    const consecutiveAnomalies = countConsecutiveAnomalies(anomalousRows);
    const latestEvidence = anomalousRows.at(-1) ?? [];
    const failureProbability = this.predictFailure(machine, latestEvidence, consecutiveAnomalies);
    const urgency = this.determineUrgency(failureProbability, machine.criticality);
    const likelyCause = this.mapLikelyCause(machine, latestEvidence);

    const result: MachineAnalysisResult = {
      machineId: machine.machineId,
      failureProbability,
      urgency,
      likelyCause,
      primaryPart: machine.primaryPart,
      timestamp: persistedReading.timestamp,
      consecutiveAnomalies,
      evidence: latestEvidence,
    };

    if (consecutiveAnomalies >= 3 && failureProbability >= 0.55) {
      result.alert = await this.emitAlert(machine, result);
    }

    return result;
  }

  predictFailure(machine: MachineRecord, evidence: string[], consecutiveAnomalies: number): number {
    const healthPrior = (100 - machine.healthScore) / 100;
    const riskPrior = { Low: 0.05, Medium: 0.12, High: 0.22, Critical: 0.32 }[machine.riskLevel];
    const anomalyScore = Math.min(evidence.length / 5, 1);
    const persistenceScore = Math.min(consecutiveAnomalies / 5, 1);
    const probability = 0.12 + healthPrior * 0.3 + riskPrior + anomalyScore * 0.24 + persistenceScore * 0.22;
    return roundProbability(Math.min(probability, 0.98));
  }

  private async emitAlert(machine: MachineRecord, result: MachineAnalysisResult): Promise<MachineAlert> {
    const alert = await this.database.saveAlert({
      kind: 'machine_failure',
      alertId: `ALERT-${machine.machineId}-${Date.now()}`,
      machineId: machine.machineId,
      failureProbability: result.failureProbability,
      urgency: result.urgency,
      likelyCause: result.likelyCause,
      primaryPart: machine.primaryPart,
      timestamp: result.timestamp,
      message: `${machine.machineName} shows sustained ${result.likelyCause} indicators. Required part: ${machine.primaryPart}.`,
    });

    await this.queue.publish({
      from: 'machine',
      to: 'orchestrator',
      type: ORCHESTRATOR_EVENTS.MACHINE_ALERT_CREATED,
      payload: alert,
    }, { idempotencyKey: `orchestrator-machine-alert-${alert.alertId}` });

    return alert;
  }

  private requireMachine(machineId: string): MachineRecord {
    const machine = this.database.findMachine(machineId);
    if (!machine) {
      throw new Error(`Unknown machine: ${machineId}`);
    }
    return machine;
  }

  private profileBaseline(machine: MachineRecord): Record<SensorKey, { mean: number; stdDev: number }> {
    const profile = PROFILE_BASELINES[machine.sensorProfile] ?? PROFILE_BASELINES.CNC_STANDARD;
    return Object.fromEntries(
      SENSOR_KEYS.map((key) => [key, profile[key] ?? { mean: 0, stdDev: 1 }]),
    ) as Record<SensorKey, { mean: number; stdDev: number }>;
  }

  private getAnomalyEvidence(reading: SensorReading, baseline: Record<SensorKey, { mean: number; stdDev: number }>): string[] {
    return SENSOR_KEYS.flatMap((key) => {
      const value = reading[key];
      const stats = baseline[key];
      if (!Number.isFinite(value) || stats.mean === 0) {
        return [];
      }

      const zScore = (value - stats.mean) / stats.stdDev;
      if (Math.abs(zScore) < 2.2) {
        return [];
      }

      return [`${key} ${zScore > 0 ? 'above' : 'below'} baseline (${value})`];
    });
  }

  private determineUrgency(probability: number, criticality: RiskLevel): RiskLevel {
    const criticalityBoost = { Low: 0, Medium: 0.08, High: 0.14, Critical: 0.22 }[criticality];
    const score = probability + criticalityBoost;
    if (score >= 0.85) return 'Critical';
    if (score >= 0.68) return 'High';
    if (score >= 0.45) return 'Medium';
    return 'Low';
  }

  private mapLikelyCause(machine: MachineRecord, evidence: string[]): string {
    const evidenceText = evidence.join(' ').toLowerCase();
    if (machine.failureProfile === 'Hydraulic Leak' || evidenceText.includes('pressure below')) {
      return 'Hydraulic Leak';
    }
    if (evidenceText.includes('voltage') || evidenceText.includes('current')) {
      return 'Electrical / Servo Fault';
    }
    if (evidenceText.includes('vibration') && evidenceText.includes('temperature')) {
      return machine.failureProfile || 'Bearing Wear';
    }
    if (evidenceText.includes('torque') || evidenceText.includes('rpm')) {
      return machine.failureProfile || 'Drive Train Degradation';
    }
    return machine.failureProfile || 'Unknown Failure Pattern';
  }
}

function countConsecutiveAnomalies(rows: string[][]): number {
  let count = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].length === 0) {
      break;
    }
    count += 1;
  }
  return count;
}

function roundProbability(value: number): number {
  return Math.round(value * 100) / 100;
}
