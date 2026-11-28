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
import {
  HARD_LIMITS,
  MACHINE_TYPES,
  PRODUCTION_DEPLOYMENT_MODES,
} from '../../modules/cloudops/domain/limits.js';
import { dateTime, newestFirst } from '../lib/format.js';
import type { Action, PolicyImpact, Query, Settings, Snapshot } from '../lib/types.js';
import { ImpactPreview } from './ImpactPreview.js';
import { PolicyHistory } from './PolicyHistory.js';

interface Props {
  data: Snapshot;
  action: Action;
  query: Query;
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
 * edit is rejected instead of silently overwritten. "Preview impact" shows how the unsaved
 * settings would have decided recent requests.
 */
export function Policies({ data, action, query, busy }: Props) {
  const [settings, setSettings] = useState<Settings>({ ...data.settings });
  const [impact, setImpact] = useState<PolicyImpact | null>(null);
  const update = (patch: Partial<Settings>) => {
    setSettings({ ...settings, ...patch });
    setImpact(null); // A preview only describes the settings it was made for.
  };
  const lastChange = newestFirst(data.history).find(
    (e) => e.event === 'UPDATED' || e.event === 'ROLLBACK'
  );

  async function preview() {
    setImpact(await query<PolicyImpact>('simulate_policy', { settings }));
  }

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
          ? (lastChange.event === 'ROLLBACK' ? 'Restored' : 'Saved') +
            ' by ' +
            lastChange.actor +
            ' at ' +
            dateTime(lastChange.time)
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
            Permitted environments
            <select
              multiple
              value={settings.environments}
              onChange={(e) =>
                update({ environments: selected<Settings['environments'][number]>(e.target) })
              }
            >
              {data.boundary.environments.map((env) => (
                <option key={env}>{env}</option>
              ))}
            </select>
          </label>
          <label>
            Production deployments
            <select
              value={settings.productionDeployments}
              onChange={(e) =>
                update({
                  productionDeployments: e.target.value as Settings['productionDeployments'],
                })
              }
            >
              {PRODUCTION_DEPLOYMENT_MODES.map((mode) => (
                <option
                  key={mode}
                  value={mode}
                  // A team the organization restricted to `deny` cannot loosen it.
                  disabled={data.boundary.productionDeployments === 'deny' && mode !== 'deny'}
                >
                  {mode === 'review' ? 'Require review' : 'Blocked'}
                </option>
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
          <button type="button" onClick={preview}>
            Preview impact
          </button>{' '}
          <button>Save policy</button>
        </fieldset>
      </form>

      {impact && <ImpactPreview impact={impact} />}

      <p>
        Hard limits · {HARD_LIMITS.gpusPerTeam} GPUs per team · {HARD_LIMITS.vcpuPerInstance} vCPU
        per instance · ${HARD_LIMITS.monthlySpendUsd.toLocaleString('en-US')} monthly · production
        deployments and deletions require review.
      </p>

      {lastChange && (
        <details>
          <summary>Previous and saved settings</summary>
          <pre>{JSON.stringify(lastChange.details, null, 2)}</pre>
        </details>
      )}

      <PolicyHistory data={data} action={action} busy={busy} />
    </section>
  );
}
