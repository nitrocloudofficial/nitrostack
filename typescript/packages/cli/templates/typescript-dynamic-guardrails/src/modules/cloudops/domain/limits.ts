/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Server-owned ceilings. Team administrators can tune their immediate limits up to these
 * values, but no policy edit or human approval can exceed them.
 */
export const HARD_LIMITS = {
  /** Total GPUs a team may hold across all resources. */
  gpusPerTeam: 16,
  /** vCPU for a single instance. */
  vcpuPerInstance: 32,
  /** Projected monthly spend in USD across all team resources. */
  monthlySpendUsd: 5000,
} as const;

export const REGIONS = ['Mumbai', 'Singapore'] as const;
export const MACHINE_TYPES = ['general', 'accelerated'] as const;
export const ENVIRONMENTS = ['development', 'staging', 'production'] as const;
export const RESOURCE_TYPES = ['instance', 'deployment', 'database'] as const;

/** Deterministic utilization shown for any resource with GPUs attached. */
export const SIMULATED_GPU_UTILIZATION = 65;
