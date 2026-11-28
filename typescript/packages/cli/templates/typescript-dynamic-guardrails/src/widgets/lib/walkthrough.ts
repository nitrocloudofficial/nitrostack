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

import type { Settings, ToolOutcome } from './types.js';

/** The GPU request used by every walkthrough step; only the region changes. */
export const GPU_REQUEST = {
  region: 'Mumbai',
  machine: 'accelerated',
  cpu: 1,
  memory: 4,
  gpu: 1,
  count: 8,
  environment: 'development',
  workload: 'ML training',
};

/** Instruction shown for each step. */
export const stepInstructions = (immediateGpus: number) => [
  'Request eight GPUs in Mumbai. The current immediate quota is ' + immediateGpus + '.',
  'Open Policies, set Immediate GPUs to 8 and save.',
  'Retry the original Mumbai request with the same arguments.',
  'Try the same workload in Singapore.',
  'Inspect the decisions and policy revisions in the audit log.',
];

/** Button label for each step. */
export const STEP_ACTIONS = [
  'Request eight GPUs',
  'Edit GPU quota',
  'Retry Mumbai request',
  'Try Singapore',
  'Inspect audit log',
];

/**
 * Advances the walkthrough when the expected result arrives:
 *
 *   0 request held for review → 1 quota raised to 8 → 2 retry allowed
 *   → 3 Singapore blocked → 4 inspect the audit log
 *
 * Returns the current step when the result does not complete it.
 */
export function nextStep(
  step: number,
  tool: string,
  args: Record<string, unknown>,
  result: ToolOutcome
): number {
  if (tool === 'reset_demo') return 0;
  if (tool === 'provision_instance' && result.decision === 'REQUIRE_APPROVAL' && step === 0) return 1;
  if (tool === 'update_policy' && step === 1 && (args.settings as Settings).gpu === 8) return 2;
  if (tool === 'provision_instance' && result.executed && step === 2) return 3;
  if (tool === 'provision_instance' && result.decision === 'BLOCK' && step === 3) return 4;
  return step;
}
