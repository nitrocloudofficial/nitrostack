/**
 * NitroStack App Mode
 *
 * Central utility for detecting and switching between OpenAI Apps SDK
 * and MCP Apps protocol conventions.
 *
 * Set via the `NITROSTACK_APP_MODE` environment variable:
 *   - 'openai'  (default) — OpenAI Apps SDK / ChatGPT conventions
 *   - 'mcp-app' — MCP Apps spec (Claude, universal MCP hosts)
 *
 * @module
 */

/**
 * Supported app modes
 */
export type AppMode = 'openai' | 'mcp-app' | 'universal';

/**
 * MIME type used by MCP Apps spec for UI resources.
 * Hosts use this MIME type to activate the MCP Apps bridge (JSON-RPC over postMessage).
 */
export const RESOURCE_MIME_TYPE_MCP_APP = 'text/html;profile=mcp-app';

/**
 * MIME type used by OpenAI Apps SDK for UI resources (standard HTML).
 */
export const RESOURCE_MIME_TYPE_OPENAI = 'text/html';

/**
 * Get the current NitroStack app mode from environment.
 *
 * Reads `NITROSTACK_APP_MODE` env variable with lenient parsing:
 *   - 'mcp-app', 'mcpapp', 'mcp_app' → 'mcp-app'
 *   - 'universal', 'all', 'both' → 'universal'
 *   - anything else (or unset) → 'openai' (default)
 *
 * @returns The active app mode
 */
export function getAppMode(): AppMode {
  const raw = process.env.NITROSTACK_APP_MODE?.toLowerCase().trim();
  if (raw === 'mcp-app' || raw === 'mcpapp' || raw === 'mcp_app' || raw === 'mcp app') {
    return 'mcp-app';
  }
  if (raw === 'universal' || raw === 'all' || raw === 'both') {
    return 'universal';
  }
  return 'openai';
}

/**
 * Check if the server is running in MCP Apps mode.
 * Returns true if mode is 'mcp-app' or 'universal'.
 */
export function isMcpAppMode(): boolean {
  const mode = getAppMode();
  return mode === 'mcp-app' || mode === 'universal';
}

/**
 * Check if the server is running in OpenAI Apps SDK mode.
 * Returns true if mode is 'openai' or 'universal'.
 */
export function isOpenAiMode(): boolean {
  const mode = getAppMode();
  return mode === 'openai' || mode === 'universal';
}

/**
 * Get the appropriate MIME type for widget resources based on current mode.
 *
 * - OpenAI mode: `text/html` (standard)
 * - MCP Apps/Universal mode: `text/html;profile=mcp-app`
 */
export function getWidgetMimeType(): string {
  return isMcpAppMode() ? RESOURCE_MIME_TYPE_MCP_APP : RESOURCE_MIME_TYPE_OPENAI;
}
