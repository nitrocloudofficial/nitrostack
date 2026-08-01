import { describe, it, expect } from 'vitest';
import { buildTopology, aggregateEndpoints } from '../src/engine/topology.js';
import type { AccessLogRecord, Finding } from '../src/engine/types.js';

function rec(overrides: Partial<AccessLogRecord>): AccessLogRecord {
  return {
    id: 'L1',
    ts: '2026-01-01T00:00:00.000Z',
    method: 'GET',
    path: '/api/v1/orders/1001',
    query: null,
    status: 200,
    actor: { sub: 'usr_1', role: 'user' },
    ip: '1.2.3.4',
    latencyMs: 10,
    respBytes: 100,
    ua: 'test',
    ...overrides,
  };
}

describe('aggregateEndpoints', () => {
  it('aggregates methods, status counts, and distinct actors per template', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/api/v1/orders/1001', status: 200, actor: { sub: 'usr_1', role: 'user' } }),
      rec({ id: 'L2', path: '/api/v1/orders/1002', status: 200, actor: { sub: 'usr_2', role: 'user' } }),
      rec({ id: 'L3', path: '/api/v1/orders/1003', status: 403, actor: { sub: 'usr_1', role: 'user' } }),
    ];
    const [ep] = aggregateEndpoints(records, []);
    expect(ep.template).toBe('/api/v1/orders/{orderId}');
    expect(ep.requestCount).toBe(3);
    expect(ep.statusCounts).toEqual({ '200': 2, '403': 1 });
    expect(ep.distinctActors).toBe(2);
    expect(ep.methods).toEqual(['GET']);
  });

  it('never uses the clock: firstSeen/lastSeen come only from record timestamps', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', ts: '2020-01-01T00:00:00.000Z' }),
      rec({ id: 'L2', ts: '2020-01-01T00:05:00.000Z' }),
    ];
    const [ep] = aggregateEndpoints(records, []);
    expect(ep.firstSeen).toBe('2020-01-01T00:00:00.000Z');
    expect(ep.lastSeen).toBe('2020-01-01T00:05:00.000Z');
  });
});

