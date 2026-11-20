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

import { useState, type FormEvent } from 'react';
import { HARD_LIMITS, MACHINE_TYPES } from '../../modules/cloudops/domain/limits.js';
import { dateTime, newestFirst } from '../lib/format.js';
import type { Action, Settings, Snapshot } from '../lib/types.js';

interface Props {
  data: Snapshot;
  action: Action;
  busy: boolean;
}

const NUMERIC_LIMITS = [
  ['gpu', 'Immediate GPUs', 0, HARD_LIMITS.gpusPerTeam],
  ['cpu', 'Immediate vCPU per instance', 1, HARD_LIMITS.vcpuPerInstance],
  ['budget', 'Monthly budget (USD)', 0, HARD_LIMITS.monthlySpendUsd],
  ['deployment', 'Deployment replicas', 1, 1024],
] as const;

const selected = <T extends string>(select: HTMLSelectElement) =>
  Array.from(select.selectedOptions, (o) => o.value as T);

/**
 * Team policy editor. Saving submits the revision it was loaded from, so a concurrent
 * edit is rejected instead of silently overwritten.
 */
export function Policies({ data, action, busy }: Props) {
  const [settings, setSettings] = useState<Settings>({ ...data.settings });
  const update = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });
  const lastChange = newestFirst(data.history).find((e) => e.event === 'UPDATED');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await action('update_policy', { revision: data.revision, settings });
  }

  return (
    <section>
      <h2>Team policies</h2>
      <p>
        Revision {data.revision} ·{' '}
        {lastChange
          ? 'Saved by ' + lastChange.actor + ' at ' + dateTime(lastChange.time)
          : 'Seed configuration'}
      </p>

      <form onSubmit={submit}>
        <fieldset disabled={!data.canEdit || busy}>
          <legend>Immediate operating limits</legend>
          <div className="fields">
            {NUMERIC_LIMITS.map(([key, title, min, max]) => (
              <label key={key}>
                {title}
                <input
                  required
                  type="number"
                  min={min}
                  max={max}
                  value={settings[key]}
                  onChange={(e) => update({ [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <label>
            Permitted regions
            <select
              multiple
              value={settings.regions}
              onChange={(e) => update({ regions: selected<Settings['regions'][number]>(e.target) })}
            >
              {data.permittedRegions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Permitted machine types
            <select
              multiple
              value={settings.machines}
              onChange={(e) => update({ machines: selected<Settings['machines'][number]>(e.target) })}
            >
              {MACHINE_TYPES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.reviewDeletion}
              onChange={(e) => update({ reviewDeletion: e.target.checked })}
            />{' '}
            Review every deletion
          </label>
          <button>Save policy</button>
        </fieldset>
      </form>

      <p>
        Hard limits · {HARD_LIMITS.gpusPerTeam} GPUs per team · {HARD_LIMITS.vcpuPerInstance} vCPU
        per instance · ${HARD_LIMITS.monthlySpendUsd.toLocaleString('en-US')} monthly · production
        deletion requires review.
      </p>

      {lastChange && (
        <details>
          <summary>Previous and saved settings</summary>
          <pre>{JSON.stringify(lastChange.details, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
