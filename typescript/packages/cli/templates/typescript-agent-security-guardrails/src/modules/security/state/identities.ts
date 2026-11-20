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
import { teamIds } from './seeds.js';

const ROLES = ['agent', 'admin'] as const;

/**
 * Loopback demo credentials, keyed by bearer token: `demo-<team>-<role>`.
 *
 * Replace this map with your identity provider (OIDC, API keys, mTLS…) before exposing the
 * server beyond 127.0.0.1. The rest of the template only depends on `VerifiedIdentity`.
 */
export const demoIdentities = new Map<string, VerifiedIdentity>(
  teamIds.flatMap((team) =>
    ROLES.map((role): [string, VerifiedIdentity] => [
      `demo-${team}-${role}`,
      {
        tenantId: team,
        principalId: `${team}-${role}`,
        scopes: [role],
        source: 'loopback-demo',
      },
    ])
  )
);

export const isAdmin = (identity: VerifiedIdentity) => identity.scopes.includes('admin');

/** Finds the identity that submitted a request, so an approved replay runs as that caller. */
export function findTeamMember(teamId: string, principalId: string) {
  return [...demoIdentities.values()].find(
    (identity) => identity.tenantId === teamId && identity.principalId === principalId
  );
}
