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

import { count } from '../lib/format.js';
import type { Snapshot } from '../lib/types.js';
import { AuditLog } from './AuditLog.js';
import { VoiceWalkthrough, type VoiceWalkthroughProps } from './VoiceWalkthrough.js';

type Props = { data: Snapshot } & Omit<VoiceWalkthroughProps, 'slangLimit'>;

function metrics(data: Snapshot) {
  const r = data.resources;
  const loudest = r.reduce((n, x) => Math.max(n, x.slang), 0);
  return [
    ['Replies', r.filter((x) => x.type === 'reply').length],
    ['Posts', r.filter((x) => x.type === 'post').length],
    ['Campaigns', r.filter((x) => x.type === 'campaign').length],
    ['Highest slang', loudest + ' / 10'],
    ['Slang without review', data.settings.slang],
    ['Total reach', count(data.reach)],
    ['Pending review', data.approvals.filter((a) => a.status === 'pending').length],
  ] as const;
}

/** Team metrics, the guided voice walkthrough (Social team only) and recent activity. */
export function Overview({ data, ...walkthrough }: Props) {
  return (
    <>
      <div className="metrics">
        {metrics(data).map(([label, value]) => (
          <article key={label}>
            <small>{label}</small>
            <b>{value}</b>
          </article>
        ))}
      </div>
      {data.team === 'social' && <VoiceWalkthrough slangLimit={data.settings.slang} {...walkthrough} />}
      <AuditLog data={data} compact />
    </>
  );
}
