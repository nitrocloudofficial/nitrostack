/**
 * SEP-2133 extensions map (modern path).
 *
 * On 2026-07-28, capabilities that used to be baked into the core spec are
 * negotiated as named extensions advertised on `server/discover`. NitroStack
 * derives this map from what the app actually registered:
 *
 * - `io.modelcontextprotocol/app` — advertised when any tool ships a UI
 *   component / `@Widget` (MCP Apps).
 * - `io.modelcontextprotocol/tasks` — advertised when any tool declares
 *   `taskSupport` other than `forbidden`.
 *
 * Apps may declare extra extensions via `@McpApp({ extensions })`, which are
 * merged in verbatim.
 *
 * @module
 */

/** Canonical extension identifier for MCP Apps. */
export const EXT_APP = 'io.modelcontextprotocol/app';
/** Canonical extension identifier for the Tasks extension. */
export const EXT_TASKS = 'io.modelcontextprotocol/tasks';

/** Per-extension advertisement payload (opaque capability object). */
export type ExtensionEntry = Record<string, unknown>;

/** The `extensions` capabilities map advertised on `server/discover`. */
export type ExtensionsMap = Record<string, ExtensionEntry>;

/** Inputs used to derive the advertised extensions. */
export interface ExtensionSignals {
  /** True when at least one tool is task-capable. */
  hasTasks: boolean;
  /** True when at least one tool ships a UI component/widget. */
  hasApps: boolean;
  /** Extra extensions declared by the app author. */
  declared?: ExtensionsMap;
}

/**
 * Build the extensions capability map for `server/discover`.
 */
export function buildExtensionsMap(signals: ExtensionSignals): ExtensionsMap {
  const map: ExtensionsMap = {};

  if (signals.hasApps) {
    map[EXT_APP] = { version: '2026-07-28' };
  }
  if (signals.hasTasks) {
    // Tasks extension: server-directed task creation is supported; the
    // in-process TaskManager answers tasks/get, tasks/update, tasks/cancel.
    map[EXT_TASKS] = { version: '2026-07-28' };
  }
  if (signals.declared) {
    for (const [id, entry] of Object.entries(signals.declared)) {
      map[id] = { ...(map[id] || {}), ...entry };
    }
  }

  return map;
}
