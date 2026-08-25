/**
 * SEP-2106 full JSON Schema 2020-12 for tools (modern path only).
 *
 * The legacy path converts Zod with `target: 'jsonSchema7'` and inlines refs
 * (`$refStrategy: 'none'`), forcing `type: "object"` on both input and output —
 * unchanged so 2025-era clients never see unexpected keywords.
 *
 * On 2026-07-28 tool schemas are lifted to full JSON Schema 2020-12:
 * - input keeps an object root but may carry `oneOf`/`anyOf`/`allOf`,
 *   conditionals, and `$ref`/`$defs`
 * - output is unrestricted (not forced to an object)
 * - external `$ref` URIs are never auto-dereferenced and schema depth is bounded
 *
 * @module
 */

import { z } from 'zod';

/** JSON Schema object (loose). */
export type JsonSchemaObject = Record<string, unknown>;

/** Maximum schema nesting depth accepted on the modern path (DoS guard). */
export const MAX_SCHEMA_DEPTH = 64;

function isZodSchema(schema: unknown): schema is z.ZodSchema {
  return !!schema && typeof schema === 'object' && '_def' in (schema as object);
}

/**
 * Bound the depth of a JSON schema object, replacing anything deeper than
 * `maxDepth` with a permissive `{}` so a pathological `$defs` graph cannot blow
 * the stack or the validator. External `$ref` URIs are left intact but are
 * never dereferenced by NitroStack.
 */
export function boundSchemaDepth(value: unknown, maxDepth = MAX_SCHEMA_DEPTH, depth = 0): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= maxDepth) {
    return {};
  }
  if (Array.isArray(value)) {
    return value.map((v) => boundSchemaDepth(v, maxDepth, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = boundSchemaDepth(v, maxDepth, depth + 1);
  }
  return out;
}

/**
 * Convert a Zod or JSON schema to JSON Schema 2020-12 for the modern era,
 * preserving composition (`oneOf`/`anyOf`/`allOf`), conditionals, and
 * `$ref`/`$defs`.
 *
 * @param schema - Zod schema or a pre-built JSON schema.
 * @param opts.root - `'input'` forces an object root (spec requirement for tool
 *   input); `'output'` leaves the schema unrestricted.
 */
export async function convertToModernJsonSchema(
  schema: unknown,
  opts: { root: 'input' | 'output' },
): Promise<JsonSchemaObject> {
  let json: JsonSchemaObject;

  if (isZodSchema(schema)) {
    try {
      const mod = await import('zod-to-json-schema');
      const zodToJsonSchema = (mod as { zodToJsonSchema?: unknown; default?: unknown }).zodToJsonSchema
        || (mod as { default?: unknown }).default;
      // 2019-09 target keeps $ref/$defs and composition (closest widely-supported
      // preset to 2020-12 in zod-to-json-schema); root strategy emits $defs.
      json = (zodToJsonSchema as (s: unknown, o: unknown) => JsonSchemaObject)(schema, {
        target: 'jsonSchema2019-09',
        $refStrategy: 'root',
      });
      // Advertise the 2020-12 dialect explicitly (SEP-2106). zod-to-json-schema
      // stamps a 2019-09 `$schema`; the emitted keywords are 2020-12-compatible
      // for tool schemas, so relabel to the revision the spec requires.
      json.$schema = 'https://json-schema.org/draft/2020-12/schema';
    } catch {
      json = { type: 'object', properties: {}, additionalProperties: true };
    }
  } else if (schema && typeof schema === 'object') {
    json = { ...(schema as JsonSchemaObject) };
  } else {
    json = {};
  }

  json = boundSchemaDepth(json) as JsonSchemaObject;

  if (opts.root === 'input') {
    // Input schema root must be an object per spec; composition/refs are allowed
    // alongside it but the root type stays 'object'.
    if (!('type' in json) && !('$ref' in json)) {
      json.type = 'object';
    } else if (json.type && json.type !== 'object') {
      json.type = 'object';
    }
  }

  return json;
}
