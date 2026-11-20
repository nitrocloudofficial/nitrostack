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

import type { VerifiedIdentity } from '@nitrostack/core/guardrails';
import { monthlyCost } from '../domain/simulation.js';
import { isAdmin } from './identities.js';
import { regionBoundary } from './seeds.js';
import type { Approval, TeamState } from './team-state.js';

/**
 * What a caller sees of their team: `get_cloudops_snapshot` returns it and the dashboard
 * widget renders it. Internal review data (`factsKey`) is never exposed.
 */
export type CloudOpsSnapshot = Omit<TeamState, 'approvals'> & {
  team: string;
  actor: string;
  canEdit: boolean;
  permittedRegions: string[];
  monthly: number;
  approvals: Array<Omit<Approval, 'factsKey'>>;
};

export function toSnapshot(state: TeamState, identity: VerifiedIdentity): CloudOpsSnapshot {
  return {
    ...state,
    team: identity.tenantId,
    actor: identity.principalId,
    canEdit: isAdmin(identity),
    permittedRegions: regionBoundary(identity.tenantId),
    monthly: monthlyCost(state.resources),
    approvals: state.approvals.map(({ factsKey: _internal, ...approval }) => approval),
  };
}
