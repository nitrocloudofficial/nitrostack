import { describe, expect, it } from 'vitest';
import {
  buildSuccessEnvelope,
  buildErrorEnvelope,
  dependencyUnavailableEnvelope,
  CONTRACT_VERSION,
} from '../../src/domain/response-envelope.js';

describe('response envelope (hm.v1)', () => {
  it('builds a success envelope with contract fields and merged data at the top level', () => {
    const envelope = buildSuccessEnvelope('HIT', { count: 2, fixes: ['a', 'b'] });

    expect(envelope.contractVersion).toBe(CONTRACT_VERSION);
    expect(envelope.ok).toBe(true);
    expect(envelope.status).toBe('HIT');
    expect(envelope.warnings).toEqual([]);
    expect(typeof envelope.requestId).toBe('string');
    expect(envelope.requestId.length).toBeGreaterThan(0);
    expect(envelope.count).toBe(2);
    expect(envelope.fixes).toEqual(['a', 'b']);
  });

  it('carries warnings through unchanged', () => {
    const envelope = buildSuccessEnvelope('DEGRADED', { count: 0 }, ['lexical fallback in effect']);
    expect(envelope.warnings).toEqual(['lexical fallback in effect']);
  });

  it('generates a distinct requestId per call', () => {
    const a = buildSuccessEnvelope('OK', {});
    const b = buildSuccessEnvelope('OK', {});
    expect(a.requestId).not.toBe(b.requestId);
  });

  it('builds an error envelope with ok:false and no data fields', () => {
    const envelope = buildErrorEnvelope('NOT_FOUND', {
      code: 'KNOWLEDGE_CARD_NOT_FOUND',
      message: "Knowledge card 'x' not found.",
      retryable: false,
    });

    expect(envelope.contractVersion).toBe(CONTRACT_VERSION);
    expect(envelope.ok).toBe(false);
    expect(envelope.status).toBe('NOT_FOUND');
    expect(envelope.error).toEqual({
      code: 'KNOWLEDGE_CARD_NOT_FOUND',
      message: "Knowledge card 'x' not found.",
      retryable: false,
    });
    expect((envelope as Record<string, unknown>).data).toBeUndefined();
  });

  it('dependencyUnavailableEnvelope produces a retryable DEPENDENCY_UNAVAILABLE error', () => {
    const envelope = dependencyUnavailableEnvelope('Elasticsearch is not configured.');
    expect(envelope.ok).toBe(false);
    expect(envelope.status).toBe('DEPENDENCY_UNAVAILABLE');
    expect(envelope.error.code).toBe('DEPENDENCY_UNAVAILABLE');
    expect(envelope.error.retryable).toBe(true);
    expect(envelope.error.message).toBe('Elasticsearch is not configured.');
  });
});