describe('buildTopology', () => {
  it('builds a deterministic node/edge trie sorted by (depth, id) and (from, to)', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/api/v1/orders/1001' }),
      rec({ id: 'L2', path: '/api/v1/orders' , method: 'GET'}),
    ];
    const topo = buildTopology(records, ['/api/v1/orders']);

    const ids = topo.nodes.map((n) => n.id);
    expect(ids).toEqual(['/api', '/api/v1', '/api/v1/orders', '/api/v1/orders/{orderId}']);
    // strictly non-decreasing depth
    for (let i = 1; i < topo.nodes.length; i++) {
      expect(topo.nodes[i].depth).toBeGreaterThanOrEqual(topo.nodes[i - 1].depth);
    }
    const ordersNode = topo.nodes.find((n) => n.id === '/api/v1/orders')!;
    expect(ordersNode.isEndpoint).toBe(true);
    expect(ordersNode.documented).toBe(true);
    const orderIdNode = topo.nodes.find((n) => n.id === '/api/v1/orders/{orderId}')!;
    expect(orderIdNode.isParam).toBe(true);
    expect(orderIdNode.documented).toBe(false);

    const edgePairs = topo.edges.map((e) => `${e.from}->${e.to}`);
    expect(edgePairs).toEqual([...edgePairs].sort());
  });

  it('sets stats.timeRange from records, never from the clock', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', ts: '2019-06-01T00:00:00.000Z' }),
      rec({ id: 'L2', ts: '2019-06-01T01:00:00.000Z' }),
    ];
    const topo = buildTopology(records, []);
    expect(topo.stats.timeRange).toEqual({ from: '2019-06-01T00:00:00.000Z', to: '2019-06-01T01:00:00.000Z' });
  });

  it('sets maxSeverity on the endpoint node from matching findings, taking the max', () => {
    const records: AccessLogRecord[] = [rec({ id: 'L1', path: '/api/v1/orders/1001' })];
    const findings: Finding[] = [
      { id: 'f1', rule: 'R1_CROSS_ACTOR', cwe: 'CWE-639', cweTitle: 'x', template: '/api/v1/orders/{orderId}', methods: ['GET'], severity: 'MEDIUM', score: 50, title: 't', rationale: 'r', evidence: ['L1'], evidenceUri: 'evidence://finding/f1', metrics: {}, documented: false },
      { id: 'f2', rule: 'R7_LOG_INJECTION', cwe: 'CWE-117', cweTitle: 'x', template: '/api/v1/orders/{orderId}', methods: ['GET'], severity: 'HIGH', score: 70, title: 't', rationale: 'r', evidence: ['L1'], evidenceUri: 'evidence://finding/f2', metrics: {}, documented: false },
    ];
    const topo = buildTopology(records, [], findings);
    const node = topo.nodes.find((n) => n.id === '/api/v1/orders/{orderId}')!;
    expect(node.maxSeverity).toBe('HIGH');
  });

  it('computes stats.observedEndpoints/documentedEndpoints/shadowEndpoints correctly', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/api/v1/orders/1001' }),
      rec({ id: 'L2', path: '/internal/v0/export/customers', actor: { sub: null, role: null } }),
    ];
    const topo = buildTopology(records, ['/api/v1/orders/{orderId}']);
    expect(topo.stats.observedEndpoints).toBe(2);
    expect(topo.stats.documentedEndpoints).toBe(1);
    expect(topo.stats.shadowEndpoints).toBe(1);
    expect(topo.stats.totalRequests).toBe(2);
    expect(topo.stats.distinctActors).toBe(1); // null actor excluded
  });

  it('is deterministic across repeated calls', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/api/v1/orders/1001' }),
      rec({ id: 'L2', path: '/api/v1/orders/1002' }),
    ];
    const a = buildTopology(records, []);
    const b = buildTopology(records, []);
    expect(a).toEqual(b);
  });

  it('stats.shadowEndpoints matches R5_SHADOW\'s own finding set when findings are supplied, not a naive "undocumented" count', () => {
    // No spec imported (documentedTemplates: []) -> aggregateEndpoints marks
    // every template undocumented. Simulate R5's heuristic mode flagging
    // only ONE of two undocumented templates as an actual shadow finding —
    // stats.shadowEndpoints must report 1, not 2, once findings are given.
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/internal/v1/metrics', actor: { sub: null, role: null } }),
      rec({ id: 'L2', path: '/api/v1/products/1', actor: { sub: null, role: null } }),
    ];
    const findings: Finding[] = [
      { id: 'f1', rule: 'R5_SHADOW', cwe: 'CWE-1059', cweTitle: 'x', template: '/internal/v1/metrics', methods: ['GET'], severity: 'MEDIUM', score: 49, title: 't', rationale: 'r', evidence: ['L1'], evidenceUri: 'evidence://finding/f1', metrics: {}, documented: false },
    ];
    const noFindings = buildTopology(records, []);
    expect(noFindings.stats.shadowEndpoints).toBe(2); // naive fallback: both undocumented

    const withFindings = buildTopology(records, [], findings);
    expect(withFindings.stats.shadowEndpoints).toBe(1); // matches R5's actual finding count
  });

  it('handles a bare root-path ("/") request without throwing — regression for a crash found against real NASA-HTTP traffic', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/', method: 'GET', status: 200 }),
      rec({ id: 'L2', path: '/api/v1/orders/1001' }),
    ];
    const topo = buildTopology(records, []);
    const root = topo.nodes.find((n) => n.id === '/');
    expect(root).toBeDefined();
    expect(root!.isEndpoint).toBe(true);
    expect(root!.depth).toBe(0);
    expect(root!.requestCount).toBe(1);
    expect(topo.stats.observedEndpoints).toBe(2);
  });
});
