import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { emitEvent, registerEventHandlers } from '@nitrostack/core';
import { env } from '../../src/config/env.js';
import { AuditStore, type AuditEntry } from '../../src/gateway/audit.store.js';
import { canonicalInputHash, summarizeInput } from '../../src/gateway/audit-log.interceptor.js';
import { MetricsStore } from '../../src/gateway/metrics.store.js';

function entry(index: number): AuditEntry {
  return {
    ts: new Date(0).toISOString(),
    request_id: `request-${index}`,
    tool: 'triage_get_care_options',
    subject: 'test',
    scopes: ['triage:read'],
    input_summary: { index },
    input_hash: `hash-${index}`,
    emergency_detected: false,
    urgency_tier: 'routine',
    cache_hit: false,
    external_calls: [],
    latency_ms: index,
    status: 'ok',
    error_code: null,
  };
}

describe('AuditStore', () => {
  it('redacts and bounds nested input while hashing canonical key order', () => {
    const input = {
      _meta: { 'x-api-key': 'never-log-this' },
      reason: 'x'.repeat(200),
      nested: [{ symptom: 'shortness of breath' }],
    };
    const summary = summarizeInput(input);

    expect(JSON.stringify(summary)).not.toContain('never-log-this');
    expect(summary.reason).toHaveLength(83);
    expect(summary.nested[0].symptom).toBe('shortness of breath');
    expect(canonicalInputHash({ a: 1, b: 2 })).toBe(canonicalInputHash({ b: 2, a: 1 }));
  });

  it('loads only the latest 50 entries and trims persistent logs to 5,000 lines', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vitalis-audit-'));
    const logPath = join(directory, 'audit.jsonl');
    const previousPath = env.AUDIT_LOG_PATH;
    (env as any).AUDIT_LOG_PATH = logPath;

    try {
      writeFileSync(
        logPath,
        Array.from({ length: 5_001 }, (_, index) => JSON.stringify(entry(index))).join('\n') + '\n',
      );
      const store = new AuditStore();

      expect(store.getRecentEntries()).toHaveLength(50);
      expect(store.getRecentEntries()[0].request_id).toBe('request-5000');

      store.addEntry(entry(5_001));
      const persistedLines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(persistedLines).toHaveLength(5_000);
      expect(JSON.parse(persistedLines.at(-1)!).request_id).toBe('request-5001');
    } finally {
      (env as any).AUDIT_LOG_PATH = previousPath;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('consumes audit.entry events and keeps the in-memory resource bounded', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'vitalis-audit-event-'));
    const previousPath = env.AUDIT_LOG_PATH;
    (env as any).AUDIT_LOG_PATH = join(directory, 'audit.jsonl');
    const store = new AuditStore();
    registerEventHandlers(store);

    try {
      emitEvent('audit.entry', entry(1));
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(store.getRecentEntries()[0].request_id).toBe('request-1');
    } finally {
      (env as any).AUDIT_LOG_PATH = previousPath;
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('MetricsStore', () => {
  it('tracks request errors, p50/p95 latency, cache state, and upstream failures', () => {
    const store = new MetricsStore();
    store.recordRequest('tool_a', 10);
    store.recordRequest('tool_a', 20);
    store.recordRequest('tool_a', 30, true);
    store.recordCache('tool_a', false);
    store.recordCache('tool_a', true);
    store.recordExternalCalls([
      { api: 'rxnorm', status: 200 },
      { api: 'openfda', status: 503 },
      { api: 'pubmed', status: 0 },
    ]);

    const metrics = store.getMetrics();
    expect(metrics).toMatchObject({
      total_requests: 3,
      total_errors: 1,
      p50_latency_ms: 20,
      p95_latency_ms: 30,
      cache_hits: 1,
      cache_misses: 1,
      upstream_requests: 3,
      upstream_errors: { openfda: 1, pubmed: 1 },
    });
    expect(metrics.requests_by_tool.tool_a).toBe(3);
    expect(metrics.errors_by_tool.tool_a).toBe(1);
  });
});
