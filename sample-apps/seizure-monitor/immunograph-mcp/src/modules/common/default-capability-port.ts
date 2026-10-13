import { loadMcpEnvironment } from '../config/environment.js';

import type { CapabilityPort } from './capability-port.js';
import { HybridBindingCapabilityPort } from './hybrid-binding-capability-port.js';

/**
 * Build the default scientific capability port from the current environment.
 *
 * Frozen connector policy:
 * - IEDB HTTP is the primary live connector.
 * - MHCflurry is optional and local/runtime-dependent.
 * - Synthetic + fixtures remain the demo-safe fallback.
 * - GraphBepi remains fixture-only for MVP.
 */
export function buildDefaultCapabilityPort(): CapabilityPort {
  const env = loadMcpEnvironment();
  return new HybridBindingCapabilityPort({
    iedb: {
      enabled: env.IEDB_LIVE_ENABLED,
      timeoutMs: env.IEDB_TIMEOUT_MS,
      maximumResponseBytes: env.IEDB_MAX_RESPONSE_BYTES,
      ...(env.IEDB_MHCI_URL ? { mhciUrl: env.IEDB_MHCI_URL } : {}),
      ...(env.IEDB_MHCII_URL ? { mhciiUrl: env.IEDB_MHCII_URL } : {}),
    },
    iedbPopulationCoverage: {
      enabled: env.IEDB_POPULATION_COVERAGE_ENABLED,
      timeoutMs: env.IEDB_POPULATION_COVERAGE_TIMEOUT_MS,
      maximumResponseBytes: env.IEDB_POPULATION_COVERAGE_MAX_RESPONSE_BYTES,
      ...(env.IEDB_POPULATION_COVERAGE_URL ? { url: env.IEDB_POPULATION_COVERAGE_URL } : {}),
      ...(env.IEDB_POPULATION_COVERAGE_SCRIPT_PATH
        ? { scriptPath: env.IEDB_POPULATION_COVERAGE_SCRIPT_PATH }
        : {}),
      pythonCommand: env.IEDB_POPULATION_COVERAGE_PYTHON_COMMAND,
    },
    mhcflurry: {
      enabled: env.MHCFLURRY_ENABLED,
      command: env.MHCFLURRY_COMMAND,
      methodVersion: env.MHCFLURRY_METHOD_VERSION,
      timeoutMs: env.MHCFLURRY_TIMEOUT_MS,
      maximumResponseBytes: env.MHCFLURRY_MAX_RESPONSE_BYTES,
    },
  });
}
