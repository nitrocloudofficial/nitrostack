import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditLogService } from './audit-log.service.js';
import type { ComputeProvider } from './compute-provider.js';
import { ComputeService } from './compute.service.js';
import { DockerComputeProvider } from './docker-compute.provider.js';
import { PolicyService } from './policy.service.js';
import { ProcessComputeProvider } from './process-compute.provider.js';
import { RuntimeRegistryService } from './runtime-registry.service.js';
import { StateStoreService } from './state-store.service.js';
import type { ComputeRequest } from './compute.types.js';

/**
 * These exercise the real backends end to end: request, accept, execute in a
 * live environment, release. The unit tests prove the protocol; these prove
 * something actually ran.
 */

const request: ComputeRequest = {
  runtime: 'node20',
  memoryMb: 512,
  cpuCores: 1,
  durationMinutes: 5,
  network: { mode: 'none' },
  privileged: false,
  hostFilesystem: false,
  dockerSocket: false,
};

function serviceFor(provider: ComputeProvider) {
  return new ComputeService(
    new PolicyService(),
    new StateStoreService(),
    { select: async () => provider },
    new AuditLogService(),
  );
}

async function fullLoop(provider: ComputeProvider, agentId: string) {
  const service = serviceFor(provider);
  const negotiation = await service.requestCompute(agentId, request);
  assert.ok(negotiation.offer, 'expected an offer');

  const environment = await service.acceptOffer(agentId, negotiation.offer.offerId);
  assert.equal(environment.status, 'active');

  const version = await service.execute(
    agentId,
    environment.environmentId,
    ['node', '--version'],
    30,
  );
  assert.equal(version.exitCode, 0, version.stderr);
  assert.match(version.stdout.trim(), /^v\d+\.\d+\.\d+$/);

  const arithmetic = await service.execute(
    agentId,
    environment.environmentId,
    ['node', '-e', 'console.log(6 * 7)'],
    30,
  );
  assert.equal(arithmetic.exitCode, 0, arithmetic.stderr);
  assert.equal(arithmetic.stdout.trim(), '42');

  const released = await service.release(agentId, environment.environmentId);
  assert.equal(released.status, 'released');

  return { negotiation, environment };
}

test('process backend runs a real bounded loop', { timeout: 60_000 }, async () => {
  const provider = new ProcessComputeProvider();
  const { negotiation } = await fullLoop(provider, 'agent-process');
  assert.equal(negotiation.offer?.attestation.backend, 'process');
});

test('process backend denies the network it never granted', { timeout: 60_000 }, async () => {
  const provider = new ProcessComputeProvider();
  const service = serviceFor(provider);
  const negotiation = await service.requestCompute('agent-net', request);
  assert.ok(negotiation.offer);
  const environment = await service.acceptOffer('agent-net', negotiation.offer.offerId);

  const result = await service.execute(
    'agent-net',
    environment.environmentId,
    ['node', '-e', "require('http')"],
    30,
  );
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /granted no network access/);

  await service.release('agent-net', environment.environmentId);
});

test('process backend confines the filesystem to the workspace', { timeout: 60_000 }, async () => {
  const provider = new ProcessComputeProvider();
  const service = serviceFor(provider);
  const negotiation = await service.requestCompute('agent-fs', request);
  assert.ok(negotiation.offer);
  const environment = await service.acceptOffer('agent-fs', negotiation.offer.offerId);

  const escape = await service.execute(
    'agent-fs',
    environment.environmentId,
    ['node', '-e', "require('fs').readFileSync('/etc/hostname')"],
    30,
  );
  assert.notEqual(escape.exitCode, 0);
  assert.match(escape.stderr, /ERR_ACCESS_DENIED/);

  const inside = await service.execute(
    'agent-fs',
    environment.environmentId,
    [
      'node',
      '-e',
      "const fs=require('fs');fs.writeFileSync('note.txt','held');console.log(fs.readFileSync('note.txt','utf8'))",
    ],
    30,
  );
  assert.equal(inside.exitCode, 0, inside.stderr);
  assert.equal(inside.stdout.trim(), 'held');

  await service.release('agent-fs', environment.environmentId);
});

test('process backend inherits none of the server environment', { timeout: 60_000 }, async () => {
  const provider = new ProcessComputeProvider();
  const service = serviceFor(provider);
  const negotiation = await service.requestCompute('agent-env', request);
  assert.ok(negotiation.offer);
  const environment = await service.acceptOffer('agent-env', negotiation.offer.offerId);

  process.env.BOULDERSGATE_API_KEY_LEAKTEST = 'must-not-be-visible';
  try {
    const result = await service.execute(
      'agent-env',
      environment.environmentId,
      ['node', '-e', 'console.log(JSON.stringify(Object.keys(process.env)))'],
      30,
    );
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.stdout.trim(), '[]');
  } finally {
    delete process.env.BOULDERSGATE_API_KEY_LEAKTEST;
    await service.release('agent-env', environment.environmentId);
  }
});

test('docker backend runs a real bounded loop', { timeout: 180_000 }, async (t) => {
  const provider = new DockerComputeProvider(new RuntimeRegistryService());
  if (!(await provider.isAvailable())) {
    t.skip('no reachable Docker daemon');
    return;
  }

  const { negotiation, environment } = await fullLoop(provider, 'agent-docker');
  assert.equal(negotiation.offer?.attestation.backend, 'docker');
  // The environment must carry the exact digest the offer promised.
  assert.equal(environment.attestation.digest, negotiation.offer?.attestation.digest);
});

test('docker backend enforces the granted no-egress envelope', { timeout: 180_000 }, async (t) => {
  const provider = new DockerComputeProvider(new RuntimeRegistryService());
  if (!(await provider.isAvailable())) {
    t.skip('no reachable Docker daemon');
    return;
  }

  const service = serviceFor(provider);
  const negotiation = await service.requestCompute('agent-docker-net', request);
  assert.ok(negotiation.offer);
  const environment = await service.acceptOffer(
    'agent-docker-net',
    negotiation.offer.offerId,
  );

  try {
    const result = await service.execute(
      'agent-docker-net',
      environment.environmentId,
      [
        'node',
        '-e',
        "require('net').connect({host:'1.1.1.1',port:443}).on('error',e=>{console.log(e.code);process.exit(3)}).on('connect',()=>{console.log('CONNECTED');process.exit(0)})",
      ],
      30,
    );
    assert.equal(result.exitCode, 3, result.stdout + result.stderr);
    assert.match(result.stdout, /ENETUNREACH|ENETDOWN|EHOSTUNREACH/);
  } finally {
    await service.release('agent-docker-net', environment.environmentId);
  }
});

test('registry attestation pins an immutable digest', { timeout: 30_000 }, async (t) => {
  const attestation = await new RuntimeRegistryService().attest('node20');
  if (attestation.source === 'unavailable') {
    t.skip(`registry unreachable: ${attestation.note}`);
    return;
  }
  assert.equal(attestation.reference, 'node:20-alpine');
  assert.match(attestation.digest ?? '', /^sha256:[0-9a-f]{64}$/);
});
