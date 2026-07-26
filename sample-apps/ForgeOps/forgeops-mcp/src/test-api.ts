import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createHttpApiServer } from './http-api.js';

async function expectJson(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

const server = createHttpApiServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');

const address = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const health = await expectJson('/api/health') as {
    status?: string;
    modules?: string[];
    runtime?: { agentProcesses?: number; mcpServerAttached?: boolean };
  };
  if (
    health.status !== 'ok'
    || health.modules?.length !== 6
    || health.runtime?.agentProcesses !== 0
    || health.runtime?.mcpServerAttached !== false
  ) {
    throw new Error('Health response did not include all integrated modules');
  }

  const incident = await expectJson('/api/incident') as { incident_id?: string };
  if (incident.incident_id !== 'INC-2407-001') throw new Error('Canonical incident was not returned');

  const timeline = await expectJson('/api/timeline') as unknown[];
  if (timeline.length !== 10) throw new Error(`Expected 10 timeline events, received ${timeline.length}`);

  const simulation = await expectJson('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Reduce Queue Delay', inputs: { queue_delay_minutes: 45 } }),
  }) as { predicted_yield?: number; in_validated_range?: boolean };
  if (simulation.predicted_yield !== 96 || !simulation.in_validated_range) {
    throw new Error('Simulation endpoint did not return the validated queue-delay result');
  }

  const agent = await expectJson('/api/agent/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'compare',
      incident_id: 'INC-2407-001',
      batch_id: 'B-2407-184',
    }),
  }) as { confidence?: number; toolTrace?: unknown[] };
  if (agent.confidence !== 0.94 || agent.toolTrace?.length !== 4) {
    throw new Error('Agent endpoint did not return the orchestrated comparison trace');
  }

  console.log('ForgeOps integrated HTTP API: 5 checks passed');
} finally {
  server.close();
  await once(server, 'close');
}
