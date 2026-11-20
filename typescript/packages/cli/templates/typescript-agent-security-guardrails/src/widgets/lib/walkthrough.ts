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

export const JOB_REQUEST = { workspaceId: 'research-workspace', destination: 'approved_external', outboundMb: 8, durationMinutes: 5 };

export const stepInstructions = (limit: number) => [
  'Submit an 8 MB outbound job. The immediate limit is ' + limit + ' MB.',
  'Set Immediate outbound MB to 8 and save the policy.',
  'Retry the same job with the same destination.',
  'Switch the destination to an unapproved external service.',
  'Compare the decisions and policy revisions.',
];
export const STEP_ACTIONS = ['Request 8 MB job', 'Edit outbound limit', 'Retry approved destination', 'Try unapproved destination', 'Inspect audit log'];
export function nextStep(
  step: number,
  tool: string,
  args: Record<string, unknown>,
  result: ToolOutcome
): number {
  if (tool === 'reset_demo') return 0;
  if (tool === 'run_outbound_job' && result.decision === 'REQUIRE_APPROVAL' && step === 0) return 1;
  if (tool === 'update_policy' && step === 1 && (args.settings as Settings).outboundMb === 8) return 2;
  if (tool === 'run_outbound_job' && result.executed && step === 2) return 3;
  if (tool === 'run_outbound_job' && result.decision === 'BLOCK' && step === 3) return 4;
  return step;
}
