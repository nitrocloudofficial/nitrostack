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

import type { Snapshot } from '../lib/types.js';
import { AuditLog } from './AuditLog.js';
import { OutboundWalkthrough, type OutboundWalkthroughProps } from './OutboundWalkthrough.js';

type Props = { data: Snapshot } & Omit<OutboundWalkthroughProps, 'limit'>;

function metrics(data: Snapshot) {
  const r = data.resources;
  return [
    ['Workspaces', r.workspaces.length], ['Active jobs', r.jobs.length],
    ['Publications', r.artifacts.length],
    ['Pending review', data.approvals.filter((a) => a.status === 'pending').length],
  ] as const;
}

/** Team metrics, the guided outbound job walkthrough (research team only) and recent activity. */
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
      {data.team === 'research' && <OutboundWalkthrough limit={data.settings.outboundMb} {...walkthrough} />}
      <AuditLog data={data} compact />
    </>
  );
}
