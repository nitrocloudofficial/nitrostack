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

/**
 * The reply used by every walkthrough step; only the channel changes. The server scores
 * it as slang 8, which reads as the `street` voice.
 */
export const STREET_REPLY = {
  channel: 'chat',
  customer: 'Jordan',
  text: 'Yo fam, your sneakers are fire and the drip is legit, no cap. Real talk, they ship Friday. Bet!',
};

/** Instruction shown for each step. */
export const stepInstructions = (slangLimit: number) => [
  'Send a street-style reply on chat. It scores slang 8; anything above ' +
    slangLimit +
    ' currently needs review.',
  'Open Policies, set Slang review above to 8 and save.',
  'Retry the same reply with the same arguments.',
  'Send the same reply on the press channel.',
  'Inspect the decisions and policy revisions in the audit log.',
];

/** Button label for each step. */
export const STEP_ACTIONS = [
  'Send street reply',
  'Edit slang limit',
  'Retry chat reply',
  'Try press channel',
  'Inspect audit log',
];

/**
 * Advances the walkthrough when the expected result arrives:
 *
 *   0 reply held for review → 1 slang limit raised to 8 → 2 retry allowed
 *   → 3 press channel blocked → 4 inspect the audit log
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
  if (tool === 'send_reply' && result.decision === 'REQUIRE_APPROVAL' && step === 0) return 1;
  if (tool === 'update_policy' && step === 1 && (args.settings as Settings).slang === 8) return 2;
  if (tool === 'send_reply' && result.executed && step === 2) return 3;
  if (tool === 'send_reply' && result.decision === 'BLOCK' && step === 3) return 4;
  return step;
}
