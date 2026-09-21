/**
 * scorecard.ts — rules-first, pre-baked scorecard, explainable reason codes
 * (CLAUDE.md rule 8: NEVER trained ML). Pure, deterministic.
 *
 * Pipeline: raw metrics → clamped score band → deterministic health score.
 */

export interface InfrastructureMetrics {
  cpu_utilization: number; // 0-100
  memory_utilization: number; // 0-100
  latency_ms: number; // 0-5000
  error_rate: number; // 0-100 (percentage)
}

export interface DeploymentMetrics {
  success_rate: number; // 0-100
  mttr_minutes: number; // Mean Time to Recovery
}

export interface IncidentSeverity {
  score: number; // 0-100
  status: "CRITICAL" | "WARNING" | "HEALTHY";
  reason_codes: string[];
}

/**
 * Helper function to clamp values between min and max
 */
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Weighted 0–100 infrastructure health score.
 * Pure deterministic mathematics. No AI inference.
 */
export function computeInfrastructureHealth(
  infra: InfrastructureMetrics,
  deploy: DeploymentMetrics,
): IncidentSeverity {
  const reason_codes: string[] = [];

  // CPU Score -> 0..30 (lower is better, max penalty if > 90%)
  const cpuPenalty = clamp((infra.cpu_utilization - 60) / (90 - 60), 0, 1) * 30;
  const cpuScore = 30 - cpuPenalty;
  if (cpuPenalty > 20) reason_codes.push("HIGH_CPU_LOAD");

  // Latency Score -> 0..20 (max penalty if > 2000ms)
  const latencyPenalty =
    clamp((infra.latency_ms - 200) / (2000 - 200), 0, 1) * 20;
  const latencyScore = 20 - latencyPenalty;
  if (latencyPenalty > 15) reason_codes.push("LATENCY_SPIKE");

  // Error Rate Score -> 0..25 (max penalty if > 5%)
  const errorPenalty = clamp(infra.error_rate / 5, 0, 1) * 25;
  const errorScore = 25 - errorPenalty;
  if (errorPenalty > 15) reason_codes.push("HIGH_ERROR_RATE");

  // Deployment Success -> 0..25 (max penalty if < 80%)
  const deployComp = clamp((deploy.success_rate - 80) / (100 - 80), 0, 1) * 25;
  const deployScore = deployComp;
  if (deployScore < 15) reason_codes.push("POOR_DEPLOYMENT_SUCCESS");

  const totalScore = Math.round(
    cpuScore + latencyScore + errorScore + deployScore,
  );

  let status: "CRITICAL" | "WARNING" | "HEALTHY" = "HEALTHY";
  if (totalScore < 60) {
    status = "CRITICAL";
  } else if (totalScore < 85) {
    status = "WARNING";
  }

  return {
    score: totalScore,
    status,
    reason_codes,
  };
}
