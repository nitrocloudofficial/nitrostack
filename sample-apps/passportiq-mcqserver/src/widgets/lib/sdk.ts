/**
 * Host bridge.
 *
 * `nitrostack-cli build` wraps every `app/<route>/page.tsx` default export in:
 *
 *     const data = window.openai?.toolOutput || {};
 *     reactRoot.render(React.createElement(WidgetPage, { data }));
 *
 * So the tool result arrives as the `data` prop — already parsed, never a string.
 * Two consequences drive everything in this file:
 *
 *  1. `data` is `{}` when the widget is opened outside a tool call (an inspector
 *     preview, a cold iframe, a demo tab). A widget that assumes a populated
 *     payload renders a blank rectangle in exactly the situation where someone is
 *     looking at it for the first time. So every page falls back to SAMPLE data.
 *
 *  2. `data` is whatever the tool returned, which means it is untyped at the
 *     boundary. We never trust its shape: `pick()` walks it defensively and any
 *     missing branch degrades to the fallback rather than throwing. A thrown
 *     error inside a widget bundle is invisible — the frame just stays empty.
 */

declare global {
  interface Window {
    openai?: {
      toolOutput?: unknown;
      callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      sendFollowUpMessage?: (msg: { prompt: string }) => void;
      setWidgetState?: (state: unknown) => void;
    };
  }
}

/** True when we are rendering a real tool result rather than the demo payload. */
export function hasHostData(data: unknown): boolean {
  return !!data && typeof data === 'object' && Object.keys(data as object).length > 0;
}

/**
 * Merge a host payload over a fallback, one level deep.
 *
 * Shallow-by-key is deliberate: a tool that returns `{ applicationId }` and
 * nothing else should still render a full screen, but a tool that returns a real
 * `nodes` array must completely replace the sample one rather than being merged
 * into it (merging arrays of graph nodes would invent edges to nodes that do not
 * exist).
 */
export function withFallback<T extends Record<string, unknown>>(data: unknown, fallback: T): T {
  if (!hasHostData(data)) return fallback;
  const host = data as Record<string, unknown>;
  const out: Record<string, unknown> = { ...fallback };
  for (const [k, v] of Object.entries(host)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out as T;
}

/** Read a dotted path without throwing on any missing/misshaped link. */
export function pick<T>(source: unknown, path: string, fallback: T): T {
  let cur: unknown = source;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return fallback;
    cur = (cur as Record<string, unknown>)[key];
  }
  return (cur === undefined || cur === null ? fallback : cur) as T;
}

/**
 * Ask the host to run another tool.
 *
 * Widgets are read-only surfaces in every host we cannot control, so this is
 * best-effort by design: if `callTool` is absent we resolve `null` instead of
 * rejecting. Callers render an inert button rather than a broken one.
 */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown | null> {
  try {
    if (typeof window === 'undefined' || !window.openai?.callTool) return null;
    return await window.openai.callTool(name, args);
  } catch {
    return null;
  }
}

/** Push a message back into the conversation (used by the officer decision panel). */
export function sendFollowUp(prompt: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.openai?.sendFollowUpMessage) return false;
    window.openai.sendFollowUpMessage({ prompt });
    return true;
  } catch {
    return false;
  }
}
