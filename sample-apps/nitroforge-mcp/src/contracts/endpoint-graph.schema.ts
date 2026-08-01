import { z } from 'zod';

/**
 * endpoint-graph.schema.ts — W1 produces this. FROZEN AT H1.
 *
 * Output of stage ① PARSE (deterministic, no model). This is the
 * structurally-typed, hallucination-proof representation of an OpenAPI
 * spec that stage ② PLAN (the LLM) reasons over, and that the emitter
 * (W2) derives real Zod `inputSchema`s from — never the model.
 */

export const ParamLocationSchema = z.enum(['path', 'query', 'header', 'cookie']);
export type ParamLocation = z.infer<typeof ParamLocationSchema>;

/**
 * A minimal, self-referential JSON-Schema node. We only model the subset
 * OpenAPI/JSON-Schema features we actually need to derive Zod types and
 * widget field mappings from — deliberately not a full JSON-Schema AST.
 */
export type JsonSchemaNode = {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  format?: string;
  enum?: (string | number)[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode;
  nullable?: boolean;
  description?: string;
};

export const JsonSchemaNode: z.ZodType<JsonSchemaNode> = z.lazy(() =>
  z.object({
    type: z.enum(['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']).optional(),
    format: z.string().optional(),
    enum: z.array(z.union([z.string(), z.number()])).optional(),
    properties: z.record(JsonSchemaNode).optional(),
    required: z.array(z.string()).optional(),
    items: JsonSchemaNode.optional(),
    nullable: z.boolean().optional(),
    description: z.string().optional(),
  }),
);

export const ParamSchema = z.object({
  name: z.string(),
  in: ParamLocationSchema,
  required: z.boolean(),
  schema: JsonSchemaNode,
  description: z.string().optional(),
});
export type Param = z.infer<typeof ParamSchema>;

export const SecuritySchemeSchema = z.object({
  type: z.enum(['apiKey', 'http', 'oauth2', 'openIdConnect']),
  scheme: z.string().optional(), // e.g. 'bearer' for http
  in: z.enum(['header', 'query', 'cookie']).optional(), // for apiKey
  name: z.string().optional(), // header/query param name for apiKey
});
export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;

export const EndpointSchema = z.object({
  /** Stable identity, e.g. "GET /v1/customers/{id}". Used verbatim in IR `composes`. */
  id: z.string(),
  method: z.enum(['get', 'post', 'put', 'patch', 'delete']),
  path: z.string(),
  summary: z.string().optional(),
  tags: z.array(z.string()),
  pathParams: z.array(ParamSchema),
  queryParams: z.array(ParamSchema),
  bodySchema: JsonSchemaNode.nullable(),
  responseSchema: JsonSchemaNode.nullable(),
  security: z.array(z.string()), // keys into EndpointGraph.securitySchemes
});
export type Endpoint = z.infer<typeof EndpointSchema>;

export const EndpointGraphSchema = z.object({
  source: z.object({
    url: z.string(),
    title: z.string(),
    version: z.string(),
  }),
  securitySchemes: z.record(SecuritySchemeSchema),
  endpoints: z.array(EndpointSchema),
});
export type EndpointGraph = z.infer<typeof EndpointGraphSchema>;
