import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataSpilloverInterceptor } from '../data-spillover.interceptor.js';
import { MemorySpilloverStore } from '../spillover/memory-spillover.store.js';
import { SpilloverEnvelopeSchema } from '../spillover/types.js';

describe('DataSpilloverInterceptor (NITRO-105-M3)', () => {
  let store: MemorySpilloverStore;
  let interceptor: DataSpilloverInterceptor;
  const mockContext = { logger: { info: () => {}, warn: () => {}, error: () => {} } } as any;

  beforeEach(() => {
    store = new MemorySpilloverStore();
    // 500 bytes threshold for testing
    interceptor = new DataSpilloverInterceptor({
      maxPayloadBytes: 500,
      storage: store,
      previewItems: 2,
      previewStringChars: 50,
    });
  });

  it('passes small payload through completely unmodified', async () => {
    const smallPayload = { items: [1, 2, 3], status: 'ok' };
    const next = async () => smallPayload;

    const result = await interceptor.intercept(mockContext, next);
    expect(result).toBe(smallPayload);
    expect(result).not.toHaveProperty('_spillover');
  });

  it('passes null and undefined results through unmodified', async () => {
    expect(await interceptor.intercept(mockContext, async () => null)).toBeNull();
    expect(await interceptor.intercept(mockContext, async () => undefined)).toBeUndefined();
  });

  it('spills over large array, returns envelope with preview and stores raw data', async () => {
    // Generate 50 items exceeding 500 bytes
    const largePayload = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `Entity Record #${i} with extended description text to inflate payload size`,
    }));
    const next = async () => largePayload;

    const result = (await interceptor.intercept(mockContext, next)) as any;

    expect(result._spillover).toBe(true);
    expect(result.resourceUri).toMatch(/^resource:\/\/data-spillover\/spill-/);
    expect(result.totalItems).toBe(50);
    expect(result.preview.length).toBe(2);
    expect(result.summary).toContain('50 items');
    expect(result.hint).toContain(result.resourceUri);

    // Validate with Zod schema
    const parsed = SpilloverEnvelopeSchema.safeParse(result);
    expect(parsed.success).toBe(true);

    // Verify stored content in backing store
    const spilloverId = result.resourceUri.replace('resource://data-spillover/', '');
    const record = await store.get(spilloverId);
    expect(record).toBeDefined();
    expect(record?.mimeType).toBe('application/json');
    expect(JSON.parse(record!.data)).toEqual(largePayload);
  });

  it('spills over large string text payload with truncated preview', async () => {
    const largeString = 'A quick brown fox jumps over the lazy dog. '.repeat(30); // ~1300 chars
    const next = async () => largeString;

    const result = (await interceptor.intercept(mockContext, next)) as any;

    expect(result._spillover).toBe(true);
    expect(result.mimeType).toBe('text/plain');
    expect(result.summary).toContain('Text payload');
    expect(typeof result.preview).toBe('string');
    expect(result.preview).toContain('... [truncated]');

    const spilloverId = result.resourceUri.replace('resource://data-spillover/', '');
    const record = await store.get(spilloverId);
    expect(record).toBeDefined();
    expect(record?.data).toBe(largeString);
  });

  it('spills over large plain object dictionary with truncated top-level keys', async () => {
    const largeObj: Record<string, any> = {};
    for (let i = 0; i < 20; i++) {
      largeObj[`field_${i}`] = `Very long value for property ${i} to easily exceed threshold limit`;
    }
    const next = async () => largeObj;

    const result = (await interceptor.intercept(mockContext, next)) as any;

    expect(result._spillover).toBe(true);
    expect(result.totalItems).toBe(20);
    expect(Object.keys(result.preview).length).toBe(2); // previewItems = 2
    expect(result.summary).toContain('Object with 20 top-level fields');

    const spilloverId = result.resourceUri.replace('resource://data-spillover/', '');
    const record = await store.get(spilloverId);
    expect(record).toBeDefined();
    expect(JSON.parse(record!.data)).toEqual(largeObj);
  });

  it('does not re-inline a huge nested value inside an object preview', async () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      note: 'x'.repeat(80),
    }));
    const next = async () => ({ rows });

    const result = (await interceptor.intercept(mockContext, next)) as any;

    expect(result._spillover).toBe(true);
    const previewText = JSON.stringify(result.preview);
    const originalBytes = Buffer.byteLength(JSON.stringify({ rows }), 'utf8');
    expect(previewText.length).toBeLessThan(500);
    expect(previewText).not.toContain('x'.repeat(80));
    expect(Buffer.byteLength(previewText, 'utf8')).toBeLessThan(originalBytes);
  });

  it('stores the caller session on the spillover record', async () => {
    const next = async () => 'y'.repeat(800);
    const result = (await interceptor.intercept(
      { ...mockContext, sessionId: 'sess-owner' },
      next,
    )) as any;

    const spilloverId = result.resourceUri.replace('resource://data-spillover/', '');
    const record = await store.get(spilloverId);
    expect(record?.sessionId).toBe('sess-owner');
  });

  it('handles Buffer payloads as application/octet-stream', async () => {
    const largeBuffer = Buffer.alloc(1000, 0x42); // 1000 bytes
    const next = async () => largeBuffer;

    const result = (await interceptor.intercept(mockContext, next)) as any;

    expect(result._spillover).toBe(true);
    expect(result.mimeType).toBe('application/octet-stream');

    const spilloverId = result.resourceUri.replace('resource://data-spillover/', '');
    const record = await store.get(spilloverId);
    expect(record).toBeDefined();
    expect(record?.data).toBe(largeBuffer.toString('base64'));
  });

  it('passes through circular / non-serializable objects gracefully', async () => {
    const circular: any = { a: 1 };
    circular.self = circular;
    const next = async () => circular;

    const result = await interceptor.intercept(mockContext, next);
    expect(result).toBe(circular);
    expect(result).not.toHaveProperty('_spillover');
  });

  it('supports configure() static factory for decorator usage', async () => {
    const ConfiguredClass = DataSpilloverInterceptor.configure({
      maxPayloadBytes: 100,
      storage: store,
    });

    const instance = new ConfiguredClass();
    expect(instance).toBeInstanceOf(DataSpilloverInterceptor);

    const largeData = { text: 'a'.repeat(200) };
    const result = (await instance.intercept(mockContext, async () => largeData)) as any;

    expect(result._spillover).toBe(true);
  });
});
