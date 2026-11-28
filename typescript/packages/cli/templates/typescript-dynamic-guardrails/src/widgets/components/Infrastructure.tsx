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

import { SIMULATED_GPU_UTILIZATION } from '../../modules/cloudops/domain/limits.js';
import { money } from '../lib/format.js';
import type { Snapshot } from '../lib/types.js';

type Resource = Snapshot['resources'][number];

function FirewallRules({ rules }: { rules: Resource['firewall'] }) {
  if (!rules.length) return <p>No custom rules.</p>;
  return (
    <>
      {rules.map((f) => (
        <p key={f.source + f.port + f.protocol}>
          {f.action} {f.source} · {f.protocol}/{f.port}
        </p>
      ))}
    </>
  );
}

/** Every resource the team owns, with sizing, cost and firewall rules. */
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
            {r.gpu ? SIMULATED_GPU_UTILIZATION : 0}% GPU utilization
          </p>
          <h3>Firewall</h3>
          <FirewallRules rules={r.firewall} />
        </details>
      ))}
      {!data.resources.length && <p>No provisioned resources.</p>}
    </section>
  );
}
