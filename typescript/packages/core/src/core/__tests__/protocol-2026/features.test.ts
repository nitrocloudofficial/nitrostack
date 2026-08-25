/**
 * 2026-07-28 feature mappings (cache hints, schema 2020-12, trace context,
 * extensions map, error codes, MRTR helpers). These are the NitroStack-level
 * abstractions the modern adapter consumes; they are era-agnostic and run
 * without loading the v2 engine.
 */

import { z } from 'zod';

describe('SEP-2549 cache hints', () => {
  it('maps @Cache ttl (seconds) to ttlMs with a private scope', async () => {
    const { resolveToolCacheHint } = await import('../../protocol/features/cache-hints.js');
    expect(resolveToolCacheHint({ cacheTtlSeconds: 30 })).toEqual({ ttlMs: 30000, cacheScope: 'private' });
  });

  it('prefers an explicit cacheHint over the derived ttl', async () => {
    const { resolveToolCacheHint } = await import('../../protocol/features/cache-hints.js');
    expect(resolveToolCacheHint({ cacheHint: { ttlMs: 5000, cacheScope: 'public' }, cacheTtlSeconds: 30 })).toEqual({
      ttlMs: 5000,
      cacheScope: 'public',
    });
  });

  it('maps resource cacheMaxAge (seconds) to ttlMs', async () => {
    const { resolveResourceCacheHint } = await import('../../protocol/features/cache-hints.js');
    expect(resolveResourceCacheHint({ metadata: { cacheable: true, cacheMaxAge: 60 } })).toEqual({
      ttlMs: 60000,
      cacheScope: 'private',
    });
  });

  it('returns undefined when there is no caching signal', async () => {
    const { resolveToolCacheHint, resolveResourceCacheHint } = await import('../../protocol/features/cache-hints.js');
    expect(resolveToolCacheHint({})).toBeUndefined();
    expect(resolveResourceCacheHint({})).toBeUndefined();
  });

  it('normalizes/clamps invalid hint values', async () => {
    const { normalizeHint } = await import('../../protocol/features/cache-hints.js');
    expect(normalizeHint({ ttlMs: -5, cacheScope: 'bogus' as never })).toEqual({});
    expect(normalizeHint({ ttlMs: 12.9, cacheScope: 'public' })).toEqual({ ttlMs: 12, cacheScope: 'public' });
  });
});

describe('SEP-2106 JSON Schema 2020-12', () => {
  it('keeps composition (oneOf) and $defs for an input schema on the modern path', async () => {
    const { convertToModernJsonSchema } = await import('../../protocol/features/schema.js');
    const schema = z.object({
      choice: z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
    });
    const json = await convertToModernJsonSchema(schema, { root: 'input' });
    // Root stays an object per spec...
    expect(json.type).toBe('object');
    // ...and the 2020-12 dialect is advertised.
    expect(json.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    // Composition survives somewhere in the tree (union -> anyOf/oneOf).
    const serialized = JSON.stringify(json);
    expect(serialized).toMatch(/anyOf|oneOf/);
  });

  it('leaves an output schema unrestricted (not forced to object)', async () => {
    const { convertToModernJsonSchema } = await import('../../protocol/features/schema.js');
    const json = await convertToModernJsonSchema(z.array(z.string()), { root: 'output' });
    expect(json.type).toBe('array');
  });

  it('forces object root for input even when given a non-object schema', async () => {
    const { convertToModernJsonSchema } = await import('../../protocol/features/schema.js');
    const json = await convertToModernJsonSchema({ type: 'string' }, { root: 'input' });
    expect(json.type).toBe('object');
  });

  it('bounds pathological schema depth (DoS guard)', async () => {
    const { boundSchemaDepth, MAX_SCHEMA_DEPTH } = await import('../../protocol/features/schema.js');
    // Build a nesting deeper than the max.
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < MAX_SCHEMA_DEPTH + 10; i++) {
      deep = { nested: deep };
    }
    const bounded = boundSchemaDepth(deep) as Record<string, unknown>;
    // Walk down until we hit the truncation sentinel {}.
    let cur: unknown = bounded;
    let depth = 0;
    while (cur && typeof cur === 'object' && 'nested' in (cur as object)) {
      cur = (cur as { nested: unknown }).nested;
      depth++;
      if (depth > MAX_SCHEMA_DEPTH + 5) break;
    }
    expect(depth).toBeLessThanOrEqual(MAX_SCHEMA_DEPTH);
  });
});

describe('SEP-414 W3C trace context', () => {
  it('extracts bare trace keys from an envelope', async () => {
    const { extractTraceContext } = await import('../../protocol/features/trace-context.js');
    expect(
      extractTraceContext({ traceparent: '00-abc-def-01', tracestate: 'x=1', baggage: 'k=v' }),
    ).toEqual({ traceparent: '00-abc-def-01', tracestate: 'x=1', baggage: 'k=v' });
  });

  it('extracts reverse-DNS trace keys', async () => {
    const { extractTraceContext } = await import('../../protocol/features/trace-context.js');
    expect(
      extractTraceContext({ 'io.modelcontextprotocol/traceparent': '00-a-b-01' }),
    ).toEqual({ traceparent: '00-a-b-01' });
  });

  it('returns undefined when no trace keys present', async () => {
    const { extractTraceContext } = await import('../../protocol/features/trace-context.js');
    expect(extractTraceContext({ something: 'else' })).toBeUndefined();
    expect(extractTraceContext(undefined)).toBeUndefined();
  });
});

