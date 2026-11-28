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

import {
  Injectable,
  ToolDecorator as Tool,
  Widget,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { Guardrail } from '@nitrostack/core/guardrails';
import { SIMULATED_GPU_UTILIZATION } from '../domain/limits.js';
import { noInput, resourceFilterInput } from '../domain/schemas.js';
import { monthlyCost } from '../domain/simulation.js';
import type { Resource } from '../domain/types.js';
import { MEMBER_ACCESS } from '../guardrails/access.guardrails.js';
import { toSnapshot } from '../state/snapshot.js';
import { readTeamState } from '../state/team-state.js';
import { caller } from './caller.js';

type ResourceFilter = z.infer<typeof resourceFilterInput>;

const READ_ONLY = { readOnlyHint: true };

/** Keeps every resource, or only the one named by `resourceId`. */
const matching = (filter: ResourceFilter) => (r: Resource) =>
  !filter.resourceId || r.id === filter.resourceId;

/** Read-only views of the caller's team, including the dashboard widget. */
@Injectable()
export class InsightsTools {
  @Tool({
    name: 'get_cloud_cost',
    description: 'Read monthly simulated USD costs and remaining team budget.',
    inputSchema: resourceFilterInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  getCloudCost(args: ResourceFilter, ctx: ExecutionContext) {
    return readTeamState(caller(ctx).tenantId, (state) => {
      const resources = state.resources.filter(matching(args));
      return {
        items: resources.map((r) => ({ id: r.id, monthly: r.count * r.unitCost })),
        total: monthlyCost(resources),
        remaining: state.settings.budget - monthlyCost(state.resources),
      };
    });
  }

  @Tool({
    name: 'get_resource_usage',
    description: 'Inspect the allocation and utilization of your resources.',
    inputSchema: resourceFilterInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  getResourceUsage(args: ResourceFilter, ctx: ExecutionContext) {
    return readTeamState(caller(ctx).tenantId, (state) => ({
      resources: state.resources
        .filter(matching(args))
        .map((r) => ({ ...r, gpuUtilization: r.gpu ? SIMULATED_GPU_UTILIZATION : 0 })),
    }));
  }

  @Tool({
    name: 'show_cloudops_dashboard',
    description: 'Open the CloudOps Guardian simulator dashboard.',
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Widget({ route: 'cloudops-dashboard', prefersBorder: true })
  @Guardrail(MEMBER_ACCESS)
  showDashboard(_args: unknown, ctx: ExecutionContext) {
    return this.getSnapshot(_args, ctx);
  }

  @Tool({
    name: 'get_cloudops_snapshot',
    description: 'Read current team policy, resources, approvals and audit history.',
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  getSnapshot(_args: unknown, ctx: ExecutionContext) {
    const identity = caller(ctx);
    return readTeamState(identity.tenantId, (state) => toSnapshot(state, identity));
  }
}
