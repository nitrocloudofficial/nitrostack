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
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function freePort() {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

export async function startDemo(t) {
  const directory = await mkdtemp(join(tmpdir(), 'brandvoice-test-'));
  const port = await freePort();
  const adminPort = await freePort();
  const proc = spawn(process.execPath, ['dist/index.js'], {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      BRANDVOICE_STATE_DIR: directory,
      GUARDRAILS_ADMIN_PORT: String(adminPort),
      GUARDRAILS_PROFILE: 'demo',
      GUARDRAILS_STORE: '',
      GUARDRAILS_IDENTITY: '',
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
    const c = new Client({ name: 'brandvoice-test', version: '1' });
    await c.connect(
      new StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + port + '/mcp'), {
        requestInit: { headers: { Authorization: 'Bearer demo-' + identity } },
      })
    );
    clients.push(c);
    return c;
  }
  const adminUrl = 'http://127.0.0.1:' + adminPort;
  const adminKey = (await readFile(join(directory, 'admin.key'), 'utf8')).trim();
  const webhookSecret = (await readFile(join(directory, 'webhook.secret'), 'utf8')).trim();
  /** Calls the control plane. `token` defaults to the generated demo admin key. */
  async function admin(method, path, body, { token = adminKey, headers = {} } = {}) {
    const res = await fetch(adminUrl + path, {
      method,
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: res.status, headers: res.headers, body: await res.json().catch(() => ({})) };
  }
  return { connect, directory, admin, adminUrl, webhookSecret };
}
export async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(result.content[0]?.text ?? 'MCP error');
  return result.structuredContent ?? JSON.parse(result.content[0].text);
}
/** A street-voice chat reply: the tone scorer measures slang 8. */
export const street = {
  channel: 'chat',
  customer: 'Jordan',
  text: 'Yo fam, your sneakers are fire and the drip is legit, no cap. Real talk, they ship Friday. Bet!',
};
