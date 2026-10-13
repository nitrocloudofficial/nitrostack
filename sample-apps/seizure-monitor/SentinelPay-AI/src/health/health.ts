/**
 * SentinelPay AI — Liveness / Readiness
 * Source: Technical Specification §13.7 (Health checks)
 *
 * Liveness: the process is running (nothing to check but presence).
 * Readiness: the fixture data required to serve every tool has loaded.
 * Exact NitroStack health-endpoint registration syntax must follow the
 * installed SDK (Appendix B) — this module supplies only the
 * framework-agnostic check functions.
 */

import { fixtureRepository } from "../services/fixtures.js";

export interface HealthStatus {
  status: "ok" | "error";
  timestamp: string;
}

export interface ReadinessStatus extends HealthStatus {
  checks: {
    fixturesLoaded: boolean;
  };
}

/** Always ok if the process can execute this function at all. */
export function checkLiveness(): HealthStatus {
  return { status: "ok", timestamp: new Date().toISOString() };
}

/** Not ready if the deterministic fixture dataset failed to load. */
export function checkReadiness(): ReadinessStatus {
  const fixturesLoaded = fixtureRepository.isReady();
  return {
    status: fixturesLoaded ? "ok" : "error",
    timestamp: new Date().toISOString(),
    checks: { fixturesLoaded },
  };
}
