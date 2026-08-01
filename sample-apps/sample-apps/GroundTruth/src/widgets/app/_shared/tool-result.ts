/**
 * Normalise whatever `callTool` hands back into the tool's own return object.
 *
 * Hosts differ in how much of the MCP envelope they unwrap before the widget
 * sees it — some return the parsed object, some `{ result }`, some the raw
 * `{ content: [{ type: 'text', text: '…' }] }`, some `{ structuredContent }`.
 * Guessing wrong means a widget silently renders an empty success state, so
 * this accepts every shape rather than betting on one.
 */
export function unwrapToolResult<T>(response: unknown): T | null {
  const seen = new Set<unknown>();

  const walk = (value: unknown, depth: number): T | null => {
    if (value == null || depth > 4) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
      try {
        return walk(JSON.parse(trimmed), depth + 1);
      } catch {
        return null;
      }
    }

    if (typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    const obj = value as Record<string, unknown>;

    // MCP text content: the payload is JSON inside content[].text
    if (Array.isArray(obj.content)) {
      for (const part of obj.content) {
        const text = (part as Record<string, unknown> | null)?.text;
        if (typeof text === 'string') {
          const parsed = walk(text, depth + 1);
          if (parsed) return parsed;
        }
      }
    }

    // Only peel a wrapper key when the object looks like nothing but a wrapper.
    // A payload that happens to carry its own `data` or `result` field must not
    // be unwrapped into that field.
    const ENVELOPE_KEYS = ['structuredContent', 'result', 'data', 'output', 'content', 'isError'];
    const looksLikeEnvelope = Object.keys(obj).every((k) => ENVELOPE_KEYS.includes(k));

    if (looksLikeEnvelope) {
      for (const key of ['structuredContent', 'result', 'data', 'output'] as const) {
        if (key in obj) {
          const parsed = walk(obj[key], depth + 1);
          if (parsed) return parsed;
        }
      }
    }

    // Already the tool's own object.
    return obj as T;
  };

  return walk(response, 0);
}
