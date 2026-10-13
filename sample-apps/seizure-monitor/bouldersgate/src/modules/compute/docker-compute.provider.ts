import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { ComputeProvider } from './compute-provider.js';
import { imageReference, RuntimeRegistryService } from './runtime-registry.service.js';
import { runProcess, type ProcessResult } from './process-runner.js';
import type {
  BackendId,
  ComputeOffer,
  EnvironmentRecord,
  ExecutionResult,
  RuntimeAttestation,
  RuntimeId,
} from './compute.types.js';

const MATERIALIZE_TIMEOUT_MS = 120_000;
const PROBE_TIMEOUT_MS = 5_000;
const PROBE_CACHE_MS = 30_000;

const SUPPORTED_RUNTIMES: RuntimeId[] = ['node20'];

@Injectable({ deps: [RuntimeRegistryService] })
export class DockerComputeProvider implements ComputeProvider {
  readonly name: BackendId = 'docker';

  private dockerHost?: string | null;
  private probe?: { available: boolean; checkedAt: number };

  constructor(private readonly registry: RuntimeRegistryService) {}

  async isAvailable(now = Date.now()): Promise<boolean> {
    if (this.probe && now - this.probe.checkedAt < PROBE_CACHE_MS) {
      return this.probe.available;
    }
    const available = (await this.resolveDockerHost()) !== null;
    this.probe = { available, checkedAt: now };
    return available;
  }

  async attest(runtime: RuntimeId): Promise<RuntimeAttestation> {
    return this.registry.attest(runtime);
  }

  async materialize(offer: ComputeOffer): Promise<EnvironmentRecord> {
    if (offer.granted.network.mode !== 'none') {
      throw new Error('The Docker backend cannot yet enforce a non-empty egress allowlist.');
    }
    if (!SUPPORTED_RUNTIMES.includes(offer.granted.runtime)) {
      throw new Error(`No Docker image is configured for runtime "${offer.granted.runtime}".`);
    }

    // Pin to the digest the offer promised, so the tag cannot be re-pointed
    // between negotiation and acceptance. If the registry was unreachable at
    // offer time the tag is the only reference available, and the attestation
    // already records that.
    const tag = imageReference(offer.granted.runtime);
    const image = offer.attestation.digest ? `${tag}@${offer.attestation.digest}` : tag;

    const environmentId = `env_${randomUUID()}`;
    const containerName = `bouldersgate-${environmentId.slice(4).replaceAll('-', '')}`;
    const lifetimeSeconds = offer.granted.durationMinutes * 60;
    const workspaceMb = Math.max(16, Math.min(256, Math.floor(offer.granted.memoryMb / 4)));

    const result = await this.docker(
      [
        'run',
        '--detach',
        '--rm',
        '--pull=missing',
        '--name',
        containerName,
        '--label',
        'bouldersgate.managed=true',
        '--label',
        `bouldersgate.environment=${environmentId}`,
        '--network',
        'none',
        '--read-only',
        '--user',
        '65534:65534',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--pids-limit',
        '64',
        '--ulimit',
        'nofile=256:256',
        '--memory',
        `${offer.granted.memoryMb}m`,
        '--cpus',
        String(offer.granted.cpuCores),
        '--workdir',
        '/workspace',
        '--tmpfs',
        `/workspace:rw,nosuid,nodev,noexec,mode=1777,size=${workspaceMb}m`,
        image,
        'sleep',
        String(lifetimeSeconds),
      ],
      MATERIALIZE_TIMEOUT_MS,
    );

    if (result.exitCode !== 0 || result.timedOut) {
      throw dockerError('materialization', result);
    }

    const providerRef = result.stdout.trim();
    if (!providerRef) {
      throw new Error('Docker materialization returned no container identifier.');
    }

    const now = new Date();
    return {
      environmentId,
      agentId: offer.agentId,
      provider: this.name,
      providerRef,
      runtime: offer.granted.runtime,
      granted: structuredClone(offer.granted),
      attestation: structuredClone(offer.attestation),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + lifetimeSeconds * 1000).toISOString(),
      status: 'active',
    };
  }

  async execute(
    environment: EnvironmentRecord,
    argv: string[],
    timeoutSeconds: number,
  ): Promise<ExecutionResult> {
    const result = await this.docker(
      ['exec', environment.providerRef, ...argv],
      timeoutSeconds * 1000,
    );
    return {
      environmentId: environment.environmentId,
      ...result,
    };
  }

  async release(environment: EnvironmentRecord): Promise<void> {
    const result = await this.docker(['rm', '--force', environment.providerRef], 15_000);
    if (
      result.exitCode !== 0 &&
      !result.stderr.toLowerCase().includes('no such container')
    ) {
      throw dockerError('release', result);
    }
  }

  private async docker(args: string[], timeoutMs: number): Promise<ProcessResult> {
    const host = await this.resolveDockerHost();
    if (host === null) {
      throw new Error('No reachable Docker daemon.');
    }
    return runProcess('docker', args, {
      timeoutMs,
      env: host ? { ...process.env, DOCKER_HOST: host } : process.env,
    });
  }

  /**
   * The active Docker CLI context can point at a socket that no longer exists —
   * a stale Docker Desktop context is the common case. Probe the explicit
   * configuration first, then the well-known sockets, and remember the winner.
   * Resolves to `''` when the ambient CLI configuration already works, or to
   * `null` when no daemon answers at all.
   */
  private async resolveDockerHost(): Promise<string | null> {
    if (this.dockerHost !== undefined) {
      return this.dockerHost;
    }

    const candidates = [
      process.env.DOCKER_HOST,
      '',
      'unix:///var/run/docker.sock',
      process.env.XDG_RUNTIME_DIR
        ? `unix://${process.env.XDG_RUNTIME_DIR}/docker.sock`
        : undefined,
    ].filter((candidate): candidate is string => candidate !== undefined);

    for (const candidate of candidates) {
      const socketPath = candidate.startsWith('unix://') ? candidate.slice(7) : undefined;
      if (socketPath && !existsSync(socketPath)) {
        continue;
      }
      if (await this.daemonAnswers(candidate)) {
        this.dockerHost = candidate;
        return candidate;
      }
    }

    this.dockerHost = null;
    return null;
  }

  private async daemonAnswers(host: string): Promise<boolean> {
    try {
      const result = await runProcess(
        'docker',
        ['version', '--format', '{{.Server.Version}}'],
        {
          timeoutMs: PROBE_TIMEOUT_MS,
          env: host ? { ...process.env, DOCKER_HOST: host } : process.env,
        },
      );
      return result.exitCode === 0 && result.stdout.trim().length > 0;
    } catch {
      // The docker binary itself is missing.
      return false;
    }
  }
}

function dockerError(action: string, result: ProcessResult): Error {
  const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.exitCode}`;
  return new Error(`Docker ${action} failed: ${detail.slice(0, 500)}`);
}
