/**
 * Client ID Metadata Documents (CIMD).
 *
 * The final MCP 2026-07-28 authorization spec **deprecates Dynamic Client
 * Registration (DCR)** in favor of CIMD: a client uses an HTTPS URL as its
 * `client_id`, and that URL resolves to a JSON document describing the client
 * (redirect URIs, grant types, etc.). Authorization servers fetch and cache the
 * document instead of running a registration endpoint.
 *
 * This module provides:
 * - a publisher that serves a client's own metadata document at a stable URL, and
 * - a resolver that fetches and validates a client's CIMD URL.
 *
 * DCR remains available on the legacy path and as an opt-in; CIMD is the
 * recommended mechanism on 2026-07-28.
 *
 * @module
 */

/**
 * A Client ID Metadata Document (OAuth client metadata, RFC 7591 shape).
 * The `client_id` MUST equal the HTTPS URL the document is served from.
 */
export interface ClientIdMetadataDocument {
  /** The HTTPS URL this document is published at (also the OAuth `client_id`). */
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  application_type?: 'web' | 'native';
  logo_uri?: string;
  client_uri?: string;
  contacts?: string[];
  [key: string]: unknown;
}

/**
 * Build a Client ID Metadata Document for this client.
 *
 * @param clientIdUrl - The HTTPS URL the document will be served from. Becomes
 *   the `client_id`.
 */
export function createClientIdMetadataDocument(
  clientIdUrl: string,
  metadata: { redirect_uris: string[] } & Partial<Omit<ClientIdMetadataDocument, 'client_id' | 'redirect_uris'>>,
): ClientIdMetadataDocument {
  if (!/^https:\/\//i.test(clientIdUrl)) {
    // CIMD requires HTTPS (loopback http is only tolerated in dev).
    const isLoopback = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(clientIdUrl);
    if (!isLoopback) {
      throw new Error(`CIMD client_id must be an HTTPS URL, got: ${clientIdUrl}`);
    }
  }
  return { ...metadata, client_id: clientIdUrl };
}

/**
 * Validate that a resolved document is a well-formed CIMD whose `client_id`
 * matches the URL it was fetched from (prevents impersonation).
 */
export function validateClientIdMetadataDocument(
  doc: unknown,
  sourceUrl: string,
): ClientIdMetadataDocument {
  if (!doc || typeof doc !== 'object') {
    throw new Error('CIMD is not an object');
  }
  const d = doc as Record<string, unknown>;
  if (typeof d.client_id !== 'string') {
    throw new Error('CIMD is missing a string `client_id`');
  }
  const normalize = (u: string): string => u.replace(/\/+$/, '');
  if (normalize(d.client_id) !== normalize(sourceUrl)) {
    throw new Error(
      `CIMD client_id "${d.client_id}" does not match the document URL "${sourceUrl}"`,
    );
  }
  if (!Array.isArray(d.redirect_uris) || d.redirect_uris.some((u) => typeof u !== 'string')) {
    throw new Error('CIMD `redirect_uris` must be an array of strings');
  }
  return d as ClientIdMetadataDocument;
}

/**
 * Resolve a client's CIMD by fetching its `client_id` URL and validating it.
 * Authorization servers call this in place of a DCR lookup.
 */
export async function resolveClientIdMetadataDocument(
  clientIdUrl: string,
  options?: { fetchImpl?: typeof fetch },
): Promise<ClientIdMetadataDocument> {
  const doFetch = options?.fetchImpl ?? fetch;
  const response = await doFetch(clientIdUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve CIMD from ${clientIdUrl}: ${response.status}`);
  }
  const doc = await response.json();
  return validateClientIdMetadataDocument(doc, clientIdUrl);
}

/**
 * Whether a string looks like a CIMD-style client id (an HTTP/HTTPS URL) rather
 * than an opaque DCR-issued id.
 */
export function isClientIdMetadataUrl(clientId: string): boolean {
  return /^https?:\/\//i.test(clientId);
}
