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

import { chainIdentity, type GuardrailsConfig, type Policy } from '@nitrostack/core/guardrails';
import { runtimeConfig } from '../../../runtime/config.js';
import { apiKeyResolver, bearerToken, jwtResolver, resolveToken, type TokenResolver } from '../../../runtime/identity.js';
import { demoIdentities, isAdmin } from '../state/identities.js';

/**
 * App-level guardrails. Every MCP tool call first passes this gate:
 *
 *   1. `identityResolver` turns the bearer token into a `VerifiedIdentity` (or rejects it).
 *   2. The tool's `@Guardrail(...)` names one of the two access policies below.
 *   3. `contextResolver` supplies the `authorized` fact the policy evaluates.
 *
 * Messaging actions are then evaluated again against the team's own mutation policy
 * (see `mutation.policy.ts` and `guarded-operation.ts`).
 */

/** Any authenticated team member. Used by reads and requested messaging actions. */
export const MEMBER_ACCESS = { policy: 'brandvoice-access', facts: ['authorized'] };

/** Team administrators only. Used by policy edits, approvals and resets. */
export const ADMIN_ACCESS = { policy: 'brandvoice-admin', facts: ['authorized'] };

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

/**
 * Token resolvers in GUARDRAILS_IDENTITY order. The demo profile accepts the printed
 * `demo-<team>-<role>` tokens; add OIDC_ISSUER or GUARDRAILS_API_KEYS and real callers work
 * alongside them. The production profile refuses demo tokens unless explicitly allowed.
 */
let resolvers: TokenResolver[] | undefined;
/** Built on first use, so configuration errors surface in the startup handler. */
export function tokenResolvers(): TokenResolver[] {
  return (resolvers ??= runtimeConfig().identity.map((kind) => {
    if (kind === 'jwt') return jwtResolver(runtimeConfig());
    if (kind === 'api-key') return apiKeyResolver(runtimeConfig());
    return (token: string) => demoIdentities.get(token) ?? null;
  }));
}

/** Resolves an `Authorization: Bearer` header value (MCP calls and the REST control plane). */
export const resolveBearer = (header: unknown) => resolveToken(tokenResolvers())(bearerToken(header));

export const guardrails: GuardrailsConfig = {
  mode: 'enforce',
  requireDeclaration: true,

  identityResolver: chainIdentity([(ctx) => resolveBearer(ctx.metadata?.authorization)]),

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
