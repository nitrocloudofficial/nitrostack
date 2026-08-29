import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpApplicationFactory } from '@nitrostack/core';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * End-to-end gateway coverage.
 *
 * This uses NitroStack's MCP server and in-memory transport rather than calling
 * guards/interceptors directly. That keeps the test at the same boundary used
 * by an MCP client while avoiding a network listener in the default test suite.
 */

const auditDirectory = mkdtempSync(join(tmpdir(), 'vitalis-pipeline-'));
const auditLogPath = join(auditDirectory, 'audit.jsonl');

// These must be set before AppModule is dynamically imported because env.ts
// validates and freezes the typed configuration at module evaluation time.
process.env.NODE_ENV = 'test';
process.env.VITALIS_ALLOW_ANONYMOUS_DEMO = 'false';
process.env.API_KEY_CLINICIAN = 'clinician-test-key';
process.env.API_KEY_READONLY = 'readonly-test-key';
process.env.API_KEY_ADMIN = 'admin-test-key';
process.env.JWT_SECRET = 'pipeline-test-jwt-secret-long-enough';
process.env.AUDIT_LOG_PATH = auditLogPath;

const CLINICIAN_KEY = 'clinician-test-key';
const READONLY_KEY = 'readonly-test-key';
const ADMIN_KEY = 'admin-test-key';

type TestServer = {
  mcpServer: { connect(transport: unknown): Promise<void>; close(): Promise<void> };
  tools: Map<string, any>;
  resources: Map<string, any>;
  createContext(options?: { toolName?: string; metadata?: Record<string, unknown> }): any;
};

type TestClient = Client;

let server: TestServer;
let client: TestClient;
let clientTransport: InMemoryTransport;
let jwtToken: string;

function keyMetadata(apiKey: string) {
  return { _meta: { 'x-api-key': apiKey } };
}

async function callTool(name: string, args: Record<string, unknown> = {}, apiKey?: string) {
  const argumentsWithMetadata = apiKey ? { ...args, ...keyMetadata(apiKey) } : args;
  return client.callTool({ name, arguments: argumentsWithMetadata });
}

function parseToolResult(result: Awaited<ReturnType<TestClient['callTool']>>) {
  const content = result.content[0];
  if (content?.type !== 'text') {
    throw new Error('Expected a text MCP tool result');
  }
  return JSON.parse(content.text) as Record<string, any>;
}

