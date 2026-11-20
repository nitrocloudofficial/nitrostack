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

import { dateTime, newestFirst } from '../lib/format.js';
import type { Action, Snapshot } from '../lib/types.js';

interface Props {
  data: Snapshot;
  action: Action;
  busy: boolean;
}

const KIND_LABELS = {
  seed: 'Seed configuration',
  update: 'Saved',
  rollback: 'Restored',
  reset: 'Reset',
  policy: 'Raw policy',
} as const;

/**
 * Saved policy revisions. Restoring one saves its settings as a new revision, so the
 * history only moves forward and every change stays in the audit log.
 */
export function PolicyHistory({ data, action, busy }: Props) {
  return (
    <details>
      <summary>Version history ({data.versions.length})</summary>
      {newestFirst(data.versions).map((v) => (
        <p key={v.revision}>
          Version {v.revision} · {KIND_LABELS[v.kind]}
          {v.restoredFrom !== undefined && ' version ' + v.restoredFrom} · {v.actor} via {v.source} ·{' '}
          {dateTime(v.time)}{' '}
          {v.revision === data.activeVersion ? (
            '· current'
          ) : (
            data.canEdit && (
              <button
                disabled={busy}
                aria-label={'Restore revision ' + v.revision}
                onClick={() => action('rollback_policy', { revision: data.revision, target: v.revision })}
              >
                Restore
              </button>
            )
          )}
        </p>
      ))}
    </details>
  );
}
