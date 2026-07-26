import type { JsonValue } from './types.js';
import { isMcpAppMode, isOpenAiMode } from './app-mode.js';

/**
 * Convert `openai/widgetCSP` snake_case object to MCP Apps `_meta.ui.csp` camelCase.
 */
export function widgetCspSnakeToUiCsp(openaiCsp: unknown): Record<string, JsonValue> | undefined {
  if (
    openaiCsp === undefined ||
    typeof openaiCsp !== 'object' ||
    openaiCsp === null ||
    Array.isArray(openaiCsp)
  ) {
    return undefined;
  }
  const c = openaiCsp as Record<string, unknown>;
  const cspOut: Record<string, JsonValue> = {};
  if (Array.isArray(c.connect_domains) && c.connect_domains.length > 0) {
    cspOut.connectDomains = c.connect_domains as JsonValue;
  }
  if (Array.isArray(c.resource_domains) && c.resource_domains.length > 0) {
    cspOut.resourceDomains = c.resource_domains as JsonValue;
  }
  if (Array.isArray(c.frame_domains) && c.frame_domains.length > 0) {
    cspOut.frameDomains = c.frame_domains as JsonValue;
  }
  return Object.keys(cspOut).length > 0 ? cspOut : undefined;
}

/**
 * `_meta.ui` block (no resourceUri) from widget resource metadata.
 */
export function buildUiMetaBlockFromWidgetResourceMeta(
  widgetMeta: Record<string, unknown> | undefined,
): Record<string, JsonValue> | undefined {
  if (!widgetMeta) {
    return undefined;
  }
  const ui: Record<string, JsonValue> = {};
  const csp = widgetCspSnakeToUiCsp(widgetMeta['openai/widgetCSP']);
  if (csp) {
    ui.csp = csp as JsonValue;
  }
  if (widgetMeta['openai/widgetPrefersBorder'] === true) {
    ui.prefersBorder = true;
  }
  const domain = widgetMeta['openai/widgetDomain'];
  if (typeof domain === 'string' && domain.trim()) {
    ui.domain = domain as JsonValue;
  }
  return Object.keys(ui).length > 0 ? ui : undefined;
}

/**
 * Full `_meta.ui` for tool descriptors: resourceUri plus optional csp / domain / prefersBorder.
 */
export function mergeToolUiMeta(
  resourceUri: string,
  widgetMeta: Record<string, unknown> | undefined,
): Record<string, JsonValue> {
  const base: Record<string, JsonValue> = { resourceUri };
  const extra = buildUiMetaBlockFromWidgetResourceMeta(widgetMeta);
  if (extra) {
    Object.assign(base, extra);
  }
  return base;
}

/**
 * `contents[]._meta` for resources/read (MCP Apps + OpenAI passthrough keys).
 */
export function buildResourceReadContentsMeta(
  widgetMeta: Record<string, JsonValue> | undefined,
): Record<string, JsonValue> | undefined {
  if (!widgetMeta) {
    return undefined;
  }
  const wm = widgetMeta as Record<string, unknown>;
  const out: Record<string, JsonValue> = {};
  
  // In MCP Apps mode, only emit _meta.ui — skip openai/* passthrough keys.
  // Also pass through any pre-built 'ui' block from getResourceMetadata() (mcp-app provider).
  if (isMcpAppMode()) {
    const uiBlock = buildUiMetaBlockFromWidgetResourceMeta(wm);
    if (uiBlock) {
      out.ui = uiBlock as JsonValue;
    }
    if (!out.ui && widgetMeta['ui'] !== undefined) {
      out.ui = widgetMeta['ui'] as JsonValue;
    }
  }

  if (isOpenAiMode()) {
    // OpenAI mode: also include openai/* keys for backward compatibility
    for (const key of [
      'openai/widgetCSP',
      'openai/widgetDescription',
      'openai/widgetPrefersBorder',
      'openai/widgetDomain',
    ] as const) {
      if (widgetMeta[key] !== undefined) {
        out[key] = widgetMeta[key];
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
