import { createHash } from 'node:crypto';
import { Tool } from '../tool.js';

/**
 * Schema and visibility material for catalog cache keys.
 * Name and description alone reuse a stale index when a parameter list changes.
 */
export function toolCacheFields(tool: Tool): { schema: string; visibility: string } {
  return {
    schema: schemaKey(tool.inputSchema),
    visibility: `${tool.visibility ?? ''}:${tool.annotations?.destructiveHint === true ? '1' : '0'}`,
  };
}

function schemaKey(schema: unknown): string {
  if (!schema || typeof schema !== 'object') return '';
  const record = schema as {
    properties?: Record<string, unknown>;
    required?: unknown;
    shape?: Record<string, unknown>;
    _def?: { typeName?: string; shape?: (() => Record<string, unknown>) | Record<string, unknown> };
  };

  if (record.properties && typeof record.properties === 'object') {
    const keys = Object.keys(record.properties).sort().join(',');
    const required = Array.isArray(record.required) ? [...record.required].sort().join(',') : '';
    return `json:${keys}:req:${required}`;
  }

  const shape =
    typeof record._def?.shape === 'function'
      ? record._def.shape()
      : record.shape || (record._def?.shape && typeof record._def.shape === 'object' ? record._def.shape : undefined);

  if (shape && typeof shape === 'object') {
    return `zod:${Object.keys(shape).sort().join(',')}`;
  }

  return record._def?.typeName ?? '';
}

/**
 * Length-prefixed catalog fingerprint. Without a delimiter, ('ab','c') and ('a','bc')
 * hash to the same key and a transform can serve a stale tool list.
 */
export function catalogCacheKey(tools: Tool[], visibleNames: string[]): string {
  const hash = createHash('sha256');
  const feed = (value: string) => hash.update(`${value.length}:${value}`);
  for (const tool of tools) {
    feed(tool.name);
    feed(tool.description || '');
    const identity = toolCacheFields(tool);
    feed(identity.schema);
    feed(identity.visibility);
  }
  hash.update('|visible|');
  for (const name of visibleNames) feed(name);
  return hash.digest('hex');
}
