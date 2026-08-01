#!/usr/bin/env node
/**
 * Drives the whole BouldersGate protocol against a running server and prints
 * what happened, including the cases that are supposed to fail.
 *
 *   BOULDERSGATE_API_KEY=<key> node scripts/demo.mjs [url]
 *
 * `url` defaults to the live NitroCloud deployment. Point it at
 * http://localhost:3000/mcp to drive a local server instead.
 */

const URL_ARG =
  process.argv[2] ??
  'https://bouldersgate-6a6-just-another-team-amrita-university-coimbatore.app.nitrocloud.ai/mcp';
const KEY = process.env.BOULDERSGATE_API_KEY;

if (!KEY) {
  console.error('Set BOULDERSGATE_API_KEY first. See .env.example.');
  process.exit(1);
}

const HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};

let sessionId;

async function rpc(method, params) {
  const response = await fetch(URL_ARG, {
    method: 'POST',
    headers: sessionId ? { ...HEADERS, 'mcp-session-id': sessionId } : HEADERS,
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  sessionId ??= response.headers.get('mcp-session-id');

  const body = await response.text();
  const event = body.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(event ? event.slice(6) : body);
}

/** The credential travels in `_meta`; NitroStack guards cannot read headers. */
async function call(name, args = {}) {
  const result = await rpc('tools/call', {
    name,
    arguments: { ...args, _meta: { apiKey: KEY } },
  });
  if (result.error) {
    throw new Error(result.error.message ?? JSON.stringify(result.error));
  }
  const content = result.result.content?.[0]?.text ?? '';
  if (result.result.isError) {
    throw new Error(content);
  }
  return result.result.structuredContent ?? JSON.parse(content);
}

async function expectRejection(label, run) {
  try {
    await run();
    console.log(`  ${label}: SUCCEEDED — this is a bug`);
    process.exitCode = 1;
  } catch (error) {
    console.log(`  ${label}: rejected — ${String(error.message).slice(0, 90)}`);
  }
}

const h = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`);

await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'bouldersgate-demo', version: '1.0.0' },
});
await fetch(URL_ARG, {
  method: 'POST',
  headers: { ...HEADERS, 'mcp-session-id': sessionId },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
});
console.log(`Connected to ${URL_ARG}`);

const activeCount = async () =>
  (await call('list_environments')).environments.filter((e) => e.status === 'active').length;

const activeBefore = await activeCount();

h('1. Ask for far more than policy allows');
const negotiation = await call('request_compute', {
  runtime: 'node20',
  memoryMb: 16384,
  cpuCores: 8,
  durationMinutes: 1440,
  network: { mode: 'unrestricted' },
  privileged: false,
  hostFilesystem: false,
  dockerSocket: false,
});
console.log(`  decision: ${negotiation.decision}`);
for (const d of negotiation.deltas ?? negotiation.offer.deltas) {
  console.log(`  ${d.kind.padEnd(8)} ${d.path}: ${JSON.stringify(d.requested)} -> ${JSON.stringify(d.granted)}`);
  console.log(`           ${d.reason}`);
}
const { offer } = negotiation;
console.log(`  backend: ${offer.attestation.backend} · runtime ${offer.attestation.reference}`);
console.log(`  digest : ${offer.attestation.digest ?? '(process backend pins no image)'}`);

h('2. Nothing was provisioned by asking');
const activeAfter = await activeCount();
console.log(`  active environments before: ${activeBefore}, after negotiating: ${activeAfter}`);
console.log(`  unchanged: ${activeBefore === activeAfter}`);

h('3. Capabilities with no reduced form are denied outright');
const denied = await call('request_compute', {
  runtime: 'node20',
  memoryMb: 512,
  cpuCores: 1,
  durationMinutes: 5,
  network: { mode: 'none' },
  privileged: true,
  hostFilesystem: true,
  dockerSocket: true,
});
console.log(`  decision: ${denied.decision} · offer created: ${denied.offer ? 'YES — bug' : 'no'}`);
for (const d of denied.denials) console.log(`  denied ${d.path}: ${d.reason}`);

h('4. Accept the counter-offer — the only step that provisions');
const environment = await call('accept_offer', { offerId: offer.offerId });
console.log(`  ${environment.environmentId} · ${environment.status} · expires ${environment.expiresAt}`);
console.log(`  runtime matches the offer: ${environment.attestation.reference === offer.attestation.reference}`);

h('5. Run real code inside the grant');
const run = await call('execute_command', {
  environmentId: environment.environmentId,
  argv: ['node', '-e', 'console.log(`node ${process.version} in ${process.cwd()}`)'],
  timeoutSeconds: 20,
});
console.log(`  exit ${run.exitCode}: ${run.stdout.trim()}`);

h('6. The bounds hold');

/**
 * These must hold on both backends, so they assert the property rather than a
 * mechanism. A container legitimately has its own /etc/passwd and its own
 * environment variables; neither is an escape. What must never happen is a
 * credential this server holds becoming readable, a write landing outside the
 * granted workspace, or a packet leaving.
 */
const probe = async (label, code, verdict) => {
  const result = await call('execute_command', {
    environmentId: environment.environmentId,
    argv: ['node', '-e', code],
    timeoutSeconds: 20,
  });
  const { pass, detail } = verdict(result);
  if (!pass) process.exitCode = 1;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(28)} ${detail}`);
};

await probe(
  'no egress',
  "require('https').get('https://example.com')",
  (r) => ({ pass: r.exitCode !== 0, detail: `exit ${r.exitCode}` }),
);

await probe(
  'no server credential visible',
  'console.log(JSON.stringify(Object.keys(process.env)))',
  (r) => {
    const names = JSON.parse(r.stdout.trim() || '[]');
    const leaked = names.filter((n) => /BOULDERSGATE|NITRO|API_KEY|TOKEN|SECRET/i.test(n));
    return {
      pass: leaked.length === 0,
      detail: leaked.length ? `LEAKED ${leaked.join(', ')}` : `${names.length} vars, none sensitive`,
    };
  },
);

await probe(
  'no write outside workspace',
  "require('fs').writeFileSync('/etc/bouldersgate-probe','x')",
  (r) => ({ pass: r.exitCode !== 0, detail: `exit ${r.exitCode}` }),
);

await probe(
  "server's own source unreachable",
  `require('fs').readFileSync(${JSON.stringify(process.cwd())} + '/package.json')`,
  (r) => ({ pass: r.exitCode !== 0, detail: `exit ${r.exitCode}` }),
);

h('7. An offer is single-use, and environments are owner-scoped');
await expectRejection('replayed accept_offer', () =>
  call('accept_offer', { offerId: offer.offerId }),
);

h('8. Release and read the trail');
console.log(`  status: ${(await call('release_environment', { environmentId: environment.environmentId })).status}`);
const audit = await call('list_audit_events', { limit: 20 });
for (const event of [...audit.events].reverse()) console.log(`  ${event.timestamp}  ${event.action}`);

console.log('\nDone.');
