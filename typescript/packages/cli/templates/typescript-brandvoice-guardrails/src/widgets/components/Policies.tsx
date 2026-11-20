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
  AUDIENCES,
  CHANNELS,
  HARD_LIMITS,
  OFFICIAL_POST_MODES,
  VOICES,
} from '../../modules/brandvoice/domain/limits.js';
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
  ['slang', 'Slang review above (0–10)', 0, HARD_LIMITS.slangScale],
  ['reach', 'Total reach without review', 0, HARD_LIMITS.totalReach],
  ['campaign', 'Campaign recipients without review', 1, HARD_LIMITS.campaignRecipients],
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
            Permitted channels
            <select
              multiple
              value={settings.channels}
              onChange={(e) => update({ channels: selected<Settings['channels'][number]>(e.target) })}
            >
              {CHANNELS.filter((c) => data.permittedChannels.includes(c)).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Permitted voices
            <select
              multiple
              value={settings.voices}
              onChange={(e) => update({ voices: selected<Settings['voices'][number]>(e.target) })}
            >
              {VOICES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Permitted audiences
            <select
              multiple
              value={settings.audiences}
              onChange={(e) => update({ audiences: selected<Settings['audiences'][number]>(e.target) })}
            >
              {AUDIENCES.filter((a) => data.boundary.audiences.includes(a)).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Official statements
            <select
              value={settings.officialPosts}
              onChange={(e) =>
                update({ officialPosts: e.target.value as Settings['officialPosts'] })
              }
            >
              {OFFICIAL_POST_MODES.map((mode) => (
                <option
                  key={mode}
                  value={mode}
                  // A team the organization restricted to `deny` cannot loosen it.
                  disabled={data.boundary.officialPosts === 'deny' && mode !== 'deny'}
                >
                  {mode === 'review' ? 'Require review' : 'Blocked'}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.reviewRetraction}
              onChange={(e) => update({ reviewRetraction: e.target.checked })}
            />{' '}
            Review every retraction
          </label>
          <button type="button" onClick={preview}>
            Preview impact
          </button>{' '}
          <button>Save policy</button>
        </fieldset>
      </form>

      {impact && <ImpactPreview impact={impact} />}

      <p>
        Hard limits · {HARD_LIMITS.totalReach.toLocaleString('en-US')} total reach ·{' '}
        {HARD_LIMITS.campaignRecipients.toLocaleString('en-US')} recipients per campaign · profanity
        and refund or legal promises are always blocked · official retractions require review.
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
