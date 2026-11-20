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
import { totalReach } from '../domain/simulation.js';
import { isAdmin } from './identities.js';
import { teamBoundary, type TeamBoundary } from './seeds.js';
import type { Approval, TeamState } from './team-state.js';

/**
 * What a caller sees of their team: `get_brandvoice_snapshot` returns it and the dashboard
 * widget renders it. Internal review data (`factsKey`, recorded decision facts) is never
 * exposed.
 */
export type BrandVoiceSnapshot = Omit<TeamState, 'approvals' | 'decisions'> & {
  team: string;
  actor: string;
  canEdit: boolean;
  permittedChannels: string[];
  boundary: TeamBoundary;
  /** People reached by the team's live messages. */
  reach: number;
  /** Set when the active policy was changed outside this dashboard (API, webhook, CLI, database). */
  externalChange?: { by: string; source: string; at: string };
  approvals: Array<Omit<Approval, 'factsKey'>>;
};

export function toSnapshot(state: TeamState, identity: VerifiedIdentity): BrandVoiceSnapshot {
  // Recorded decision facts are server-only; they feed `simulate_policy`.
  const { decisions: _decisions, ...visible } = state;
  const boundary = teamBoundary(identity.tenantId);
  return {
    ...visible,
    team: identity.tenantId,
    actor: identity.principalId,
    canEdit: isAdmin(identity),
    permittedChannels: boundary.channels,
    boundary,
    reach: totalReach(state.resources),
    externalChange: ['mcp', 'seed'].includes(state.policyUpdate.source) ? undefined : state.policyUpdate,
    approvals: state.approvals.map(({ factsKey: _internal, ...approval }) => approval),
  };
}
