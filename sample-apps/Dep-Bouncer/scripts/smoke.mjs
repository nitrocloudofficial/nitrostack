#!/usr/bin/env node
// Node 20+, no dependencies. --quick: protocol + three happy paths; --json: JSON only.
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';

const flags = new Set(process.argv.slice(2));
for (const flag of flags) {
  if (!['--quick', '--json'].includes(flag)) {
    console.error(`Unknown flag: ${flag}. Usage: node scripts/smoke.mjs [--quick] [--json]`);
    process.exit(1);
  }
}
const endpoint = process.env.DEP_BOUNCER_URL ||
  'https://dep-bouncer-6ad22414-giberelin-heapify-global-community.app.nitrocloud.ai/mcp';
const toolNames = [
  'check_package', 'check_upgrade', 'safe_version', 'diff_release',
  'review_install_scripts', 'check_manifest', 'replay_incident',
].map((name) => `bouncer_${name}`);
const intervals = new Map(Object.entries({
  bouncer_check_package: 2100,
  bouncer_check_upgrade: 2100,
  bouncer_safe_version: 6100,
  bouncer_diff_release: 3100,
  bouncer_review_install_scripts: 12100,
  bouncer_check_manifest: 20100,
}));
const lastCall = new Map();
const checks = [];
const happyLatencies = [];
let sequence = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// SSE can contain progress notifications, comments, and multiple data lines.
// Stop at our JSON-RPC response rather than waiting for a persistent stream to close.
async function readReply(response, id) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    return response.json();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  const parseEvent = (event) => {
    const data = event.split('\n').filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, '')).join('\n');
    if (!data) return undefined;
    const message = JSON.parse(data);
    return message.id === id ? message : undefined;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      // Normalize CRLF only after receiving a full line (a CR may straddle chunks).
      pending = pending.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = pending.indexOf('\n\n')) !== -1) {
        const message = parseEvent(pending.slice(0, boundary));
        pending = pending.slice(boundary + 2);
        if (message) return message;
      }
      if (done) {
        const message = parseEvent(pending);
        if (message) return message;
        throw new Error('SSE ended without a matching JSON-RPC response');
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function rpc(method, params, timeoutMs) {
  const id = ++sequence;
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const backoff = [1500, 3000, 6000, 10000];
  try {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': '2025-06-18',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        signal: controller.signal,
      });
      if ([502, 503, 504].includes(response.status) && attempt < backoff.length) {
        await response.body?.cancel();
        await sleep(backoff[attempt], undefined, { signal: controller.signal });
        continue;
      }
      // 413 = body over the server's request limit; the caller decides whether that is expected.
      if (response.status === 413) {
        await response.body?.cancel().catch(() => undefined);
        return { body: null, status: 413, durationMs: performance.now() - start };
      }
      assert(response.status === 200, `HTTP ${response.status}`);
      const body = await readReply(response, id);
      assert(body.jsonrpc === '2.0' && body.id === id, 'Invalid JSON-RPC response envelope');
      return { body, status: response.status, durationMs: performance.now() - start };
    }
  } finally {
    clearTimeout(timer);
  }
}

async function invoke(method, params, { hostile = false } = {}) {
  const tool = method === 'tools/call' ? params.name : undefined;
  for (let attempt = 0; ; attempt++) {
    const interval = intervals.get(tool) || 0;
    const wait = (lastCall.get(tool) || 0) + interval - performance.now();
    if (wait > 0) await sleep(wait);
    if (tool) lastCall.set(tool, performance.now());
    const reply = await rpc(method, params, hostile ? 29_500 : 90_000);
    if (/too many/i.test(JSON.stringify(reply.body))) {
      assert(attempt === 0, 'Rate limited again after the 65-second retry');
      await sleep(65_000);
      continue;
    }
    return reply;
  }
}

function result(reply) {
  assert(!reply.body.error, `JSON-RPC error: ${JSON.stringify(reply.body.error)}`);
  assert(reply.body.result !== undefined, 'Missing JSON-RPC result');
  return reply.body.result;
}

function report(reply) {
  const value = result(reply);
  assert(!value.isError, `Tool error: ${value.content?.[0]?.text || 'unspecified'}`);
  assert(typeof value.content?.[0]?.text === 'string', 'Missing report text');
  return JSON.parse(value.content[0].text);
}