describe('SEP-2133 extensions map', () => {
  it('advertises app + tasks extensions when signalled', async () => {
    const { buildExtensionsMap, EXT_APP, EXT_TASKS } = await import('../../protocol/features/extensions.js');
    const map = buildExtensionsMap({ hasApps: true, hasTasks: true });
    expect(map[EXT_APP]).toBeDefined();
    expect(map[EXT_TASKS]).toBeDefined();
  });

  it('omits extensions that are not present', async () => {
    const { buildExtensionsMap, EXT_APP, EXT_TASKS } = await import('../../protocol/features/extensions.js');
    const map = buildExtensionsMap({ hasApps: false, hasTasks: false });
    expect(map[EXT_APP]).toBeUndefined();
    expect(map[EXT_TASKS]).toBeUndefined();
  });

  it('merges author-declared extensions verbatim', async () => {
    const { buildExtensionsMap } = await import('../../protocol/features/extensions.js');
    const map = buildExtensionsMap({
      hasApps: false,
      hasTasks: false,
      declared: { 'com.example/custom': { version: '1' } },
    });
    expect(map['com.example/custom']).toEqual({ version: '1' });
  });
});

describe('SEP-2164 error mapping (modern path)', () => {
  it('maps a missing resource to -32602 (Invalid Params), not -32002', async () => {
    const { mapToJsonRpcError, JSON_RPC } = await import('../../protocol/features/errors.js');
    const { ResourceNotFoundError } = await import('../../errors.js');
    const mapped = mapToJsonRpcError(new ResourceNotFoundError('mcp://missing'));
    expect(mapped.code).toBe(JSON_RPC.INVALID_PARAMS);
    expect(mapped.code).toBe(-32602);
  });

  it('maps validation errors to -32602 with details', async () => {
    const { mapToJsonRpcError } = await import('../../protocol/features/errors.js');
    const { ValidationError } = await import('../../errors.js');
    const mapped = mapToJsonRpcError(new ValidationError('bad', { field: 'x' }));
    expect(mapped.code).toBe(-32602);
    expect(mapped.data).toEqual({ field: 'x' });
  });

  it('maps unknown tool/prompt to -32601 (Method Not Found)', async () => {
    const { mapToJsonRpcError } = await import('../../protocol/features/errors.js');
    const { ToolNotFoundError, PromptNotFoundError } = await import('../../errors.js');
    expect(mapToJsonRpcError(new ToolNotFoundError('x')).code).toBe(-32601);
    expect(mapToJsonRpcError(new PromptNotFoundError('y')).code).toBe(-32601);
  });

  it('maps unexpected errors to -32603 (Internal Error)', async () => {
    const { mapToJsonRpcError } = await import('../../protocol/features/errors.js');
    expect(mapToJsonRpcError(new Error('boom')).code).toBe(-32603);
    expect(mapToJsonRpcError('nope').code).toBe(-32603);
  });

  it('exposes the SEP-2243 header/body mismatch code', async () => {
    const { JSON_RPC } = await import('../../protocol/features/errors.js');
    expect(JSON_RPC.HEADER_BODY_MISMATCH).toBe(-32020);
  });
});

describe('SEP-2322 MRTR helpers', () => {
  it('produces an input-required marker recognized by the type guard', async () => {
    const { inputRequired, isInputRequired } = await import('../../protocol/features/mrtr.js');
    const result = inputRequired({
      requests: [{ id: 'confirm', message: 'Proceed?', schema: { type: 'boolean' } }],
      requestState: { pending: true },
      message: 'need input',
    });
    expect(isInputRequired(result)).toBe(true);
    expect(result.inputRequests).toHaveLength(1);
    expect(result.requestState).toEqual({ pending: true });
  });

  it('does not misidentify ordinary results', async () => {
    const { isInputRequired } = await import('../../protocol/features/mrtr.js');
    expect(isInputRequired({ content: [] })).toBe(false);
    expect(isInputRequired('text')).toBe(false);
    expect(isInputRequired(undefined)).toBe(false);
  });

  it('reads previously-supplied answers (bare and wrapped)', async () => {
    const { acceptedContent } = await import('../../protocol/features/mrtr.js');
    expect(acceptedContent({ confirm: true }, 'confirm')).toBe(true);
    expect(acceptedContent({ confirm: { content: 'yes' } }, 'confirm')).toBe('yes');
    expect(acceptedContent({}, 'confirm')).toBeUndefined();
    expect(acceptedContent(undefined, 'confirm')).toBeUndefined();
  });
});
