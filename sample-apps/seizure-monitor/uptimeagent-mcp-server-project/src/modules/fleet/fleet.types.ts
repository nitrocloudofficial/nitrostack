/**
 * Shared type definitions for the fleet monitoring module.
 */

export type SensorName = 'temperature' | 'pressure' | 'rotationalSpeed';

export type Severity = 'none' | 'low' | 'moderate' | 'high';

export type MachineStatus = 'operational' | 'degraded' | 'critical';

export interface Machine {
  id: string;
  name: string;
  type: string;
  installDate: string;
  status: MachineStatus;
  totalCyclesLogged: number;
  /** Which real dataset this machine's readings were sourced from. */
  sourceDataset?: string;
  /** Unit number in the source NASA C-MAPSS FD001 file, for traceability. */
  realUnitNumber?: number;
}

export interface SensorReading {
  cycle: number;
  timestamp: string;
  /** Sensor 4 (T50) - LPT outlet temperature, degR. */
  temperature: number;
  /** Sensor 11 (Ps30) - HPC outlet static pressure, psia. */
  pressure: number;
  /** Sensor 14 (NRc) - corrected core speed, rpm. */
  rotationalSpeed: number;
}

export type SensorHistory = Record<string, SensorReading[]>;

export interface SensorSpec {
  unit: string;
  baselineMean: number;
  baselineStd: number;
  direction: 'increase' | 'decrease';
  criticalThreshold: number;
}

export interface MaintenanceEntry {
  faultType: string;
  triggerSensor: SensorName;
  description: string;
  severityGuidance: Record<'low' | 'moderate' | 'high', string>;
  recommendedAction: string;
  estimatedRepairHours: number;
}

export interface SensorTrigger {
  sensor: SensorName;
  unit: string;
  currentValue: number;
  baselineMean: number;
  baselineStd: number;
  zScore: number;
  severity: Severity;
}

export interface AnalysisResult {
  machineId: string;
  anomaly: boolean;
  severity: Severity;
  triggeredSensors: SensorTrigger[];
  summary: string;
}

export interface FailurePrediction {
  machineId: string;
  atRisk: boolean;
  remainingCycles: number | null;
  remainingDays: number | null;
  drivingSensor: SensorName | null;
  confidence: 'low' | 'medium' | 'high' | null;
  method: string;
  summary: string;
}
