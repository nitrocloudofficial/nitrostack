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

import type { Policy } from '@nitrostack/core/guardrails';
import { teamBoundary } from '../state/seeds.js';
import { withSecurityFloor } from '../domain/security-policy.js';
export { buildSecurityPolicy as buildMutationPolicy, SECURITY_POLICY_ID as MUTATION_POLICY_ID,
  SECURITY_FACTS as MUTATION_FACTS } from '../domain/security-policy.js';
export const withFloor = (policy: Policy) => withSecurityFloor(policy, teamBoundary(policy.tenantId));
