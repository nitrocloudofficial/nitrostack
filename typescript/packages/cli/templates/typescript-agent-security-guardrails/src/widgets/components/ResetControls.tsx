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

interface Props {
  busy: boolean;
  confirming: boolean;
  onConfirmingChange: (confirming: boolean) => void;
  onReset: () => void;
}

/** Two-step reset of the team's demo fixtures (administrators only). */
export function ResetControls({ busy, confirming, onConfirmingChange, onReset }: Props) {
  return (
    <footer>
      {confirming ? (
        <>
          <span>Restore this team’s resources, policy and history?</span>
          <button disabled={busy} onClick={onReset}>
            Restore fixtures
          </button>
          <button onClick={() => onConfirmingChange(false)}>Cancel</button>
        </>
      ) : (
        <button onClick={() => onConfirmingChange(true)}>Reset team demo</button>
      )}
    </footer>
  );
}
