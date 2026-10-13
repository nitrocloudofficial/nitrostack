/**
 * Transport selection.
 *
 * NitroStack 1.0.x decides its transport inside `NitroStackServer.start()` from
 * `MCP_TRANSPORT_TYPE` (falling back to NODE_ENV), and reads its listen address
 * from `PORT` / `HOST`. The `transport` block on `@McpApp` is accepted and then
 * ignored. That means a project-level switch like BRIDGE_TRANSPORT only works if
 * something translates it into the variables the framework actually consults —
 * which is what this module does, from the entry point, before start().
 *
 * Keeping it here rather than inline in index.ts lets app.module.ts declare the
 * same value in its decorator, so the two cannot drift apart.
 */
export type TransportType = 'stdio' | 'http' | 'dual';

const VALID: readonly TransportType[] = ['stdio', 'http', 'dual'];

/**
 * The transport this process should run.
 *
 * Precedence: an explicit MCP_TRANSPORT_TYPE (so a host that already speaks
 * NitroStack's own variable keeps control) → BRIDGE_TRANSPORT → production
 * implies HTTP → stdio.
 */
export function resolveTransportType(): TransportType {
  const framework = normalize(process.env.MCP_TRANSPORT_TYPE);
  if (framework) return framework;

  const project = normalize(process.env.BRIDGE_TRANSPORT);
  if (project) return project;

  return process.env.NODE_ENV === 'production' ? 'http' : 'stdio';
}

/**
 * Push the resolved transport and listen address into the environment variables
 * NitroStack reads. Call once, before `server.start()`.
 *
 * Returns the effective settings so the caller can log them — "which transport
 * am I actually on" is the first question anyone debugging a dashboard
 * connection asks.
 */
export function applyTransportEnv(): { type: TransportType; port: string; host: string } {
  const type = resolveTransportType();
  process.env.MCP_TRANSPORT_TYPE = type;

  // NitroStack defaults these to 3000/localhost. 8080 is what this project
  // documents, and binding 0.0.0.0 is required for a container to be reachable.
  process.env.PORT ??= '8080';
  process.env.HOST ??= type === 'stdio' ? 'localhost' : '0.0.0.0';

  return { type, port: process.env.PORT, host: process.env.HOST };
}

function normalize(value: string | undefined): TransportType | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && (VALID as readonly string[]).includes(trimmed)
    ? (trimmed as TransportType)
    : null;
}