const validVerdict = (value) => ['ALLOW', 'REVIEW', 'BLOCK'].includes(value?.verdict);
const call = (name, args, options) => invoke('tools/call', {
  name: `bouncer_${name}`, arguments: args,
}, options);

async function check(name, run, level = 'must') {
  const start = performance.now();
  try {
    const detail = await run();
    checks.push({ name, level, status: 'PASS', durationMs: Math.round(performance.now() - start), ...(detail ? { detail } : {}) });
  } catch (error) {
    checks.push({ name, level, status: level === 'must' ? 'FAIL' : 'WARN',
      durationMs: Math.round(performance.now() - start), detail: String(error.message || error).slice(0, 1000) });
  }
  if (!flags.has('--json')) {
    const item = checks.at(-1);
    console.log(`${item.status} [${item.level}] ${name} (${item.durationMs} ms)${item.detail ? `: ${item.detail}` : ''}`);
  }
}

async function happy(name, tool, args, validate) {
  await check(`happy: ${name}`, async () => {
    const reply = await call(tool, args);
    happyLatencies.push(reply.durationMs);
    validate(report(reply));
  });
}

await check('protocol: initialize', async () => {
  const value = result(await invoke('initialize', {
    protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'dep-bouncer-smoke', version: '1.0.0' },
  }));
  assert(value.protocolVersion === '2025-06-18' && value.serverInfo && value.capabilities,
    'Missing initialize metadata or unexpected protocol version');
});
await check('protocol: tools/list (exactly seven bouncer tools)', async () => {
  const value = result(await invoke('tools/list', {}));
  const names = value.tools?.map((tool) => tool.name).filter((name) => name.startsWith('bouncer_')).sort();
  assert(JSON.stringify(names) === JSON.stringify([...toolNames].sort()), `Unexpected tools: ${JSON.stringify(names)}`);
});
await check('protocol: resources/list', async () => {
  const value = result(await invoke('resources/list', {}));
  for (const uri of ['bouncer://policy', 'incidents://list']) {
    assert(value.resources?.some((resource) => resource.uri === uri), `Missing resource ${uri}`);
  }
});
await check('protocol: prompts/list', async () => {
  const value = result(await invoke('prompts/list', {}));
  assert(value.prompts?.some((prompt) => prompt.name === 'safe_install'), 'Missing safe_install prompt');
});
for (const uri of ['bouncer://policy', 'incidents://list']) {
  await check(`protocol: resources/read ${uri}`, async () => {
    const value = result(await invoke('resources/read', { uri }));
    const content = value.contents?.find((item) => item.uri === uri);
    assert(typeof content?.text === 'string', 'Missing resource text');
    JSON.parse(content.text);
  });
}
await check('protocol: prompts/get safe_install', async () => {
  const value = result(await invoke('prompts/get', { name: 'safe_install', arguments: {} }));
  assert(Array.isArray(value.messages) && value.messages.length > 0, 'Missing prompt messages');
});

await happy('check_package chalk', 'check_package', { name: 'chalk' }, (value) => {
  assert(validVerdict(value) && Array.isArray(value.findings), 'Expected verdict and findings array');
});
for (const [name, version] of [
  ['axios', '1.14.1'], ['react-codeshift-utils-pro', undefined],
  ...(!flags.has('--quick') ? [['plain-crypto-js', undefined]] : []),
]) {
  await happy(`check_package ${name}${version ? `@${version}` : ''}`, 'check_package',
    { name, ...(version ? { version } : {}) }, (value) => assert(value.verdict === 'BLOCK', 'Expected BLOCK'));
}

