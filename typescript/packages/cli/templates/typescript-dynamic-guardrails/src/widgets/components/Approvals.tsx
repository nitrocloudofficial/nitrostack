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

import { dateTime, money, newestFirst } from '../lib/format.js';
import type { Action, Snapshot } from '../lib/types.js';

interface Props {
  data: Snapshot;
  action: Action;
  busy: boolean;
}

const REVIEW_CHOICES = [
  ['approve', 'Approve'],
  ['reject', 'Reject'],
] as const;

/**
 * Requests held for human review. Approving replays the original request against the
 * current policy; it does not bypass it.
 */
export function Approvals({ data, action, busy }: Props) {
  return (
    <section>
      <h2>Approval requests</h2>
      {newestFirst(data.approvals).map((a) => (
        <article key={a.id}>
          <strong>{a.status}</strong>
          <h3>{a.command.tool}</h3>
          <p>
            {a.actor} · {data.name} · {dateTime(a.time)}
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
            REVIEW_CHOICES.map(([choice, label]) => (
              <button
                disabled={busy}
                key={choice}
                onClick={() => action('review_approval', { id: a.id, action: choice })}
              >
                {label}
              </button>
            ))}
        </article>
      ))}
      {!data.approvals.length && <p>No requests awaiting review.</p>}
    </section>
  );
}
