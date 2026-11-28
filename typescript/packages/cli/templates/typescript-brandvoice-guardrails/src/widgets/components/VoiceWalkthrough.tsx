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

import { STEP_ACTIONS, stepInstructions } from '../lib/walkthrough.js';

export interface VoiceWalkthroughProps {
  step: number;
  slangLimit: number;
  busy: boolean;
  /** Runs the step's action: send a reply, or open the tab the step needs. */
  onAdvance: () => void;
}

/** Guided demo: a street reply is held, the slang limit is raised, the retry passes, press is blocked. */
export function VoiceWalkthrough({ step, slangLimit, busy, onAdvance }: VoiceWalkthroughProps) {
  return (
    <section className="demo">
      <h2>Voice walkthrough</h2>
      <p>{stepInstructions(slangLimit)[step]}</p>
      <button disabled={busy} onClick={onAdvance}>
        {STEP_ACTIONS[step]}
      </button>
    </section>
  );
}
