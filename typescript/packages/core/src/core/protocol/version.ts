/**
 * Protocol version selection for NitroStack.
 *
 * NitroStack speaks two protocol eras:
 *
 * - **legacy** — the 2025-era wire (documented by NitroStack as `2025-06-18`):
 *   sessionful Streamable HTTP with the `initialize` handshake and
 *   `Mcp-Session-Id`, implemented on `@modelcontextprotocol/sdk` v1. This is the
 *   default and stays byte-for-byte identical to prior releases.
 * - **modern** — the 2026-07-28 wire: stateless HTTP, `server/discover`,
 *   per-request `_meta` envelope, `Mcp-Method`/`Mcp-Name` headers, cache hints,
 *   multi-round-trip requests, and the Tasks/Apps extensions. Implemented on the
 *   official `@modelcontextprotocol/server` v2 packages.
 * - **auto** — serve both eras from one process, for validation against mixed
 *   clients.
 *
 * Selection precedence (env wins over config so ops can flip a deployed app):
 *   `NITRO_MCP_PROTOCOL_VERSION` env → `McpServerConfig.protocolVersion` → legacy.
 *
 * @module
 */

/**
 * Resolved protocol era used to pick a transport adapter.
 */
export type ProtocolEra = 'legacy' | 'modern' | 'auto';

/**
 * The wire revision string NitroStack advertises for the modern era.
 */
export const MODERN_PROTOCOL_VERSION = '2026-07-28';

/**
 * The wire revision string NitroStack has historically advertised for the
 * legacy era (health page, docs, startup logs).
 */
export const LEGACY_PROTOCOL_VERSION = '2025-06-18';

/**
 * Environment variable that selects the protocol era.
 */
export const PROTOCOL_ENV_VAR = 'NITRO_MCP_PROTOCOL_VERSION';

/**
 * Normalize any user-supplied protocol string into an era.
 *
 * Accepts (case-insensitive, trimmed):
 * - modern: `2026-07-28`, `2026`, `modern`, `latest`
 * - auto:   `auto`, `both`, `dual-spec`
 * - legacy: `2025-06-18`, `2025-11-25`, `2025`, `legacy`, unset/empty/unknown
 */
export function normalizeProtocolEra(value: string | undefined | null): ProtocolEra {
  const raw = value?.toLowerCase().trim();
  if (!raw) {
    return 'legacy';
  }
  if (raw === '2026-07-28' || raw === '2026' || raw === 'modern' || raw === 'latest') {
    return 'modern';
  }
  if (raw === 'auto' || raw === 'both' || raw === 'dual' || raw === 'dual-spec') {
    return 'auto';
  }
  // 2025-06-18 / 2025-11-25 / 2025 / legacy / anything unrecognized → legacy.
  return 'legacy';
}

/**
 * Resolve the active protocol era from the environment and optional config.
 * The environment variable always wins so a deployed app can be flipped
 * without a code change.
 *
 * @param configValue - Optional `protocolVersion` from `McpServerConfig` / `@McpApp`.
 */
export function resolveProtocolEra(configValue?: string): ProtocolEra {
  const fromEnv = process.env[PROTOCOL_ENV_VAR];
  if (fromEnv && fromEnv.trim()) {
    return normalizeProtocolEra(fromEnv);
  }
  return normalizeProtocolEra(configValue);
}

/**
 * Whether the modern (2026-07-28) engine must be loaded for the given era.
 * True for both `modern` and `auto`.
 */
export function needsModernEngine(era: ProtocolEra): boolean {
  return era === 'modern' || era === 'auto';
}

/**
 * Whether the legacy (2025-era) engine must be loaded for the given era.
 * True for both `legacy` and `auto`.
 */
export function needsLegacyEngine(era: ProtocolEra): boolean {
  return era === 'legacy' || era === 'auto';
}

/**
 * The wire revision advertised for a given era (used in health/docs/logs).
 * `auto` reports the modern revision because a modern-capable deployment
 * advertises the newest revision it supports.
 */
export function protocolVersionForEra(era: ProtocolEra): string {
  return era === 'legacy' ? LEGACY_PROTOCOL_VERSION : MODERN_PROTOCOL_VERSION;
}
