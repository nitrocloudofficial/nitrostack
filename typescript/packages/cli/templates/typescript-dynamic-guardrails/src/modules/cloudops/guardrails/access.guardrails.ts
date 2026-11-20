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

import type { GuardrailsConfig, Policy } from '@nitrostack/core/guardrails';
import { demoIdentities, isAdmin } from '../state/identities.js';

/**
 * App-level guardrails. Every MCP tool call first passes this gate:
 *
 *   1. `identityResolver` turns the bearer token into a `VerifiedIdentity` (or rejects it).
 *   2. The tool's `@Guardrail(...)` names one of the two access policies below.
 *   3. `contextResolver` supplies the `authorized` fact the policy evaluates.
 *
 * Infrastructure changes are then evaluated again against the team's own mutation policy
 * (see `mutation.policy.ts` and `guarded-operation.ts`).
 */

/** Any authenticated team member. Used by reads and requested infrastructure changes. */
export const MEMBER_ACCESS = { policy: 'cloudops-access', facts: ['authorized'] };

/** Team administrators only. Used by policy edits, approvals and resets. */
export const ADMIN_ACCESS = { policy: 'cloudops-admin', facts: ['authorized'] };

const ACCESS_POLICY_IDS = [MEMBER_ACCESS.policy, ADMIN_ACCESS.policy];

function accessPolicy(tenantId: string, id: string): Policy {
  return {
    schemaVersion: 1,
    tenantId,
    id,
    version: 1,
    defaultEffect: 'deny',
    rules: [
      {
        id: 'team-member',
        effect: 'allow',
        all: [{ field: 'authorized', op: 'eq', value: true }],
      },
    ],
  };
}

/** Reads `Authorization: Bearer <token>` and looks the token up in the demo identities. */
function bearerToken(header: unknown) {
  if (typeof header !== 'string') return undefined;
  return /^Bearer (\S+)$/i.exec(header)?.[1];
}

export const guardrails: GuardrailsConfig = {
  mode: 'enforce',
  requireDeclaration: true,

  identityResolver: (ctx) => demoIdentities.get(bearerToken(ctx.metadata?.authorization) ?? '') ?? null,

  provider: {
    async getActive(tenantId, id) {
      if (!ACCESS_POLICY_IDS.includes(id)) throw new Error('Unknown access policy');
      return accessPolicy(tenantId, id);
    },
  },

  contextResolver: ({ identity, tool }) => {
    const declared = tool.guardrail;
    const requiresAdmin = !!declared && 'policy' in declared && declared.policy === ADMIN_ACCESS.policy;
    return { authorized: !requiresAdmin || isAdmin(identity) };
  },
};