if (!flags.has('--quick')) {
  for (const incident of ['axios', 'keyv', 'chalk', 'nx', 'tinycolor']) {
    await happy(`replay_incident ${incident}`, 'replay_incident', { incident },
      (value) => assert(value.verdict === 'BLOCK', 'Expected BLOCK'));
  }
  await happy('check_upgrade chalk', 'check_upgrade', { name: 'chalk', from: '5.5.0', to: '5.6.0' },
    (value) => assert(Array.isArray(value.change), 'Expected change array'));
  await happy('safe_version chalk', 'safe_version', { name: 'chalk', range: '^5.0.0' },
    (value) => assert(typeof value.safeVersion === 'string' && value.safeVersion.length > 0, 'Expected safeVersion'));
  await happy('diff_release chalk', 'diff_release', { name: 'chalk', from: '5.5.0', to: '5.6.0' },
    (value) => assert(value.files !== undefined, 'Expected files'));
  await happy('review_install_scripts esbuild', 'review_install_scripts', { packages: [{ name: 'esbuild' }] }, (value) => {
    const esbuild = value.packages?.find((item) => item.package === 'esbuild');
    assert(['APPROVE', 'REVIEW'].includes(esbuild?.recommendation), 'Expected esbuild APPROVE or REVIEW');
  });
  await happy('check_manifest chalk', 'check_manifest', { packageJson: '{"dependencies":{"chalk":"^5.6.0"}}' },
    (value) => assert(Array.isArray(value.results), 'Expected results array'));

  const hostileCases = [
    ...['', '../../etc/passwd', 'a b', '%2e%2e', '__proto__', 'constructor', 'x'.repeat(300)]
      .map((name) => [`name ${name.length > 40 ? '(300 chars)' : JSON.stringify(name)}`, 'check_package', { name }]),
    ...['__proto__', '^wat'].map((version) => [`version ${version}`, 'check_package', { name: 'chalk', version }]),
    ['unknown incident left-pad', 'replay_incident', { incident: 'left-pad' }],
    ...['null', '[]', '{'].map((packageJson) => [`manifest ${JSON.stringify(packageJson)}`, 'check_manifest', { packageJson }]),
    ['manifest 150 KB valid JSON', 'check_manifest', { packageJson: JSON.stringify({ padding: 'x'.repeat(150 * 1024 - 14) }) }],
    ['upgrade identical versions', 'check_upgrade', { name: 'chalk', from: '5.6.0', to: '5.6.0' }],
    ['diff unknown versions', 'diff_release', { name: 'chalk', from: '9998.0.0', to: '9999.0.0' }],
    ['review 16 packages', 'review_install_scripts', { packages: Array.from({ length: 16 }, () => ({ name: 'esbuild' })) }],
  ];
  for (const [name, tool, args] of hostileCases) {
    await check(`hostile: ${name}`, async () => {
      const reply = await call(tool, args, { hostile: true });
      // Bodies over the server's ~100 KB request limit are refused with 413 before the tool runs.
      if (name.startsWith('manifest 150 KB') && reply.status === 413) return 'HTTP 413 Payload Too Large (clean refusal)';
      assert(reply.status === 200 && reply.durationMs < 30_000, 'Expected HTTP 200 in under 30 seconds');
      const value = result(reply);
      if (value.isError === true) {
        const text = value.content?.filter((item) => item.type === 'text').map((item) => item.text).join('\n');
        assert(typeof text === 'string' && text.trim().length > 0, 'Missing error text');
        assert(text.length < 500, `Error text is ${text.length} chars (must be under 500)`);
        assert(!/\bat\s+(?:[^\n]*?\()?\s*(?:file:\/\/|[A-Za-z]:[\\/]|\/|\.{1,2}[\\/])[^\n]+/m.test(text), 'Error contains a stack trace');
      } else {
        assert(validVerdict(report(reply)), 'Expected isError: true or a valid ALLOW/REVIEW/BLOCK verdict');
      }
      return `response ${Math.round(reply.durationMs)} ms (excludes rate-limit spacing/retry wait)`;
    });
  }
}

const sorted = [...happyLatencies].sort((a, b) => a - b);
const percentile = (p) => sorted.length ? Math.round(sorted[Math.ceil(sorted.length * p) - 1]) : null;
const latency = { samples: sorted.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95) };
await check('latency: happy-path p50/p95 (warn above 30 seconds)', async () => {
  assert(latency.samples > 0, 'No happy-path latency samples');
  assert(latency.p95Ms < 30_000, `p50=${latency.p50Ms} ms, p95=${latency.p95Ms} ms`);
  return `p50=${latency.p50Ms} ms, p95=${latency.p95Ms} ms`;
}, 'warn');

const failed = checks.filter((item) => item.level === 'must' && item.status === 'FAIL').length;
if (flags.has('--json')) {
  console.log(JSON.stringify({ endpoint, mode: flags.has('--quick') ? 'quick' : 'full', checks, latency, failed }, null, 2));
} else {
  console.table(checks.map(({ name, level, status, durationMs }) => ({ check: name, level, status, ms: durationMs })));
  console.log(`${checks.length - failed}/${checks.length} checks without a must failure; ${failed} must failure(s).`);
}
process.exitCode = failed ? 1 : 0;