async function readAuditLog() {
  await new Promise<void>((resolve) => setImmediate(resolve));
  try {
    return readFileSync(auditLogPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

beforeAll(async () => {
  const { AppModule } = await import('../../src/app.module.js');
  const { signJwt } = await import('../../src/gateway/jwt.utils.js');
  server = (await McpApplicationFactory.create(AppModule)) as unknown as TestServer;
  jwtToken = signJwt({ sub: 'jwt_pipeline_user', scopes: ['triage:read'] }, 3600);

  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  clientTransport = clientSide;
  client = new Client({ name: 'vitalis-pipeline-test-client', version: '1.0.0' });

  await server.mcpServer.connect(serverSide);
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client?.close();
  await server?.mcpServer.close();
  rmSync(auditDirectory, { recursive: true, force: true });
});

describe('clinical gateway pipeline', () => {
  it('exposes the registered tools and protected audit resource through MCP', async () => {
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);

    expect(toolNames).toContain('triage_assess_symptoms');
    expect(toolNames).toContain('care_draft_referral');

    const resources = await client.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining(['vitalis://audit/recent', 'vitalis://metrics', 'health://checks', 'widget://examples']),
    );

    const widgetExamples = await client.readResource({ uri: 'widget://examples' });
    const widgetPayload = JSON.parse(widgetExamples.contents[0].text ?? '{}');
    expect(widgetPayload).toMatchObject({ count: 6, loaded: true });
    expect(widgetPayload.widgets.map((widget: any) => widget.uri)).toEqual(
      expect.arrayContaining([
        'ui://widget/next-patient-summary.html',
        'ui://widget/next-triage-result.html',
        'ui://widget/next-drug-safety-report.html',
        'ui://widget/next-trial-list.html',
        'ui://widget/next-lab-result-card.html',
        'ui://widget/next-med-reconciliation.html',
      ]),
    );
  });

  it('rejects a tool call when the API key is missing', async () => {
    const payload = parseToolResult(
      await callTool('triage_get_care_options', { urgency_tier: 'routine' }),
    );

    expect(payload).toMatchObject({ error: true, code: 'AUTH_DENIED' });
  });

  it('rejects a tool call when the API key is invalid', async () => {
    const payload = parseToolResult(
      await callTool(
        'triage_get_care_options',
        { urgency_tier: 'routine' },
        'not-a-configured-key',
      ),
    );

    expect(payload).toMatchObject({ error: true, code: 'AUTH_DENIED' });
  });

  it('accepts a valid read-only key and runs trim, timing, safety, and audit', async () => {
    const payload = parseToolResult(
      await callTool(
        'triage_get_care_options',
        { urgency_tier: 'routine', condition: '  headache  ' },
        READONLY_KEY,
      ),
    );

    expect(payload.condition_context).toBe('headache');
    expect(payload._safety).toMatchObject({
      urgency_tier: 'routine',
      synthetic_data: false,
    });
    expect(payload._meta.durationMs).toEqual(expect.any(Number));

    const entries = await readAuditLog();
    expect(entries.at(-1)).toMatchObject({
      tool: 'triage_get_care_options',
      subject: 'readonly_demo',
      status: 'ok',
      request_id: expect.any(String),
      input_hash: expect.any(String),
      scopes: expect.arrayContaining(['triage:read']),
      external_calls: [],
    });
    expect(entries.at(-1)).not.toHaveProperty('api_key');
  });

  it('accepts a valid JWT and applies its scopes through the same gateway', async () => {
    const payload = parseToolResult(
      await callTool('triage_get_care_options', { urgency_tier: 'routine' }, jwtToken),
    );

    expect(payload.error).not.toBe(true);
    expect(payload._safety).toBeDefined();
    expect(payload._meta.durationMs).toEqual(expect.any(Number));
  });

  it('denies a read-only key from calling a care write tool', async () => {
    const payload = parseToolResult(
      await callTool(
        'care_draft_referral',
        {
          patient_id: 'synthetic-123',
          specialty: 'Cardiology',
          reason: 'Persistent exertional symptoms require specialist review.',
          urgency: 'routine',
        },
        READONLY_KEY,
      ),
    );

    expect(payload).toMatchObject({ error: true, code: 'SCOPE_DENIED' });
  });

  it('exposes an infant-compatible triage schema through the registered MCP tool', () => {
    const tool = server.tools.get('triage_assess_symptoms');
    const result = tool.inputSchema.safeParse({
      symptoms: ['fever'],
      age: 0.1,
      age_months: 2,
      sex: 'female',
    });

    expect(result.success).toBe(true);
  });

  it('detects emergency terms and escalates the final clinical response', async () => {
    const payload = parseToolResult(
      await callTool(
        'triage_assess_symptoms',
        {
          symptoms: ['  chest pain  ', 'shortness of breath'],
          age: 55,
          sex: 'male',
          severity: 8,
        },
        CLINICIAN_KEY,
      ),
    );

    expect(payload._safety.urgency_tier).toBe('emergency');
    expect(payload._safety.red_flags_detected).toEqual(
      expect.arrayContaining(['Chest Pain / Pressure', 'Severe Respiratory Distress', 'chest pain']),
    );
    expect(payload.guidance).toContain('EMERGENCY GUIDANCE');
    expect(payload._meta.durationMs).toEqual(expect.any(Number));
  });

  it('rewrites banned phrases through the registered interceptor chain', async () => {
    const tool = server.tools.get('triage_get_care_options') as any;
    const originalHandler = tool.handler;

    tool.handler = async () => ({
      guidance: 'You have hypertension. This is definitely a diagnosis.',
      _safety: {
        urgency_tier: 'routine',
        red_flags_detected: [],
        synthetic_data: false,
      },
    });

    try {
      const context = server.createContext({
        toolName: 'triage_get_care_options',
        metadata: { 'x-api-key': CLINICIAN_KEY },
      });
      const payload = await tool.execute({ urgency_tier: 'routine' }, context);

      expect(payload.guidance).not.toContain('You have hypertension');
      expect(payload.guidance).toContain('your symptoms may be associated with hypertension');
      expect(payload.guidance).not.toContain('definitely');
      expect(payload._meta.durationMs).toEqual(expect.any(Number));
    } finally {
      tool.handler = originalHandler;
    }
  });

  it('records cache hits and exposes admin-only latency metrics', async () => {
    const cacheInput = { urgency_tier: 'routine', condition: 'cache-metrics' };
    await callTool('triage_get_care_options', cacheInput, READONLY_KEY);
    await readAuditLog();
    await callTool('triage_get_care_options', cacheInput, READONLY_KEY);
    const entries = await readAuditLog();
    const cacheEntries = entries
      .filter((entry) => entry.tool === 'triage_get_care_options' && entry.input_summary.condition === 'cache-metrics')
      .slice(-2);

    expect(cacheEntries).toHaveLength(2);
    expect(cacheEntries[0].cache_hit).toBe(false);
    expect(cacheEntries[1].cache_hit).toBe(true);

    const metricsResource = server.resources.get('vitalis://metrics');
    const metricsContext = server.createContext({ metadata: { 'x-api-key': ADMIN_KEY } });
    const metricsContent = await metricsResource.fetch(metricsContext, 'vitalis://metrics');
    const metrics = JSON.parse(metricsContent.data);
    expect(metrics.requests_by_tool.triage_get_care_options).toBeGreaterThanOrEqual(2);
    expect(metrics.p50_latency_ms).toEqual(expect.any(Number));
    expect(metrics.p95_latency_ms).toEqual(expect.any(Number));
    expect(metrics.cache_hits).toBeGreaterThanOrEqual(1);
  });

  it('protects vitalis://audit/recent and vitalis://metrics with admin scope', async () => {
    const resource = server.resources.get('vitalis://audit/recent');
    const metricsResource = server.resources.get('vitalis://metrics');
    expect(resource).toBeDefined();
    expect(metricsResource).toBeDefined();

    const unauthenticatedContext = server.createContext();
    await expect(resource.fetch(unauthenticatedContext, 'vitalis://audit/recent')).rejects.toThrow(
      'AUTH_DENIED',
    );
    await expect(metricsResource.fetch(unauthenticatedContext, 'vitalis://metrics')).rejects.toThrow(
      'AUTH_DENIED',
    );

    const adminContext = server.createContext({
      metadata: { 'x-api-key': ADMIN_KEY },
    });
    const content = await resource.fetch(adminContext, 'vitalis://audit/recent');
    expect(content.type).toBe('text');
    expect(JSON.parse(content.data).entries.length).toBeGreaterThan(0);
  });
});
