// Pure helpers for getting the tool result into the widget. No React, no I/O, never throws.
// The host can deliver the result in several ways and at several times; the widget must not depend on one.

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// The tool result carried by one window message, or undefined when the message carries none (or a null one, which
// must never wipe a result that already arrived).
export function outputFromMessage(data: unknown): unknown {
  if (!isObj(data)) return undefined;
  let out: unknown;
  switch (data.type) {
    case 'TOOL_OUTPUT': // legacy NitroStack
    case 'toolOutput': // dev mode
      out = data.data;
      break;
    case 'NITRO_INJECT_OPENAI': {
      const g = isObj(data.data) ? data.data : isObj(data.openai) ? data.openai : undefined;
      out = g?.toolOutput;
      break;
    }
    case 'setGlobals': // OpenAI Apps SDK
      out = isObj(data.globals) ? data.globals.toolOutput : undefined;
      break;
    default:
      // MCP Apps (ext-apps) host notification carrying a CallToolResult.
      if (data.method === 'ui/notifications/tool-result') out = data.params;
  }
  return out === null ? undefined : out;
}
