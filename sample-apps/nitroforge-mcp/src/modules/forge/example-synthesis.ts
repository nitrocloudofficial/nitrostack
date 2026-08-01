import type { JsonSchemaNode } from '../../contracts/endpoint-graph.schema.js';
import type { DerivedField } from './schema-derivation.js';

/**
 * example-synthesis.ts — synthesizes `examples.request` / `examples.response`
 * from the EndpointGraph when the IR doesn't carry its own (ToolIRSchema's
 * `examples` is optional, and W1's hand-written demo.ir.json doesn't
 * populate it for any tool). Still deterministic, still graph-derived, no
 * model involved — just a JSON-Schema-to-example-value walk.
 *
 * If a tool IS marked in the IR with real examples, EmitterService prefers
 * those instead of calling this module — synthesized data is a fallback,
 * not an override.
 */

function synthesizeValue(node: JsonSchemaNode, seed: string): unknown {
  if (node.enum && node.enum.length > 0) return node.enum[0];

  switch (node.type) {
    case 'string':
      if (node.format === 'email') return 'jane@example.com';
      if (node.format === 'date-time') return '2026-01-15T10:30:00Z';
      return `example_${seed}`;
    case 'number':
      return 42.5;
    case 'integer':
      return 1;
    case 'boolean':
      return true;
    case 'array':
      return node.items ? [synthesizeValue(node.items, seed)] : [];
    case 'object': {
      if (!node.properties) return {};
      const out: Record<string, unknown> = {};
      for (const [key, propSchema] of Object.entries(node.properties)) {
        out[key] = synthesizeValue(propSchema, key);
      }
      return out;
    }
    default:
      return null;
  }
}

/** Build a plausible examples.request object from a tool's derived input fields. */
export function synthesizeRequestExample(fields: DerivedField[]): Record<string, unknown> {
  const example: Record<string, unknown> = {};
  for (const field of fields) {
    // Keep synthesized requests small and demo-friendly: only populate
    // required fields plus the first optional one, rather than every field.
    if (!field.required && Object.keys(example).length > 0) continue;
    example[field.name] = synthesizeValue(field.schema, field.name);
  }
  return example;
}

/** Build a plausible examples.response object from an endpoint's response schema. */
export function synthesizeResponseExample(schema: JsonSchemaNode | null): unknown {
  if (!schema) return {};
  return synthesizeValue(schema, 'result');
}
