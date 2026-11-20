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

import { dateTime } from '../lib/format.js';
import type { PolicyImpact } from '../lib/types.js';

const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/**
 * Result of `simulate_policy`: how the unsaved settings would change the outcome of the
 * team's recent requests.
 */
export function ImpactPreview({ impact }: { impact: PolicyImpact }) {
  const transitions = Object.entries(impact.summary);

  return (
    <article aria-label="Policy impact">
      <h3>Impact preview</h3>
      <p>
        {impact.changed.length
          ? plural(impact.changed.length, 'recent request') +
            ' of ' +
            impact.sampled +
            ' would get a different decision.'
          : 'No change for the ' + plural(impact.sampled, 'most recent request') + '.'}
        {impact.pendingApprovals > 0 &&
          ' Saving invalidates ' + plural(impact.pendingApprovals, 'pending approval') + '.'}
      </p>
      {transitions.map(([transition, count]) => (
        <p key={transition}>
          {count} × {transition}
        </p>
      ))}
      {impact.changed.length > 0 && (
        <details>
          <summary>Affected requests</summary>
          {impact.changed.map((c) => (
            <p key={c.attempt}>
              {dateTime(c.time)} · {c.actor} · {c.tool} · {c.current.decision} ({c.current.reason})
              → {c.draft.decision} ({c.draft.reason})
            </p>
          ))}
        </details>
      )}
    </article>
  );
}
