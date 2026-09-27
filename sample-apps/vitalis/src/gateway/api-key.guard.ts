/**
 * ApiKeyGuard — authenticates MCP requests via API key metadata or Bearer JWT.
 *
 * The NitroStack tool execution context receives MCP `_meta` values, while some
 * HTTP adapters also expose request headers. We support both forms and never
 * keep credentials in source code. Configure identities through environment
 * variables (API_KEY_CLINICIAN, API_KEY_READONLY, API_KEY_ADMIN).
 */
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { verifyJwt } from './jwt.utils.js';
import { getRequestHeaders } from './request-context.js';

export interface AuthContext {
  subject: string;
  scopes: string[];
  /** Only the explicitly configured admin API-key identity may use wildcard scope. */
  isAdmin?: boolean;
  authMethod?: 'api_key' | 'jwt' | 'anonymous';
}

type CredentialDefinition = {
  envKey: keyof typeof env;
  subject: string;
  scopes: string[];
  isAdmin?: boolean;
};

const CREDENTIALS: CredentialDefinition[] = [
  {
    envKey: 'API_KEY_CLINICIAN',
    subject: 'clinician_demo',
    scopes: [
      'triage:read',
      'drugs:read',
      'dx:read',
      'research:read',
      'fhir:read',
      'care:read',
      'care:write',
    ],
  },
  {
    envKey: 'API_KEY_READONLY',
    subject: 'readonly_demo',
    scopes: ['triage:read', 'drugs:read', 'dx:read', 'research:read', 'fhir:read'],
  },
  {
    envKey: 'API_KEY_ADMIN',
    subject: 'admin_demo',
    scopes: ['*', 'admin:audit'],
    isAdmin: true,
  },
];

function getString(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function extractCredential(context: ExecutionContext): string | undefined {
  const contextAny = context as any;
  const headers = contextAny.headers ?? contextAny.req?.headers ?? getRequestHeaders() ?? {};
  const metadata = context.metadata ?? {};

  const authorization =
    getString(headers, 'authorization') ??
    getString(headers, 'Authorization') ??
    getString(metadata, 'authorization');

  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  return (
    getString(headers, 'x-api-key') ??
    getString(metadata, 'x-api-key') ??
    getString(metadata, 'apiKey') ??
    getString(metadata, 'api_key') ??
    getString(contextAny, 'authKey')
  );
}

function timingSafeStringEqual(left: string, right: string): boolean {
  // Compare fixed-size digests so the raw key length does not create an early
  // return path. This is timing-safe comparison, not password hashing; keys
  // must still be provisioned and stored through the deployment secret manager.
  const leftDigest = crypto.createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = crypto.createHash('sha256').update(right, 'utf8').digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function findConfiguredApiKey(key: string): AuthContext | undefined {
  for (const definition of CREDENTIALS) {
    const configured = env[definition.envKey];
    if (typeof configured === 'string' && timingSafeStringEqual(key, configured)) {
      return {
        subject: definition.subject,
        scopes: [...definition.scopes],
        isAdmin: definition.isAdmin === true,
        authMethod: 'api_key',
      };
    }
  }
  return undefined;
}

@Injectable()
export class ApiKeyGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const credential = extractCredential(context);
    let authInfo: AuthContext | undefined;

    if (credential) {
      // A Bearer credential is attempted as JWT first. If it is not a valid JWT,
      // the same value may still be a configured API key for compatibility with
      // clients that send credentials through Authorization.
      const jwtPayload = verifyJwt(credential);
      if (jwtPayload) {
        authInfo = {
          subject: jwtPayload.sub,
          scopes: [...jwtPayload.scopes],
          // JWTs never inherit the API-key admin wildcard. A deployment must
          // explicitly configure the admin API-key identity for '*' access.
          isAdmin: false,
          authMethod: 'jwt',
        };
      } else {
        authInfo = findConfiguredApiKey(credential);
      }
    }

    if (!authInfo && env.VITALIS_ALLOW_ANONYMOUS_DEMO) {
      // Demo mode (local demos with synthetic data only): full clinical scopes
      // so every tool works without a credential. Never grants admin/wildcard.
      // Keep disabled in any shared or production deployment.
      authInfo = {
        subject: 'anonymous_demo',
        scopes: [
          'triage:read',
          'drugs:read',
          'dx:read',
          'research:read',
          'fhir:read',
          'care:read',
          'care:write',
        ],
        isAdmin: false,
        authMethod: 'anonymous',
      };
    }

    if (!authInfo) {
      throw new Error(
        'AUTH_DENIED: Invalid or missing authentication credential. Provide an API key or Bearer token.',
      );
    }

    context.auth = authInfo as any;
    return true;
  }
}
