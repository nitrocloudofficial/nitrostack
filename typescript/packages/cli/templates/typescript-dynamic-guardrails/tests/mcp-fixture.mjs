/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function startDemo(t) {
  const directory = await mkdtemp(join(tmpdir(), 'guardian-test-'));
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const proc = spawn(process.execPath, ['dist/index.js'], {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      CLOUDOPS_STATE_DIR: directory,
      NITROSTACK_APP_MODE: 'openai',
      NITRO_MCP_PROTOCOL_VERSION: '',
    },
  });
  const clients = [];
  t.after(async () => {
    await Promise.allSettled(clients.map((client) => client.close()));
    if (proc.exitCode === null && proc.signalCode === null) {
      const exit = once(proc, 'exit');
      proc.kill('SIGKILL');
      await exit;
    }
    await rm(directory, { recursive: true, force: true });
  });
  let log = '';
  proc.stderr.on('data', (chunk) => {
    log += chunk;
  });
  for (let i = 0; i < 120 && !log.includes('transport listening') && proc.exitCode === null; i++)
    await delay(50);
  if (!log.includes('transport listening')) throw new Error(log || 'Server did not start');
  async function connect(identity) {
    const c = new Client({ name: 'guardian-test', version: '1' });
    await c.connect(
      new StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + port + '/mcp'), {
        requestInit: { headers: { Authorization: 'Bearer demo-' + identity } },
      })
    );
    clients.push(c);
    return c;
  }
  return { connect, directory };
}
export async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(result.content[0]?.text ?? 'MCP error');
  return result.structuredContent ?? JSON.parse(result.content[0].text);
}
export const gpu = {
  region: 'Mumbai',
  machine: 'accelerated',
  cpu: 1,
  memory: 4,
  gpu: 1,
  count: 8,
  environment: 'development',
  workload: 'ML training',
};
