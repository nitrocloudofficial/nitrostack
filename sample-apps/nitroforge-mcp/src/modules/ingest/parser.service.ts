import { Injectable } from '@nitrostack/core';
import * as yaml from 'js-yaml';
import SwaggerParser from '@apidevtools/swagger-parser';
import {
  EndpointGraphSchema,
  type EndpointGraph,
  type Endpoint,
  type Param,
  type ParamLocation,
  type JsonSchemaNode,
  type SecurityScheme,
} from '../../contracts/endpoint-graph.schema.js';

/**
 * parser.service.ts — ① PARSE, stage 1 of the pipeline. FULLY DETERMINISTIC. NO MODEL.
 *
 * Rule #1 (non-negotiable): this parser must never guess. Field names, types,
 * required-ness and response shapes come out of the spec or they don't exist.
 * Anything that can't be resolved throws loudly — it does NOT get a plausible
 * default. A hallucinated field here is silently wrong all the way downstream
 * and the machine verifier cannot catch it.
 *
 * $ref resolution and circular-reference handling is delegated to
 * @apidevtools/swagger-parser's `dereference()` rather than hand-rolled —
 * writing that correctly ourselves costs hours and will still be wrong on
 * real-world specs. We still own: allOf flattening into our own JsonSchemaNode
 * shape, and refusing (not guessing at) oneOf/anyOf.
 *
 * Scope (deliberate, per team brief §6): we support 2-3 pre-vetted OpenAPI 3.0
 * specs, not arbitrary specs in the wild.
 */

export class SpecParseError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(path ? `${message} (at ${path})` : message);
    this.name = 'SpecParseError';
  }
}

type RawSpec = Record<string, any>;

@Injectable()
export class ParserService {
  /**
   * Entry point implementing IngestPort.parse(). Accepts either a URL
   * (http/https, fetched at parse time) or a raw spec body (JSON or YAML).
   */
  async parse(specUrlOrBody: string): Promise<EndpointGraph> {
    const raw = await this.loadRaw(specUrlOrBody);
    const parsedInput = this.parseRawText(raw, specUrlOrBody);
    return this.dereferenceAndBuild(parsedInput);
  }

  /** Fixture-driven variant where the body is already in hand. */
  async parseSpecBody(rawText: string): Promise<EndpointGraph> {
    const parsedInput = this.parseRawText(rawText, '<inline>');
    return this.dereferenceAndBuild(parsedInput);
  }

  // ---------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------

