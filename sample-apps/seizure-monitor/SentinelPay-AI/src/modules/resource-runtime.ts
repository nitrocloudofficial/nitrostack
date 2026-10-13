/**
 * SentinelPay AI — Shared Resource Adapter Runtime
 * Source: Technical Specification §6 (MCP Resources)
 *
 * Resources are read-only, expose contextual state rather than arbitrary
 * database access, validate their URI parameter, and return a structured
 * not-found response instead of throwing raw errors at the transport
 * layer. NitroStack resource registration syntax note: see
 * `tool-runtime.ts` header — the same caveat applies here.
 */

import { assertId, assertNonEmptyString } from "../domain/schemas.js";
import { InvalidInputError, toErrorResponse } from "../domain/errors.js";
import { logger } from "../observability/logger.js";

/**
 * Default URI-parameter validator: the canonical uppercase ID pattern used
 * by transaction/vendor/invoice/case identifiers (e.g. "TX-827").
 */
function defaultValidate(id: unknown, idField: string): string {
  return assertId(id, idField);
}

/**
 * Lower-case, hyphenated identifiers (e.g. "payment-policy"). Still
 * rejects anything outside a closed character set — never accepts
 * arbitrary/unbounded input just because the uppercase pattern doesn't fit.
 */
export function assertSlugId(id: unknown, idField: string): string {
  const str = assertNonEmptyString(id, idField);
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(str)) {
    throw new InvalidInputError(
      `Field "${idField}" must be a lowercase, hyphenated identifier (e.g. "payment-policy").`,
      { field: idField, received: str }
    );
  }
  return str;
}

export function readResource<T>(
  uri: string,
  idField: string,
  id: string,
  fetch: (validId: string) => T,
  validate: (id: unknown, idField: string) => string = defaultValidate
): T | { error: ReturnType<typeof toErrorResponse> } {
  try {
    const validId = validate(id, idField);
    return fetch(validId);
  } catch (err) {
    logger.warn("resource.not_found_or_invalid", { uri, id });
    return { error: toErrorResponse(err) };
  }
}
