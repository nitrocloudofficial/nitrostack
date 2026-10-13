import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditLogService } from './audit-log.service.js';
import type { ComputeProvider } from './compute-provider.js';
import { ComputeService } from './compute.service.js';
import type {
  ComputeOffer,
  ComputeRequest,
  EnvironmentRecord,
  ExecutionResult,
  RuntimeAttestation,
  RuntimeId,
} from './compute.types.js';
import { PolicyService } from './policy.service.js';
import { StateStoreService } from './state-store.service.js';

const baseRequest: ComputeRequest = {
  runtime: 'node20',
  memoryMb: 1024,
  cpuCores: 1,
  durationMinutes: 10,
  network: { mode: 'none' },
  privileged: false,
  hostFilesystem: false,
  dockerSocket: false,
};

const FAKE_DIGEST = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';

class FakeComputeProvider implements ComputeProvider {
  readonly name = 'docker' as const;
  materializeCalls = 0;
  executeCalls = 0;
  releaseCalls = 0;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async attest(runtime: RuntimeId): Promise<RuntimeAttestation> {
    return {
      backend: this.name,
      reference: `${runtime}-image`,
      digest: FAKE_DIGEST,
      source: 'registry',
      resolvedAt: new Date().toISOString(),
    };
  }

  async materialize(offer: ComputeOffer): Promise<EnvironmentRecord> {
    this.materializeCalls += 1;
    const now = new Date();
    return {
      environmentId: 'env_test',
      agentId: offer.agentId,
      provider: this.name,
      providerRef: 'internal-provider-reference',
      runtime: offer.granted.runtime,
      granted: structuredClone(offer.granted),
      attestation: structuredClone(offer.attestation),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      status: 'active',
    };
  }

  async execute(
    environment: EnvironmentRecord,
    argv: string[],
  ): Promise<ExecutionResult> {
    this.executeCalls += 1;
    return {
      environmentId: environment.environmentId,
      exitCode: 0,
      stdout: argv.join(' '),
      stderr: '',
      timedOut: false,
      truncated: false,
      durationMs: 1,
    };
  }

  async release(): Promise<void> {
    this.releaseCalls += 1;
  }
}

function setup() {
  const provider = new FakeComputeProvider();
  // Pin the seam so these tests exercise the protocol, not backend selection.
  const service = new ComputeService(
    new PolicyService(),
    new StateStoreService(),
    { select: async () => provider },
    new AuditLogService(),
  );
  return { provider, service };
}

test('request_compute returns a structured counter-offer without materializing compute', async () => {
  const { provider, service } = setup();
  const result = await service.requestCompute('agent-a', {
    ...baseRequest,
    memoryMb: 16_384,
    durationMinutes: 1440,
    network: { mode: 'unrestricted' },
  });

  assert.equal(result.decision, 'counter_offer');
  assert.equal(provider.materializeCalls, 0);
  assert.ok(result.offer);
  assert.equal(result.offer.granted.memoryMb, 4096);
  assert.equal(result.offer.granted.durationMinutes, 20);
  assert.deepEqual(result.offer.granted.network, {
    mode: 'none',
    allowedHosts: [],
  });
  assert.deepEqual(
    result.offer.deltas.map((delta) => delta.path),
    ['limits.memoryMb.max', 'limits.durationMinutes.max', 'network.allowedHosts'],
  );
});

test('policy survives the DI container passing a constructor argument', async () => {
  // The container resolves an interface-typed constructor parameter to
  // `new Object()` and injects it. A constructor default would be overwritten
  // by that argument, leaving every policy field undefined and every request
  // throwing. Policy must be immune to whatever it is constructed with.
  const Constructible = PolicyService as unknown as new (...args: unknown[]) => PolicyService;
  const policy = new Constructible({});

  const result = policy.evaluate('agent-a', { ...baseRequest, memoryMb: 16_384 });

  assert.equal(result.decision, 'counter_offer');
  assert.equal(result.offer?.granted.memoryMb, 4096);
});

test('hard capabilities are denied rather than silently reduced', async () => {
  const { provider, service } = setup();
  const result = await service.requestCompute('agent-a', {
    ...baseRequest,
    privileged: true,
  });

  assert.equal(result.decision, 'denied');
  assert.equal(result.offer, undefined);
  assert.equal(provider.materializeCalls, 0);
  assert.deepEqual(result.denials.map((denial) => denial.path), ['privileged']);
});

test('the offer pins a runtime digest and the environment carries the same one', async () => {
  const { service } = setup();
  const negotiation = await service.requestCompute('agent-a', baseRequest);
  assert.ok(negotiation.offer);
  assert.equal(negotiation.offer.attestation.digest, FAKE_DIGEST);

  const environment = await service.acceptOffer('agent-a', negotiation.offer.offerId);
  assert.equal(environment.attestation.digest, FAKE_DIGEST);
});

test('accept_offer materializes exactly once and hides provider identifiers', async () => {
  const { provider, service } = setup();
  const negotiation = await service.requestCompute('agent-a', baseRequest);
  assert.ok(negotiation.offer);

  const environment = await service.acceptOffer(
    'agent-a',
    negotiation.offer.offerId,
  );

  assert.equal(provider.materializeCalls, 1);
  assert.equal(environment.environmentId, 'env_test');
  assert.equal('providerRef' in environment, false);
  assert.equal('agentId' in environment, false);

  await assert.rejects(
    service.acceptOffer('agent-a', negotiation.offer.offerId),
    /cannot be accepted/,
  );
  assert.equal(provider.materializeCalls, 1);
});

test('environment ownership is enforced across execute, list, and release', async () => {
  const { provider, service } = setup();
  const negotiation = await service.requestCompute('agent-a', baseRequest);
  assert.ok(negotiation.offer);
  const environment = await service.acceptOffer(
    'agent-a',
    negotiation.offer.offerId,
  );

  await assert.rejects(
    service.execute('agent-b', environment.environmentId, ['node', '--version'], 5),
    /not found for this agent/,
  );
  assert.equal(provider.executeCalls, 0);
  assert.deepEqual(service.listEnvironments('agent-b'), []);

  const result = await service.execute(
    'agent-a',
    environment.environmentId,
    ['node', '--version'],
    5,
  );
  assert.equal(result.stdout, 'node --version');
  assert.equal(provider.executeCalls, 1);

  const released = await service.release('agent-a', environment.environmentId);
  assert.equal(released.status, 'released');
  await service.release('agent-a', environment.environmentId);
  assert.equal(provider.releaseCalls, 1);
});
