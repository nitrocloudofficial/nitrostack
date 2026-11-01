// Defers the MCP SDK's schema-validation failure to the tool's own, friendlier validation (input-validation.ts).
//
// How validation works in @nitrostack/core 1.1.2 + @modelcontextprotocol/server 2.x (the 2026-07-28 engine, used for stdio and
// for HTTP in 'auto' mode): the adapter lifts each zod schema to JSON Schema and registers it with fromJsonSchema(); on
// tools/call McpServer.validateToolInput() runs ajv and throws "Input validation error: Invalid arguments for tool X: <ajv text>",
// which the SDK returns as an isError result. That happens before NitroStack guards, middleware, interceptors and pipes, and
// there is no option to change it. So for tools that validate themselves (SELF_VALIDATING_TOOLS) we let the SDK's failure
// pass, and the handler wrapper rejects the same input after the auth guard with the formatter's message. The advertised JSON
// Schema is unchanged (it still shows minLength, maxLength, maxItems, enum values and required).
//
// What stays with the SDK: the element-count cap (maxToolInputElements) and every non-schema error are rethrown untouched.
// Fail-safe: if the adapter or McpServer shape is not what we expect, nothing is patched and the SDK message is returned as before.
import { SELF_VALIDATING_TOOLS } from './validated-tool.js';

const PREFIX = 'Input validation error:';

interface McpServerLike {
  validateToolInput?: (this: unknown, tool: unknown, args: unknown, name: string) => Promise<unknown>;
}
interface AdapterLike {
  buildServer?: (...args: unknown[]) => Promise<McpServerLike>;
}
interface AppLike {
  getModernAdapter?: () => Promise<AdapterLike>;
}

export function deferToolValidation(server: McpServerLike): boolean {
  const original = server.validateToolInput;
  if (typeof original !== 'function') return false;
  server.validateToolInput = async function (this: unknown, tool, args, name) {
    try {
      return await original.call(this, tool, args, name);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith(PREFIX) && SELF_VALIDATING_TOOLS.has(name)) return args ?? {};
      throw e;
    }
  };
  return true;
}

// Call before server.start(). Returns false (and patches nothing) when the engine is not the modern adapter, for example
// NITRO_MCP_PROTOCOL_VERSION=2025-06-18, where the SDK does no schema validation and the handler wrapper does all of it.
export async function installValidationDeferral(app: unknown): Promise<boolean> {
  const adapter = await (app as AppLike).getModernAdapter?.();
  const build = adapter?.buildServer;
  if (!adapter || typeof build !== 'function') return false;
  adapter.buildServer = async (...args: unknown[]) => {
    const server = await build.apply(adapter, args);
    deferToolValidation(server);
    return server;
  };
  return true;
}
