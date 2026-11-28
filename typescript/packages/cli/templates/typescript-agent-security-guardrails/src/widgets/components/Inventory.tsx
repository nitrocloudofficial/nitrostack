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
export function Inventory({ data }: { data: Snapshot }) {
  return (
    <section>
      <h2>Workspaces</h2>
      {data.resources.workspaces.map((ws) => (
        <article key={ws.id}>
          <h3>{ws.name}</h3>
          <p>
            {ws.id} · {ws.environment} · {ws.access}
            {ws.protected && ' · protected'}
          </p>
          <ul>
            {data.resources.jobs
              .filter((job) => job.workspaceId === ws.id)
              .map((job) => (
                <li key={job.id}>
                  {job.id} · {job.outboundMb} MB to {job.destination} · {job.durationMinutes} min
                </li>
              ))}
            {data.resources.artifacts
              .filter((a) => a.workspaceId === ws.id)
              .map((a) => (
                <li key={a.id}>
                  {a.name} · {a.destination}
                </li>
              ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
