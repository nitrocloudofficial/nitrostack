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

import { useState } from 'react';
import { dateTime, newestFirst } from '../lib/format.js';
import type { Snapshot } from '../lib/types.js';

interface Props {
  data: Snapshot;
  /** Shows the five latest events without filters (used on the Overview tab). */
  compact?: boolean;
}

const COMPACT_ROWS = 5;

/** Team audit log, newest first, filterable by text, event and time. */
export function AuditLog({ data, compact = false }: Props) {
  const [query, setQuery] = useState('');
  const [event, setEvent] = useState('');
  const [since, setSince] = useState('');

  const rows = newestFirst(data.history).filter(
    (e) =>
      (!event || e.event === event) &&
      (!since || Date.parse(e.time) >= Date.parse(since)) &&
      [e.tool, e.resource, JSON.stringify(e.details)]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  const eventTypes = [...new Set(data.history.map((e) => e.event))];

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
            <select value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="">All events</option>
              {eventTypes.map((e) => (
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
      {(compact ? rows.slice(0, COMPACT_ROWS) : rows).map((e, i) => (
        <details key={e.time + i}>
          <summary>
            <strong>{e.event}</strong> {e.tool} · {e.reason}
          </summary>
          <p>
            {e.actor} · {dateTime(e.time)} · policy v{e.version}
          </p>
          <small>{e.attempt}</small>
          <pre>{JSON.stringify(e.details, null, 2)}</pre>
        </details>
      ))}
      {!rows.length && <p>No matching activity.</p>}
    </section>
  );
}