  private async loadRaw(specUrlOrBody: string): Promise<string> {
    const trimmed = specUrlOrBody.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const res = await fetch(trimmed);
      if (!res.ok) {
        throw new SpecParseError(`Failed to fetch spec: HTTP ${res.status} ${res.statusText}`);
      }
      return res.text();
    }
    return specUrlOrBody;
  }

  private parseRawText(text: string, sourceHint: string): RawSpec {
    const trimmed = text.trim();
    try {
      if (trimmed.startsWith('{')) {
        return JSON.parse(trimmed);
      }
      const loaded = yaml.load(trimmed);
      if (typeof loaded !== 'object' || loaded === null) {
        throw new SpecParseError('Spec did not parse to an object', sourceHint);
      }
      return loaded as RawSpec;
    } catch (err) {
      if (err instanceof SpecParseError) throw err;
      throw new SpecParseError(
        `Could not parse spec as JSON or YAML: ${(err as Error).message}`,
        sourceHint,
      );
    }
  }

  // ---------------------------------------------------------------------
  // $ref resolution (delegated) + core transform -> EndpointGraph
  // ---------------------------------------------------------------------

  private async dereferenceAndBuild(parsedInput: RawSpec): Promise<EndpointGraph> {
    let spec: RawSpec;
    try {
      // dereference() resolves every local/external $ref in place. It
      // preserves object identity for repeated refs, and can produce
      // circular object graphs for self-referencing schemas — our own
      // parseSchemaNode() depth/seen guard below catches those rather than
      // looping forever.
      spec = (await SwaggerParser.dereference(parsedInput as any)) as RawSpec;
    } catch (err) {
      throw new SpecParseError(`Failed to resolve $refs in spec: ${(err as Error).message}`);
    }
    return this.buildGraph(spec);
  }

  private buildGraph(spec: RawSpec): EndpointGraph {
    if (!spec.openapi || !`${spec.openapi}`.startsWith('3.')) {
      throw new SpecParseError(
        `Unsupported or missing "openapi" version (got ${spec.openapi ?? 'undefined'}); only OpenAPI 3.x is supported`,
      );
    }
    if (!spec.paths || typeof spec.paths !== 'object') {
      throw new SpecParseError('Spec has no "paths" object');
    }

    const securitySchemes = this.extractSecuritySchemes(spec);
    const endpoints: Endpoint[] = [];

    for (const [path, pathItem] of Object.entries<RawSpec>(spec.paths)) {
      if (!pathItem || typeof pathItem !== 'object') {
        throw new SpecParseError('Path item is not an object', path);
      }
      const pathLevelParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const op = pathItem[method];
        if (!op) continue;
        endpoints.push(this.parseOperation(path, method, op, pathLevelParams, securitySchemes));
      }
    }

    if (endpoints.length === 0) {
      throw new SpecParseError('Spec resolved to zero operations — nothing to parse');
    }

    const graph: EndpointGraph = {
      source: {
        url: spec.servers?.[0]?.url ?? '',
        title: spec.info?.title ?? 'Untitled API',
        version: spec.info?.version ?? '0.0.0',
      },
      securitySchemes,
      endpoints,
    };

    const result = EndpointGraphSchema.safeParse(graph);
    if (!result.success) {
      throw new SpecParseError(
        `Parser produced a graph that violates the frozen contract: ${result.error.message}`,
      );
    }
    return result.data;
  }

  private parseOperation(
    path: string,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    op: RawSpec,
    pathLevelParams: RawSpec[],
    securitySchemes: Record<string, SecurityScheme>,
  ): Endpoint {
    const id = `${method.toUpperCase()} ${path}`;
    // $refs are already resolved by SwaggerParser.dereference — parameters
    // here are plain objects, no $ref hops left to chase.
    const allParams = [...pathLevelParams, ...(Array.isArray(op.parameters) ? op.parameters : [])].map(
      (p) => this.parseParam(p, id),
    );

    const pathParams = allParams.filter((p) => p.in === 'path');
    const queryParams = allParams.filter((p) => p.in === 'query');

    const placeholders = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    for (const ph of placeholders) {
      if (!pathParams.some((p) => p.name === ph)) {
        throw new SpecParseError(
          `Path placeholder "{${ph}}" has no matching parameter definition`,
          id,
        );
      }
    }

    const bodySchema = this.parseRequestBody(op, id);
    const responseSchema = this.parseResponseSchema(op, id);
    const security = this.parseOperationSecurity(op, securitySchemes, id);

    return {
      id,
      method,
      path,
      summary: op.summary ?? op.operationId ?? undefined,
      tags: Array.isArray(op.tags) ? op.tags : [],
      pathParams,
      queryParams,
      bodySchema,
      responseSchema,
      security,
    };
  }

  private parseParam(p: RawSpec, opId: string): Param {
    if (!p.name || !p.in) {
      throw new SpecParseError('Parameter missing "name" or "in"', opId);
    }
    const loc: ParamLocation = p.in;
    if (!['path', 'query', 'header', 'cookie'].includes(loc)) {
      throw new SpecParseError(`Unsupported parameter location "${p.in}"`, opId);
    }
    const schema = p.schema
      ? this.parseSchemaNode(p.schema, `${opId} param ${p.name}`)
      : { type: 'string' as const };
    return {
      name: p.name,
      in: loc,
      required: loc === 'path' ? true : Boolean(p.required),
      schema,
      description: p.description,
    };
  }

  private parseRequestBody(op: RawSpec, opId: string): JsonSchemaNode | null {
    const rb = op.requestBody;
    if (!rb) return null;
    const jsonContent = rb.content?.['application/json'];
    if (!jsonContent?.schema) {
      throw new SpecParseError(
        'requestBody present but has no application/json schema to derive fields from',
        opId,
      );
    }
    return this.parseSchemaNode(jsonContent.schema, `${opId} requestBody`);
  }

  private parseResponseSchema(op: RawSpec, opId: string): JsonSchemaNode | null {
    const responses = op.responses ?? {};
    const successKey =
      Object.keys(responses).find((k) => /^2\d\d$/.test(k)) ?? (responses.default ? 'default' : undefined);
    if (!successKey) return null;
    const response = responses[successKey];
    const jsonContent = response.content?.['application/json'];
    if (!jsonContent?.schema) return null;
    return this.parseSchemaNode(jsonContent.schema, `${opId} response`);
  }

  private parseOperationSecurity(
    op: RawSpec,
    securitySchemes: Record<string, SecurityScheme>,
    opId: string,
  ): string[] {
    const secArr: RawSpec[] | undefined = op.security;
    if (!secArr || secArr.length === 0) return [];
    const names = new Set<string>();
    for (const requirement of secArr) {
      for (const name of Object.keys(requirement)) {
        if (!securitySchemes[name]) {
          throw new SpecParseError(
            `Security requirement "${name}" has no matching securityScheme definition`,
            opId,
          );
        }
        names.add(name);
      }
    }
    return [...names];
  }

  private extractSecuritySchemes(spec: RawSpec): Record<string, SecurityScheme> {
    const raw = spec.components?.securitySchemes ?? {};
    const out: Record<string, SecurityScheme> = {};
    for (const [name, def] of Object.entries<RawSpec>(raw)) {
      if (!def.type) {
        throw new SpecParseError('securityScheme missing "type"', `components.securitySchemes.${name}`);
      }
      out[name] = { type: def.type, scheme: def.scheme, in: def.in, name: def.name };
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // allOf flattening + oneOf/anyOf refusal. $refs are already resolved by
  // this point, so there's no ref-chasing left here — only shape decisions.
  // ---------------------------------------------------------------------

  private parseSchemaNode(node: RawSpec, context: string, depth = 0, seen = new Set<RawSpec>()): JsonSchemaNode {
    if (depth > 12) {
      throw new SpecParseError(
        'Schema nesting exceeded safety depth (12) — likely a circular schema',
        context,
      );
    }
    if (node && typeof node === 'object') {
      if (seen.has(node)) {
        throw new SpecParseError('Circular schema reference detected', context);
      }
      seen = new Set(seen).add(node);
    }

    if (Array.isArray(node.allOf)) {
      const merged: JsonSchemaNode = { type: 'object', properties: {}, required: [] };
      for (const member of node.allOf) {
        const parsedMember = this.parseSchemaNode(member, `${context} allOf`, depth + 1, seen);
        if (parsedMember.type && parsedMember.type !== 'object') {
          throw new SpecParseError('allOf member is not an object schema — cannot flatten', context);
        }
        merged.properties = { ...merged.properties, ...(parsedMember.properties ?? {}) };
        merged.required = [...(merged.required ?? []), ...(parsedMember.required ?? [])];
      }
      return merged;
    }

    if (node.oneOf || node.anyOf) {
      throw new SpecParseError(
        'oneOf/anyOf schemas are out of scope for this parser (see file header) — pick a pre-vetted spec that avoids them',
        context,
      );
    }

    const out: JsonSchemaNode = {};
    if (node.type) out.type = node.type;
    if (node.format) out.format = node.format;
    if (node.enum) out.enum = node.enum;
    if (node.nullable !== undefined) out.nullable = node.nullable;
    if (node.description) out.description = node.description;

    if (node.type === 'object' || node.properties) {
      out.type = 'object';
      out.properties = {};
      for (const [key, propNode] of Object.entries<RawSpec>(node.properties ?? {})) {
        out.properties[key] = this.parseSchemaNode(propNode, `${context}.${key}`, depth + 1, seen);
      }
      if (Array.isArray(node.required)) out.required = node.required;
    }

    if (node.type === 'array') {
      if (!node.items) {
        throw new SpecParseError('array schema missing "items"', context);
      }
      out.items = this.parseSchemaNode(node.items, `${context}[]`, depth + 1, seen);
    }

    if (!out.type) {
      throw new SpecParseError('Schema node has no resolvable "type"', context);
    }

    return out;
  }
}
