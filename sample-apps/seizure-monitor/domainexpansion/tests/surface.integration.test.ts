import { describe, it, expect } from 'vitest';
import { TestingModule, createMockContext } from '@nitrostack/core/testing';
import { SurfaceStateService } from '../src/modules/surface/state.js';
import { SurfaceTools } from '../src/modules/surface/surface.tools.js';

/**
 * Exercises the real MCP tool layer (DI, zod validation, ToolResult shaping)
 * end to end, not just the engine functions underneath — the Stage 8 gate
 * this build pack asks for.
 */
async function buildTools(): Promise<SurfaceTools> {
  const module = TestingModule.create().addProvider(SurfaceStateService).addProvider(SurfaceTools).compile();
  return module.get(SurfaceTools);
}

describe('MCP surface: SurfaceTools', () => {
  it('scan_authorization_risks on empty state returns NO_LOGS_INGESTED with a recovery nextAction', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const result = await tools.scanAuthorizationRisks({}, ctx);
    expect(result).toEqual({
      ok: false,
      code: 'NO_LOGS_INGESTED',
      message: 'No access logs have been ingested yet.',
      nextAction: "call ingest_access_logs with source 'fixture', fixtureId 'acme-prod' first",
    });
  });

  it('full pipeline: ingest fixture -> import spec -> scan finds the ground-truth results via the real tool layer', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();

    const ingestResult = await tools.ingestAccessLogs({ source: 'fixture', fixtureId: 'acme-prod' }, ctx);
    expect(ingestResult.ok).toBe(true);
    if (!ingestResult.ok) throw new Error('unreachable');
    expect(ingestResult.data.counts).toBe(8252);
    expect(ingestResult.data.templatesDiscovered).toBe(34);
    expect(ingestResult.data.rejected).toEqual({ count: 0, reasons: [] });

    const specResult = await tools.importOpenApiSpec({ source: 'fixture', fixtureId: 'acme-openapi' }, ctx);
    expect(specResult.ok).toBe(true);
    if (!specResult.ok) throw new Error('unreachable');
    expect(specResult.data.documentedCount).toBe(27);

    const scanResult = await tools.scanAuthorizationRisks({}, ctx);
    expect(scanResult.ok).toBe(true);
    if (!scanResult.ok) throw new Error('unreachable');
    const findings = scanResult.data;

    const exportFindings = findings.filter((f) => f.template === '/internal/v0/export/customers');
    expect(exportFindings.every((f) => f.severity === 'CRITICAL')).toBe(true);
    expect(exportFindings.map((f) => f.rule).sort()).toEqual(['R3_AUTH_GAP', 'R5_SHADOW']);

    expect(findings.some((f) => f.rule === 'R7_LOG_INJECTION')).toBe(true);
    expect(findings.some((f) => f.template === '/api/v1/admin/feature-flags')).toBe(false);
    expect(findings.some((f) => f.template === '/api/v1/auth/login')).toBe(false);

    // get_finding_evidence returns neutralised records, wrapped in <untrusted>.
    const topFinding = findings[0];
    const evidenceResult = await tools.getFindingEvidence({ findingId: topFinding.id }, ctx);
    expect(evidenceResult.ok).toBe(true);
    if (!evidenceResult.ok) throw new Error('unreachable');
    expect(evidenceResult.data.length).toBeGreaterThan(0);
    for (const record of evidenceResult.data) {
      expect(record.path).toMatch(/^<untrusted field="path">.*<\/untrusted>$/);
      expect(record.ua).toMatch(/^<untrusted field="ua">.*<\/untrusted>$/);
    }

    // get_finding_evidence with an unknown id returns FINDING_NOT_FOUND, not a throw.
    const missing = await tools.getFindingEvidence({ findingId: 'does_not_exist' }, ctx);
    expect(missing).toEqual({
      ok: false,
      code: 'FINDING_NOT_FOUND',
      message: 'No finding with id "does_not_exist".',
      nextAction: 'call scan_authorization_risks to list current finding ids',
    });
  });

  it('inline ingestion rejects malformed records without failing the whole batch', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const good = {
      id: 'L1', ts: '2026-01-01T00:00:00.000Z', method: 'GET', path: '/a', query: null, status: 200,
      actor: { sub: 'usr_1', role: 'user' }, ip: '1.2.3.4', latencyMs: 10, respBytes: 100, ua: 'test',
    };
    const bad = { id: 'L2' }; // missing required fields
    const result = await tools.ingestAccessLogs({ source: 'inline', records: [good, bad] }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.counts).toBe(1);
    expect(result.data.rejected.count).toBe(1);
    expect(result.data.rejected.reasons.length).toBe(1);
  });

  it('inline ingestion over 50,000 records returns PAYLOAD_TOO_LARGE', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const records = Array.from({ length: 50_001 }, () => ({}));
    const result = await tools.ingestAccessLogs({ source: 'inline', records }, ctx);
    expect(result).toMatchObject({ ok: false, code: 'PAYLOAD_TOO_LARGE' });
  });

  it('ingest_access_logs with an unknown fixtureId returns FIXTURE_NOT_FOUND', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const result = await tools.ingestAccessLogs({ source: 'fixture', fixtureId: 'does-not-exist' }, ctx);
    expect(result).toMatchObject({ ok: false, code: 'FIXTURE_NOT_FOUND' });
  });

  it('ingests real Apache/nginx Combined Log Format text end to end through the real tool layer', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const rawText = [
      '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pub/image.gif HTTP/1.0" 200 2326 "-" "Mozilla/4.08"',
      '10.0.0.9 - - [10/Oct/2000:13:55:37 -0700] "POST /login HTTP/1.1" 401 100 "-" "curl/7.1"',
      'not a valid log line at all',
    ].join('\n');

    const result = await tools.ingestAccessLogs({ source: 'combined-log-format', rawText }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.counts).toBe(2);
    expect(result.data.rejected.count).toBe(1);
    expect(result.data.templatesDiscovered).toBeGreaterThan(0);

    // The ingested data is real usable state — scan_authorization_risks
    // runs against it without error (findings themselves are incidental;
    // two lines is far too little volume to trip anything).
    const scan = await tools.scanAuthorizationRisks({}, ctx);
    expect(scan.ok).toBe(true);
  });

  it('ingest_access_logs with source combined-log-format and no rawText returns INVALID_INPUT', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const result = await tools.ingestAccessLogs({ source: 'combined-log-format' }, ctx);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
  });

  it('ingests real AWS ALB access log text end to end through the real tool layer', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const rawText = [
      'https 2018-11-30T22:23:00.186641Z app/my-loadbalancer/50dc6c495c0c9188 192.168.131.39:2817 10.0.0.1:80 0.000 0.001 0.000 200 200 34 366 "GET https://www.example.com/orders/1 HTTP/1.1" "curl/7.46.0" - - arn:x "Root=1" "www.example.com" "-" 1 2018-11-30T22:22:48.364000Z "forward" "-" "-" "10.0.0.1:80" "200" "-" "-"',
      'not an alb log line',
    ].join('\n');

    const result = await tools.ingestAccessLogs({ source: 'aws-alb', rawText }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.counts).toBe(1);
    expect(result.data.rejected.count).toBe(1);

    const scan = await tools.scanAuthorizationRisks({}, ctx);
    expect(scan.ok).toBe(true);
  });

  it('ingest_access_logs with source aws-alb and no rawText returns INVALID_INPUT', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const result = await tools.ingestAccessLogs({ source: 'aws-alb' }, ctx);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
  });

  it('import_registry_spec reports logsIngested:false and routes suggestedNext to ingest_access_logs when nothing is ingested yet', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const result = await tools.importRegistrySpec({ provider: 'stripe.com' }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.logsIngested).toBe(false);
    expect(result.data.title).toBe('Stripe API');
    expect(result.suggestedNext?.[0]).toMatchObject({ tool: 'ingest_access_logs' });
  });

  it('import_registry_spec reports logsIngested:true and routes suggestedNext to get_api_topology once logs exist', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    await tools.ingestAccessLogs({ source: 'fixture', fixtureId: 'acme-prod' }, ctx);
    const result = await tools.importRegistrySpec({ provider: 'stripe.com' }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.logsIngested).toBe(true);
    expect(result.suggestedNext?.[0]).toMatchObject({ tool: 'get_api_topology' });
  });

  it('reconstruct_attack_session on empty state returns NO_LOGS_INGESTED', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    const result = await tools.reconstructAttackSessionTool({ actorSub: 'usr_7741' }, ctx);
    expect(result).toMatchObject({ ok: false, code: 'NO_LOGS_INGESTED' });
  });

  it('reconstruct_attack_session with an unknown actor returns INVALID_INPUT, not a throw', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    await tools.ingestAccessLogs({ source: 'fixture', fixtureId: 'acme-prod' }, ctx);
    const result = await tools.reconstructAttackSessionTool({ actorSub: 'usr_does_not_exist' }, ctx);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
  });

  it('reconstruct_attack_session reconstructs usr_7741\'s real enumeration burst through the real tool layer', async () => {
    const tools = await buildTools();
    const ctx = createMockContext();
    await tools.ingestAccessLogs({ source: 'fixture', fixtureId: 'acme-prod' }, ctx);
    await tools.importOpenApiSpec({ source: 'fixture', fixtureId: 'acme-openapi' }, ctx);
    const result = await tools.reconstructAttackSessionTool({ actorSub: 'usr_7741' }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.findings.some((f) => f.rule === 'R2_ENUMERATION')).toBe(true);
    const docsGroup = result.data.groups.find((g) => g.template === '/api/v1/users/{userId}/documents/{docId}');
    expect(docsGroup?.distinctObjectIds).toBeGreaterThanOrEqual(60);
    // every path in the timeline is neutralised, never raw
    for (const event of result.data.events) {
      expect(event.path).toMatch(/^<untrusted field="path">.*<\/untrusted>$/);
    }
  });
});
