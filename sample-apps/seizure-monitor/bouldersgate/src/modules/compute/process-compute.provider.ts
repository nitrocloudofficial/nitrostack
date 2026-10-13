import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import { mkdirSync, rmdirSync, rmSync } from 'node:fs';
import { execPath } from 'node:process';
import { dirname, isAbsolute, join, relative, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import type { ComputeProvider } from './compute-provider.js';
import { runProcess } from './process-runner.js';
import type {
  BackendId,
  ComputeOffer,
  EnvironmentRecord,
  ExecutionResult,
  RuntimeAttestation,
  RuntimeId,
} from './compute.types.js';

/**
 * The backend for hosts with no container daemon — NitroCloud's Knative
 * runtime, most notably. It runs the agent's code in a real, separate OS
 * process with three enforced bounds:
 *
 *   - filesystem: Node's permission model confines reads and writes to the
 *     environment's own workspace, so the server's source and secrets are
 *     unreachable;
 *   - environment: the child inherits no environment variables at all, so no
 *     API key or platform token can be read out of `process.env`;
 *   - network: the child runs in a private network namespace when the host
 *     allows one, which makes the granted `network: none` enforced rather
 *     than promised.
 *
 * This is a weaker boundary than a container, which is itself a weaker boundary
 * than a microVM. The attestation returned to the agent states which of these
 * bounds are actually active on this host.
 */

const PROBE_TIMEOUT_MS = 5_000;
const WORKSPACE_PREFIX = 'bouldersgate';

const RUNTIME_MAJOR: Partial<Record<RuntimeId, number>> = {
  node20: 20,
  node22: 22,
};

/**
 * Runs before the agent's code in the same process. Removes the network
 * surface that a private namespace would otherwise be the only thing blocking.
 */
const PROLOGUE = [
  "const $m=require('module');",
  "const $blocked=new Set(['net','tls','http','http2','https','dgram','dns','dns/promises','inspector']);",
  'const $load=$m._load;',
  "$m._load=function(id){const $id=String(id).replace(/^node:/,'');",
  "if($blocked.has($id)){throw new Error('BouldersGate: this environment was granted no network access.');}",
  'return $load.apply(this,arguments);};',
  "for(const $k of ['fetch','WebSocket','XMLHttpRequest','EventSource']){try{delete globalThis[$k];}catch{}}",
].join('');

@Injectable()
export class ProcessComputeProvider implements ComputeProvider {
  readonly name: BackendId = 'process';

  private readonly root = join(tmpdir(), `${WORKSPACE_PREFIX}-${process.pid}`);
  private netnsCapable?: boolean;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async attest(runtime: RuntimeId): Promise<RuntimeAttestation> {
    const isolated = await this.canIsolateNetwork();
    return {
      backend: this.name,
      reference: `node:${process.versions.node}`,
      digest: null,
      source: 'host',
      resolvedAt: new Date().toISOString(),
      note: [
        `Bounded host process satisfying "${runtime}".`,
        'Filesystem access is confined to the environment workspace and no environment variables are inherited.',
        isolated
          ? 'Egress is removed with a private network namespace.'
          : 'This host allows no private network namespace, so egress is blocked in-process only — a weaker guarantee.',
      ].join(' '),
    };
  }

  async materialize(offer: ComputeOffer): Promise<EnvironmentRecord> {
    if (offer.granted.network.mode !== 'none') {
      throw new Error('The process backend cannot enforce a non-empty egress allowlist.');
    }

    const required = RUNTIME_MAJOR[offer.granted.runtime];
    if (required === undefined) {
      throw new Error(
        `The process backend serves Node runtimes only; "${offer.granted.runtime}" needs a container backend.`,
      );
    }

    const hostMajor = Number(process.versions.node.split('.')[0]);
    if (hostMajor < required) {
      throw new Error(
        `This host runs Node ${process.versions.node}, which cannot satisfy "${offer.granted.runtime}".`,
      );
    }

    const environmentId = `env_${randomUUID()}`;
    const lifetimeSeconds = offer.granted.durationMinutes * 60;
    mkdirSync(this.workspaceOf(environmentId), { recursive: true });

    const now = new Date();
    return {
      environmentId,
      agentId: offer.agentId,
      provider: this.name,
      providerRef: this.workspaceOf(environmentId),
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
    const workspace = environment.providerRef;
    const program = this.compile(argv, workspace);

    const nodeArgs = [
      '--no-warnings',
      '--experimental-permission',
      `--allow-fs-read=${workspace}`,
      `--allow-fs-write=${workspace}`,
      `--max-old-space-size=${environment.granted.memoryMb}`,
      '-e',
      `${PROLOGUE}\n${program}`,
    ];

    const isolated = await this.canIsolateNetwork();
    const [executable, args] = isolated
      ? ['unshare', ['--user', '--map-root-user', '--net', execPath, ...nodeArgs]]
      : [execPath, nodeArgs];

    const result = await runProcess(executable, args, {
      timeoutMs: timeoutSeconds * 1000,
      cwd: workspace,
      // A wholly empty environment: the child can read no key this server holds.
      env: {},
    });

    return {
      environmentId: environment.environmentId,
      ...result,
    };
  }

  async release(environment: EnvironmentRecord): Promise<void> {
    rmSync(dirname(environment.providerRef), { recursive: true, force: true });
    // Leave nothing behind once the last environment of this server is gone.
    try {
      rmdirSync(this.root);
    } catch {
      // Still in use, or already gone.
    }
  }

  private workspaceOf(environmentId: string): string {
    return join(this.root, environmentId, 'workspace');
  }

  /**
   * The protocol speaks in argument vectors so a container backend can run any
   * executable. A bare process backend has no image to run them from, so it
   * accepts the Node invocations it can honestly serve and refuses the rest by
   * name rather than failing obscurely.
   */
  private compile(argv: string[], workspace: string): string {
    const [executable, ...rest] = argv;
    if (executable !== 'node') {
      throw new Error(
        `The process backend can only execute "node"; "${executable}" requires a container backend.`,
      );
    }

    if (rest.length === 0) {
      throw new Error('Provide a script path, or -e with a program.');
    }

    if (rest[0] === '-v' || rest[0] === '--version') {
      return 'console.log(process.version);';
    }

    if (rest[0] === '-e' || rest[0] === '--eval') {
      const code = rest[1];
      if (code === undefined) {
        throw new Error('-e requires a program.');
      }
      return code;
    }

    const target = resolvePath(workspace, rest[0]);
    const inside = relative(workspace, target);
    if (inside.startsWith('..') || isAbsolute(inside)) {
      throw new Error('Script paths must stay inside the environment workspace.');
    }
    return `require(${JSON.stringify(target)});`;
  }

  private async canIsolateNetwork(): Promise<boolean> {
    if (this.netnsCapable !== undefined) {
      return this.netnsCapable;
    }
    try {
      const result = await runProcess(
        'unshare',
        ['--user', '--map-root-user', '--net', execPath, '-e', 'process.exit(0)'],
        { timeoutMs: PROBE_TIMEOUT_MS, env: {} },
      );
      this.netnsCapable = result.exitCode === 0;
    } catch {
      this.netnsCapable = false;
    }
    return this.netnsCapable;
  }
}
