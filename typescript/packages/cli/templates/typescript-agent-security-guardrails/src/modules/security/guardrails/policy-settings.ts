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
import { buildMutationPolicy, MUTATION_FACTS, MUTATION_POLICY_ID, withFloor } from './mutation.policy.js';

import { assertSecurityBoundary } from '../domain/security-policy.js';
export const assertWithinBoundary = (team: string, settings: Settings) =>
  assertSecurityBoundary(settings, teamBoundary(team));

/**
 * Checks proposed settings and compiles the effective mutation policy (floor + stored rules)
 * they would produce. Used by every path that saves or previews team settings.
 */
export function compileTeamPolicy(teamId: string, settings: Settings, version = 1): Policy {
  assertWithinBoundary(teamId, settings);
  const policy = withFloor(buildMutationPolicy(teamId, settings, version));
  assertValidPolicy(policy, teamId, MUTATION_POLICY_ID, MUTATION_FACTS);
  return policy;
}
