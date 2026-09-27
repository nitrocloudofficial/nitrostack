/**
 * P-F Curve models: hardcoded, non-linear risk trajectories per failure mode.
 * bearing_spall: slow sigmoid ramp (~2% → 90% over 96h)
 * thermal_degradation: fast front-loaded (~3% → 97% over 96h)
 */

import { FailureMode } from './types.js';

/**
 * Sigmoid function for bearing_spall: slow, gradual ramp.
 * Risk starts low, accelerates mid-curve, plateaus near 90%.
 */
function bearingSpallTrajectory(hoursElapsed: number): number {
  // Sigmoid centered at 48h, steepness k=0.08
  const midpoint = 48;
  const steepness = 0.08;
  const maxRisk = 90;
  const minRisk = 2;

  const sigmoid = 1 / (1 + Math.exp(-steepness * (hoursElapsed - midpoint)));
  return minRisk + sigmoid * (maxRisk - minRisk);
}

/**
 * Exponential front-loaded curve for thermal_degradation: fast initial ramp.
 * Risk jumps quickly in first 24h, then slows.
 */
function thermalDegradationTrajectory(hoursElapsed: number): number {
  // Exponential decay: risk = 97 * (1 - e^(-0.04 * t))
  const maxRisk = 97;
  const decayRate = 0.04;

  return maxRisk * (1 - Math.exp(-decayRate * hoursElapsed));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function trajectoryProgress(
  trajectory: (hoursElapsed: number) => number,
  hoursFromNow: number,
): number {
  const startRisk = trajectory(0);
  const endRisk = trajectory(96);
  const horizonRisk = trajectory(clamp(hoursFromNow, 0, 96));

  if (endRisk <= startRisk) {
    return 0;
  }

  return clamp((horizonRisk - startRisk) / (endRisk - startRisk), 0, 1);
}

/**
 * Get risk percentage at a given horizon (hours from now).
 * @param failureMode The failure mode type
 * @param currentRiskPct Current risk percentage (baseline)
 * @param hoursFromNow Hours into the future (0 = now)
 * @returns Risk percentage at that horizon
 */
export function getRiskAtHorizon(
  failureMode: FailureMode,
  currentRiskPct: number,
  hoursFromNow: number,
): number {
  if (hoursFromNow === 0) {
    return currentRiskPct;
  }

  let progress: number;
  let maxRisk: number;

  if (failureMode === 'bearing_spall') {
    progress = trajectoryProgress(bearingSpallTrajectory, hoursFromNow);
    maxRisk = 90;
  } else if (failureMode === 'thermal_degradation') {
    progress = trajectoryProgress(thermalDegradationTrajectory, hoursFromNow);
    maxRisk = 97;
  } else {
    throw new Error(`Unknown failure mode: ${failureMode}`);
  }

  // Treat the P-F curve as forward progress from the current risk toward
  // the failure-mode ceiling. This preserves curve shape without allowing
  // a future horizon to dip below the observed current risk.
  return currentRiskPct + (maxRisk - currentRiskPct) * progress;
}

/**
 * Derive urgency tier from risk percentage (server-side, never exposed to Production).
 */
export function riskToUrgencyTier(riskPct: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (riskPct < 30) return 'Low';
  if (riskPct < 60) return 'Medium';
  if (riskPct < 85) return 'High';
  return 'Critical';
}
