/**
 * Live server handle.
 *
 * `McpApplicationFactory.create()` returns the running NitroStackServer, which
 * exposes a public `tool()` registration method and `notifyToolsListChanged()`.
 * Stashing the instance here is what lets the skill-generation tool mint a NEW
 * MCP tool at runtime and have it appear in the client's tool list immediately —
 * no restart, no redeploy.
 *
 * Kept deliberately tiny and framework-shaped: a module-level slot rather than a
 * DI provider, because the server exists before the DI container is asked for it.
 */
import type { NitroStackServer, Tool } from '@nitrostack/core';

let instance: NitroStackServer | null = null;

export function setServer(server: NitroStackServer): void {
  instance = server;
}

export function getServer(): NitroStackServer | null {
  return instance;
}

/**
 * Register a tool on the live server and tell connected clients to refresh
 * their tool list. Returns false when called before bootstrap completes, so
 * callers can report "registered, active on next start" instead of failing.
 */
export function registerLiveTool(tool: Tool): boolean {
  const server = instance;
  if (!server) return false;
  server.tool(tool);
  server.notifyToolsListChanged();
  return true;
}
