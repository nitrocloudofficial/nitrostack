import type { EndpointGraph, Endpoint, Param, JsonSchemaNode } from '../../contracts/endpoint-graph.schema.js';

/**
 * schema-derivation.ts — ③ EMIT, the load-bearing step.
 *
 * Builds a Zod `inputSchema` (as TypeScript SOURCE CODE, to be spliced into
 * a generated `.tools.ts` file) purely from the EndpointGraph, by resolving
 * each tool's `composes` array against `graph.endpoints`. The
 * ToolSurfaceIR has no inputSchema field — this module is the only place
 * one gets created, and it never reads anything the model produced except
 * endpoint ids. If a `composes` entry doesn't resolve, that's an IR
 * validation bug upstream, not something to paper over here — this module
 * throws rather than silently dropping a param.
 */

export interface DerivedField {
  name: string;
  required: boolean;
  location: 'path' | 'query' | 'body';
  schema: JsonSchemaNode;
  description?: string;
}

export interface DerivedInputSchema {
  fields: DerivedField[];
  /** Ready-to-splice Zod object literal source, e.g. "z.object({\n  id: z.string(),\n})" */
  source: string;
}

function resolveEndpoints(graph: EndpointGraph, composes: string[]): Endpoint[] {
  return composes.map((id) => {
    const endpoint = graph.endpoints.find((e) => e.id === id);
    if (!endpoint) {
      throw new Error(
        `IR references endpoint "${id}" which does not exist in the EndpointGraph — this should have failed IR validation upstream`,
      );
    }
    return endpoint;
  });
}

/** Flatten path+query params (+ body properties for write methods) from every composed endpoint into one field map. */
function collectFields(endpoints: Endpoint[]): DerivedField[] {
  const fields = new Map<string, DerivedField>();

  const addParam = (p: Param, location: 'path' | 'query') => {
    fields.set(p.name, {
      name: p.name,
      required: p.required,
      location,
      schema: p.schema,
      description: p.description,
    });
  };

  for (const endpoint of endpoints) {
    for (const p of endpoint.pathParams) addParam(p, 'path');
    for (const p of endpoint.queryParams) addParam(p, 'query');

    const isWrite = endpoint.method === 'post' || endpoint.method === 'put' || endpoint.method === 'patch';
    if (isWrite && endpoint.bodySchema?.properties) {
      const required = new Set(endpoint.bodySchema.required ?? []);
      for (const [key, schema] of Object.entries(endpoint.bodySchema.properties)) {
        fields.set(key, {
          name: key,
          required: required.has(key),
          location: 'body',
          schema,
          description: schema.description,
        });
      }
    }
  }

  return [...fields.values()];
}

/** JSON-Schema-ish node -> Zod source expression (no trailing modifiers). */
function zodBaseExpr(node: JsonSchemaNode): string {
  if (node.enum && node.enum.length > 0) {
    if (node.enum.every((v) => typeof v === 'string')) {
      return `z.enum([${node.enum.map((v) => JSON.stringify(v)).join(', ')}])`;
    }
    return `z.union([${node.enum.map((v) => `z.literal(${JSON.stringify(v)})`).join(', ')}])`;
  }

  switch (node.type) {
    case 'string':
      return node.format === 'email' ? 'z.string().email()' : 'z.string()';
    case 'number':
    case 'integer':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'array':
      return `z.array(${node.items ? zodBaseExpr(node.items) : 'z.unknown()'})`;
    case 'object': {
      if (!node.properties) return 'z.record(z.unknown())';
      const required = new Set(node.required ?? []);
      const props = Object.entries(node.properties)
        .map(([key, propSchema]) => {
          const expr = zodFieldExpr(propSchema, required.has(key), propSchema.description);
          return `    ${safeKey(key)}: ${expr},`;
        })
        .join('\n');
      return `z.object({\n${props}\n  })`;
    }
    default:
      return 'z.unknown()';
  }
}

function zodFieldExpr(schema: JsonSchemaNode, required: boolean, description?: string): string {
  let expr = zodBaseExpr(schema);
  if (!required) expr += '.optional()';
  if (description) expr += `.describe(${JSON.stringify(description)})`;
  return expr;
}

function safeKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

/** Derive a tool's full Zod inputSchema from the graph via its composes array. */
export function deriveInputSchema(graph: EndpointGraph, composes: string[]): DerivedInputSchema {
  const endpoints = resolveEndpoints(graph, composes);
  const fields = collectFields(endpoints);

  if (fields.length === 0) {
    return { fields, source: 'z.object({})' };
  }

  const lines = fields
    .map((f) => `  ${safeKey(f.name)}: ${zodFieldExpr(f.schema, f.required, f.description)},`)
    .join('\n');

  return { fields, source: `z.object({\n${lines}\n})` };
}

/** Resolve the primary endpoint (for response-shape derivation / the HTTP client method to call). */
export function resolvePrimaryEndpoint(graph: EndpointGraph, primaryEndpointId: string): Endpoint {
  const endpoint = graph.endpoints.find((e) => e.id === primaryEndpointId);
  if (!endpoint) {
    throw new Error(`IR primaryEndpoint "${primaryEndpointId}" does not exist in the EndpointGraph`);
  }
  return endpoint;
}

export { resolveEndpoints };
