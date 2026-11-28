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
import { AuditLog } from './AuditLog.js';
import { GpuWalkthrough, type GpuWalkthroughProps } from './GpuWalkthrough.js';

type Props = { data: Snapshot } & Omit<GpuWalkthroughProps, 'immediateGpus'>;

function metrics(data: Snapshot) {
  const r = data.resources;
  return [
    ['Instances', r.filter((x) => x.type === 'instance').reduce((n, x) => n + x.count, 0)],
    ['Deployments', r.filter((x) => x.type === 'deployment' && x.status === 'running').length],
    ['vCPU', r.reduce((n, x) => n + x.cpu * x.count, 0)],
    ['RAM (GB)', r.reduce((n, x) => n + x.memory * x.count, 0)],
    ['GPU utilization', r.some((x) => x.gpu) ? SIMULATED_GPU_UTILIZATION + '%' : '0%'],
    ['Monthly spend', money(data.monthly)],
    ['Pending review', data.approvals.filter((a) => a.status === 'pending').length],
  ] as const;
}

/** Team metrics, the guided GPU walkthrough (ML team only) and recent activity. */
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
      {data.team === 'ml' && <GpuWalkthrough immediateGpus={data.settings.gpu} {...walkthrough} />}
      <AuditLog data={data} compact />
    </>
  );
}
