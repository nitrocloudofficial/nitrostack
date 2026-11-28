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
import { sha256, type RuntimeConfig } from './config.js';

/**
 * Identity resolvers, tried in the order of GUARDRAILS_IDENTITY (default `demo` first).
 * Each returns null for a token it does not recognise, so demo tokens and real
 * identities work side by side. `source` is recorded in every audit entry.
 *
 * Roles map to scopes: `admin` may change policies and review approvals, `agent` may not.
 */
type Jose = {
  createRemoteJWKSet(url: URL): unknown;
  jwtVerify(
    token: string,
    keys: unknown,
    options: { issuer: string; audience?: string }
  ): Promise<{ payload: Record<string, unknown> }>;
};

export type TokenResolver = (token: string) => Promise<VerifiedIdentity | null> | VerifiedIdentity | null;

export function bearerToken(header: unknown) {
  if (typeof header !== 'string') return undefined;
  return /^Bearer (\S+)$/i.exec(header)?.[1];
}

export function apiKeyResolver(config: RuntimeConfig): TokenResolver {
  return (token) => {
    const match = config.apiKeys.get(sha256(token));
    return match
      ? { tenantId: match.tenantId, principalId: match.principalId, scopes: [match.role], source: 'api-key' }
      : null;
  };
}

export function jwtResolver(config: RuntimeConfig): TokenResolver {
  const settings = config.jwt!;
  let verify: ((token: string) => Promise<Record<string, unknown>>) | undefined;

  return async (token) => {
    if (token.split('.').length !== 3) return null;
    if (!verify) {
      // Loaded by name only when OIDC is configured, so the demo never touches it.
      const specifier = 'jose';
      const { createRemoteJWKSet, jwtVerify } = (await import(specifier)) as Jose;
      const jwks = createRemoteJWKSet(
        new URL(settings.jwksUrl ?? settings.issuer.replace(/\/$/, '') + '/.well-known/jwks.json')
      );
      verify = async (value) =>
        (await jwtVerify(value, jwks, { issuer: settings.issuer, audience: settings.audience })).payload;
    }
    const claims = await verify(token);
    const tenantId = claims[settings.tenantClaim];
    if (typeof claims.sub !== 'string' || typeof tenantId !== 'string') return null;
    const granted = [
      ...(typeof claims.scope === 'string' ? claims.scope.split(' ') : []),
      ...(Array.isArray(claims.permissions) ? claims.permissions.map(String) : []),
    ];
    return {
      tenantId,
      principalId: claims.sub,
      scopes: [granted.includes(settings.adminScope) ? 'admin' : 'agent'],
      source: 'oidc',
    };
  };
}

/** First resolver that recognises the token wins. Errors count as "not recognised". */
export function resolveToken(resolvers: TokenResolver[]) {
  return async (token: string | undefined): Promise<VerifiedIdentity | null> => {
    if (!token) return null;
    for (const resolve of resolvers) {
      try {
        const identity = await resolve(token);
        if (identity?.principalId && identity.tenantId) return identity;
      } catch {
        // try the next resolver
      }
    }
    return null;
  };
}
