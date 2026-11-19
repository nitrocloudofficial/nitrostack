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
import type { Team } from '../../modules/cloudops/store.js';
import type { Settings } from '../../modules/cloudops/domain.js';

export type Snapshot = Omit<Team, 'approvals'> & {
  team: string;
  actor: string;
  canEdit: boolean;
  permittedRegions: string[];
  monthly: number;
  approvals: Array<Omit<Team['approvals'][number], 'factsKey'>>;
};
export const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
export type Action = (tool: string, args: Record<string, unknown>) => Promise<void>;
export function Policies({
  data,
  action,
  busy,
}: {
  data: Snapshot;
  action: Action;
  busy: boolean;
}) {
  const [settings, set] = useState<Settings>({ ...data.settings });
  const values = [
    ['gpu', 'Immediate GPUs', 0, 16],
    ['cpu', 'Immediate vCPU per instance', 1, 32],
    ['budget', 'Monthly budget (USD)', 0, 5000],
    ['deployment', 'Deployment replicas', 1, 1024],
  ] as const;
  const changed = data.history
    .slice()
    .reverse()
    .find((e) => e.event === 'UPDATED');
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action('update_policy', { revision: data.revision, settings });
  }
  return (
    <section>
      <h2>Team policies</h2>
      <p>
        Revision {data.revision} ·{' '}
        {changed
          ? 'Saved by ' + changed.actor + ' at ' + new Date(changed.time).toLocaleString()
          : 'Seed configuration'}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={!data.canEdit || busy}>
          <legend>Immediate operating limits</legend>
          <div className="fields">
            {values.map(([key, title, min, max]) => (
              <label key={key}>
                {title}
                <input
                  required
                  type="number"
                  min={min}
                  max={max}
                  value={settings[key]}
                  onChange={(e) => set({ ...settings, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <label>
            Permitted regions
            <select
              multiple
              value={settings.regions}
              onChange={(e) =>
                set({
                  ...settings,
                  regions: Array.from(
                    e.target.selectedOptions,
                    (o) => o.value as Settings['regions'][number]
                  ),
                })
              }
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
              onChange={(e) =>
                set({
                  ...settings,
                  machines: Array.from(
                    e.target.selectedOptions,
                    (o) => o.value as Settings['machines'][number]
                  ),
                })
              }
            >
              {['general', 'accelerated'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.reviewDeletion}
              onChange={(e) => set({ ...settings, reviewDeletion: e.target.checked })}
            />{' '}
            Review every deletion
          </label>
          <button>Save policy</button>
        </fieldset>
      </form>
      <p>
        Hard limits · 16 GPUs per team · 32 vCPU per instance · $5,000 monthly · production deletion
        requires review.
      </p>
      {changed && (
        <details>
          <summary>Previous and saved settings</summary>
          <pre>{JSON.stringify(changed.details, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
export function Audit({ data, compact = false }: { data: Snapshot; compact?: boolean }) {
  const [query, setQuery] = useState(''),
    [decision, setDecision] = useState(''),
    [since, setSince] = useState('');
  const rows = data.history
    .slice()
    .reverse()
    .filter(
      (e) =>
        (!decision || e.event === decision) &&
        (!since || Date.parse(e.time) >= Date.parse(since)) &&
        [e.tool, e.resource, JSON.stringify(e.details)]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())
    );
  return (
    <section>
      <h2>{compact ? 'Recent agent activity' : 'Audit log'}</h2>
      {!compact && (
        <div className="fields">
          <label>
            Tool or resource
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label>
            Decision or event
            <select value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="">All events</option>
              {[...new Set(data.history.map((e) => e.event))].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <label>
            Since
            <input type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} />
          </label>
        </div>
      )}
      {(compact ? rows.slice(0, 5) : rows).map((e, i) => (
        <details key={e.time + i}>
          <summary>
            <strong>{e.event}</strong> {e.tool} · {e.reason}
          </summary>
          <p>
            {e.actor} · {new Date(e.time).toLocaleString()} · policy v{e.version}
          </p>
          <small>{e.attempt}</small>
          <pre>{JSON.stringify(e.details, null, 2)}</pre>
        </details>
      ))}
      {!rows.length && <p>No matching activity.</p>}
    </section>
  );
}
export function Infrastructure({ data }: { data: Snapshot }) {
  return (
    <section>
      <h2>Infrastructure</h2>
      {data.resources.map((r) => (
        <details key={r.id}>
          <summary>
            <strong>{r.name}</strong> {r.region} · {r.status} · {money(r.count * r.unitCost)}/mo
          </summary>
          <p>
            {r.id} · {r.type} · {r.environment} · {r.detail}
          </p>
          <p>
            {r.count} × {r.machine} · {r.cpu} vCPU · {r.memory} GB RAM · {r.gpu} GPUs ·{' '}
            {r.gpu ? 65 : 0}% GPU utilization
          </p>
          <h3>Firewall</h3>
          {r.firewall.length ? (
            r.firewall.map((f) => (
              <p key={f.source + f.port + f.protocol}>
                {f.action} {f.source} · {f.protocol}/{f.port}
              </p>
            ))
          ) : (
            <p>No custom rules.</p>
          )}
        </details>
      ))}
      {!data.resources.length && <p>No provisioned resources.</p>}
    </section>
  );
}
export function Approvals({
  data,
  action,
  busy,
}: {
  data: Snapshot;
  action: Action;
  busy: boolean;
}) {
  return (
    <section>
      <h2>Approval requests</h2>
      {data.approvals
        .slice()
        .reverse()
        .map((a) => (
          <article key={a.id}>
            <strong>{a.status}</strong>
            <h3>{a.command.tool}</h3>
            <p>
              {a.actor} · {data.name} · {new Date(a.time).toLocaleString()}
            </p>
            <p>
              {a.reason} · policy v{a.version} · projected {money(a.projectedCost)}/mo
            </p>
            <details>
              <summary>Request and decision history</summary>
              <code>{a.id}</code>
              <pre>{JSON.stringify(a.command.args, null, 2)}</pre>
              {data.history
                .filter((e) => e.attempt === a.id)
                .map((e, i) => (
                  <p key={i}>
                    {e.event} · {e.actor} · {e.reason}
                  </p>
                ))}
            </details>
            {a.status === 'pending' &&
              data.canEdit &&
              ['approve', 'reject'].map((choice) => (
                <button
                  disabled={busy}
                  key={choice}
                  onClick={() => action('review_approval', { id: a.id, action: choice })}
                >
                  {choice === 'approve' ? 'Approve' : 'Reject'}
                </button>
              ))}
          </article>
        ))}
      {!data.approvals.length && <p>No requests awaiting review.</p>}
    </section>
  );
}
