/**
 * SentinelPay AI — Authentication
 * Source: Technical Specification §11.3 (Authentication), §12.1 (Authentication),
 *         §12.4 (Secret management)
 *
 * Simplest supported mechanism for the MVP: a single shared Bearer token
 * read from MCP_AUTH_TOKEN (§12.4 — local `.env` only, never committed).
 * Fails closed: if the server itself has no token configured, every
 * request is rejected rather than silently allowed through.
 *
 * If the deployed NitroStack environment requires OAuth instead, replace
 * this module's `authenticate()` implementation with the official
 * NitroStack OAuth template/flow — callers (tool-runtime.ts) only depend
 * on this function's signature, not on Bearer tokens specifically.
 */

import { timingSafeEqual } from "node:crypto";
import { UnauthorizedError } from "../domain/errors.js";

export interface AuthContext {
  principalId: string;
  authenticatedAt: string; // ISO-8601
}

const BEARER_PATTERN = /^Bearer\s+(.+)$/;

/**
 * Constant-time string comparison. A plain `!==` check on a secret token
 * leaks timing information proportional to the length of the matching
 * prefix; `timingSafeEqual` requires equal-length buffers, so a length
 * mismatch is treated as an immediate, safe "not equal" rather than being
 * padded or short-circuited in a way that reveals length.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates an `Authorization` header value. Throws UnauthorizedError on
 * any failure — unconfigured server token, missing header, wrong scheme,
 * or an incorrect token. Never partially authenticates.
 */
export function authenticate(authorizationHeader: string | undefined): AuthContext {
  const configuredToken = process.env.MCP_AUTH_TOKEN;

  if (!configuredToken) {
    // Fail closed: an unconfigured server must never behave as "open".
    throw new UnauthorizedError(
      "Server authentication is not configured (MCP_AUTH_TOKEN unset); failing closed."
    );
  }

  // Local dev only, and only when explicitly opted in: no MCP client
  // (including NitroStudio) sets `_meta.authorizationHeader` by default,
  // and neither transport in "dual" mode currently forwards a real HTTP
  // Authorization header into ExecutionContext (see index.ts gap #2).
  // This is gated behind its own flag rather than inferred from NODE_ENV
  // so that (a) a deployment that forgets to set NODE_ENV=production
  // doesn't accidentally open this up, and (b) existing unit tests that
  // call authenticate(undefined) without touching this flag keep failing
  // closed exactly as before. Set MCP_AUTH_ALLOW_LOCAL_BYPASS=true in
  // your local .env only — never in a deployed environment's config.
  // This does NOT fix production: a real deployment still needs the SDK
  // (or a custom HTTP middleware) to forward the incoming Authorization
  // header into context.metadata, or to migrate to NitroStack's built-in
  // ApiKeyModule/JWTModule instead of this shared-Bearer-token scheme.
  if (!authorizationHeader && process.env.MCP_AUTH_ALLOW_LOCAL_BYPASS === "true") {
    return {
      principalId: "sentinelpay-agent-dev",
      authenticatedAt: new Date().toISOString(),
    };
  }

  if (!authorizationHeader) {
    throw new UnauthorizedError("Missing Authorization header.");
  }

  const match = BEARER_PATTERN.exec(authorizationHeader);
  if (!match) {
    throw new UnauthorizedError("Authorization header must use the Bearer scheme.");
  }

  const presentedToken = match[1];
  if (!presentedToken || !constantTimeEquals(presentedToken, configuredToken)) {
    throw new UnauthorizedError("Invalid bearer token.");
  }

  return {
    principalId: "sentinelpay-agent",
    authenticatedAt: new Date().toISOString(),
  };
}
