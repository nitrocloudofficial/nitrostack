/**
 * Data access for the fleet monitoring module.
 *
 * Reads the dataset from ./data (project root, not src/) via
 * process.cwd(), mirroring the uploads/ pattern already used by
 * calculator.tools.ts. This works identically in `npm run dev` and in a
 * built/deployed server, since both run from the project root.
 */

import { readFileSync } from 'fs';
import path from 'path';
import type { Machine, SensorHistory, MaintenanceEntry, SensorName, SensorSpec } from './fleet.types.js';

/**
 * Baseline operating point, noise, degradation direction, and critical
 * threshold for each sensor. These are empirically derived from the real
 * NASA C-MAPSS FD001 dataset (see scripts/import-real-data.mjs) — the
 * fleet-wide early-life mean/std across all 100 real engines, and a
 * critical threshold near the observed real end-of-life mean for each
 * sensor. All three sensors trend upward toward failure in this dataset.
 */
export const SENSOR_SPECS: Record<SensorName, SensorSpec> = {
  temperature: { unit: 'degR', baselineMean: 1402.9, baselineStd: 4.4, direction: 'increase', criticalThreshold: 1430 },
  pressure: { unit: 'psia', baselineMean: 47.36, baselineStd: 0.14, direction: 'increase', criticalThreshold: 48.2 },
  rotationalSpeed: { unit: 'rpm', baselineMean: 8137.4, baselineStd: 7.4, direction: 'increase', criticalThreshold: 8170 }
};

let fleetCache: Machine[] | null = null;
let historyCache: SensorHistory | null = null;
let manualCache: MaintenanceEntry[] | null = null;

function dataPath(fileName: string): string {
  return path.join(process.cwd(), 'data', fileName);
}

export function loadFleet(): Machine[] {
  if (!fleetCache) {
    fleetCache = JSON.parse(readFileSync(dataPath('machine-fleet.json'), 'utf-8'));
  }
  return fleetCache!;
}

export function loadSensorHistory(): SensorHistory {
  if (!historyCache) {
    historyCache = JSON.parse(readFileSync(dataPath('sensor-history.json'), 'utf-8'));
  }
  return historyCache!;
}

export function loadMaintenanceManual(): MaintenanceEntry[] {
  if (!manualCache) {
    manualCache = JSON.parse(readFileSync(dataPath('maintenance-manual.json'), 'utf-8'));
  }
  return manualCache!;
}

export function getMachine(machineId: string): Machine | undefined {
  return loadFleet().find(m => m.id === machineId);
}

export function getMachineHistory(machineId: string) {
  return loadSensorHistory()[machineId];
}

export function getManualEntryForSensor(sensor: SensorName): MaintenanceEntry | undefined {
  return loadMaintenanceManual().find(entry => entry.triggerSensor === sensor);
}
