/**
 * Core predictive-maintenance logic for the fleet module.
 *
 * These are plain, deterministic functions (no I/O, no LLM calls) so the
 * same machineId + history always produces the same result — a simple
 * trend/threshold model, but a consistent and defensible one.
 */

import { SENSOR_SPECS } from './fleet.data.js';
import type {
  SensorReading,
  SensorName,
  Severity,
  AnalysisResult,
  FailurePrediction,
  SensorTrigger
} from './fleet.types.js';

const SENSOR_NAMES = Object.keys(SENSOR_SPECS) as SensorName[];

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  const variance = mean(values.map(v => (v - avg) ** 2));
  return Math.sqrt(variance);
}

/** Ordinary least-squares fit of value against cycle number. */
function linearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length;
  const xMean = mean(points.map(p => p.x));
  const yMean = mean(points.map(p => p.y));

  let numerator = 0;
  let denominator = 0;
  for (const { x, y } of points) {
    numerator += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;
  for (const { x, y } of points) {
    const predicted = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
    ssTot += (y - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? (n > 0 ? 1 : 0) : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

function classifySeverity(zScore: number): Severity {
  if (zScore > 4) return 'high';
  if (zScore > 2.5) return 'moderate';
  if (zScore > 1.5) return 'low';
  return 'none';
}

const SEVERITY_RANK: Record<Severity, number> = { none: 0, low: 1, moderate: 2, high: 3 };

/**
 * Compares recent sensor readings against each machine's own early-life
 * baseline (first 20% of cycles, assumed healthy break-in period) to
 * detect anomalies.
 */
export function analyzeSensors(machineId: string, history: SensorReading[]): AnalysisResult {
  const baselineSize = Math.max(10, Math.floor(history.length * 0.2));
  const baselineWindow = history.slice(0, Math.min(baselineSize, history.length));
  const recentWindow = history.slice(-Math.min(5, history.length));

  const triggeredSensors: SensorTrigger[] = [];

  for (const sensor of SENSOR_NAMES) {
    const spec = SENSOR_SPECS[sensor];
    const baselineValues = baselineWindow.map(r => r[sensor]);
    const baselineMean = mean(baselineValues);
    const baselineStd = Math.max(stdDev(baselineValues, baselineMean), spec.baselineStd * 0.25);

    const recentMean = mean(recentWindow.map(r => r[sensor]));
    const deviation = spec.direction === 'increase' ? recentMean - baselineMean : baselineMean - recentMean;
    const zScore = deviation / baselineStd;
    const severity = classifySeverity(zScore);

    if (severity !== 'none') {
      triggeredSensors.push({
        sensor,
        unit: spec.unit,
        currentValue: Math.round(recentMean * 100) / 100,
        baselineMean: Math.round(baselineMean * 100) / 100,
        baselineStd: Math.round(baselineStd * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        severity
      });
    }
  }

  triggeredSensors.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.zScore - a.zScore);

  const overallSeverity: Severity = triggeredSensors.length > 0 ? triggeredSensors[0].severity : 'none';
  const anomaly = triggeredSensors.length > 0;

  const summary = anomaly
    ? `${machineId} shows ${overallSeverity} severity anomalies in ${triggeredSensors.map(t => t.sensor).join(', ')}, deviating from its own healthy baseline.`
    : `${machineId} readings are within normal baseline range across all sensors.`;

  return { machineId, anomaly, severity: overallSeverity, triggeredSensors, summary };
}

/**
 * Projects remaining useful life by fitting a trend line to each anomalous
 * sensor's recent readings and estimating when it will cross its critical
 * threshold. Assumes 1 cycle ~= 1 operating day, consistent with the
 * synthetic dataset's cycle-per-day generation.
 */
export function predictFailureWindow(
  machineId: string,
  history: SensorReading[],
  analysis: AnalysisResult
): FailurePrediction {
  if (!analysis.anomaly) {
    return {
      machineId,
      atRisk: false,
      remainingCycles: null,
      remainingDays: null,
      drivingSensor: null,
      confidence: null,
      method: 'trend-vs-baseline',
      summary: 'No anomaly detected, so no failure trend to project. Machine is operating within normal parameters.'
    };
  }

  const trendWindowSize = Math.min(15, history.length);
  const trendWindow = history.slice(-trendWindowSize);

  type Projection = { sensor: SensorName; remainingCycles: number; rSquared: number };
  const projections: Projection[] = [];

  for (const trigger of analysis.triggeredSensors) {
    const spec = SENSOR_SPECS[trigger.sensor];
    const points = trendWindow.map(r => ({ x: r.cycle, y: r[trigger.sensor] }));
    const { slope, intercept, rSquared } = linearRegression(points);

    const lastCycle = trendWindow[trendWindow.length - 1].cycle;
    const currentProjectedValue = slope * lastCycle + intercept;

    if (slope === 0) continue;
    const remainingCycles = (spec.criticalThreshold - currentProjectedValue) / slope;

    // Only a positive, forward-looking crossing counts as a real projection.
    if (remainingCycles > 0 && Number.isFinite(remainingCycles)) {
      projections.push({ sensor: trigger.sensor, remainingCycles, rSquared });
    }
  }

  if (projections.length === 0) {
    return {
      machineId,
      atRisk: true,
      remainingCycles: null,
      remainingDays: null,
      drivingSensor: analysis.triggeredSensors[0]?.sensor ?? null,
      confidence: 'low',
      method: 'trend-vs-baseline',
      summary: `${machineId} has anomalous readings but no clear worsening trend yet; unable to project a reliable failure window.`
    };
  }

  projections.sort((a, b) => a.remainingCycles - b.remainingCycles);
  const soonest = projections[0];
  const confidence: 'low' | 'medium' | 'high' =
    soonest.rSquared > 0.7 ? 'high' : soonest.rSquared > 0.4 ? 'medium' : 'low';

  const remainingCycles = Math.max(0, Math.round(soonest.remainingCycles));

  return {
    machineId,
    atRisk: true,
    remainingCycles,
    remainingDays: remainingCycles, // 1 cycle ~= 1 operating day in this dataset
    drivingSensor: soonest.sensor,
    confidence,
    method: 'linear-regression-trend-projection',
    summary: `Based on the ${soonest.sensor} trend, ${machineId} is projected to reach critical failure risk in approximately ${remainingCycles} cycles (~${remainingCycles} days), with ${confidence} confidence.`
  };
}
