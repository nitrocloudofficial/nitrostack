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

import { assertValidPolicy, type Policy } from '@nitrostack/core/guardrails';
import type { Settings } from '../domain/types.js';
import { teamBoundary } from '../state/seeds.js';
import type { TeamState } from '../state/team-state.js';
import { buildMutationPolicy, MUTATION_FACTS, MUTATION_POLICY_ID } from './mutation.policy.js';

/**
 * Rejects settings that widen what the organization granted the team in
 * `seeds/teams.json`. Tightening is always allowed.
 */
export function assertWithinBoundary(teamId: string, settings: Settings) {
  const boundary = teamBoundary(teamId);
  if (settings.regions.some((r) => !boundary.regions.includes(r))) {
    throw new Error('Region outside team boundary');
  }
  if (settings.environments.some((e) => !boundary.environments.includes(e))) {
    throw new Error('Environment outside team boundary');
  }
  if (boundary.productionDeployments === 'deny' && settings.productionDeployments !== 'deny') {
    throw new Error('Production deployments outside team boundary');
  }
}

/**
 * Checks proposed settings and compiles the mutation policy they would produce, without
 * changing `state`. Used by every path that saves or previews team settings.
 */
export function compileTeamPolicy(teamId: string, state: TeamState, settings: Settings): Policy {
  assertWithinBoundary(teamId, settings);
  const policy = buildMutationPolicy(teamId, { ...state, settings });
  assertValidPolicy(policy, teamId, MUTATION_POLICY_ID, MUTATION_FACTS);
  return policy;
}
