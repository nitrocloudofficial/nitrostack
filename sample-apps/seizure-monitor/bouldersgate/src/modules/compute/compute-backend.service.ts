import { Injectable } from '@nitrostack/core';
import type { ComputeProvider } from './compute-provider.js';
import { DockerComputeProvider } from './docker-compute.provider.js';
import { ProcessComputeProvider } from './process-compute.provider.js';
import type { BackendId } from './compute.types.js';

/**
 * Chooses which backend serves this deployment.
 *
 * A container is the stronger boundary, so it wins whenever a daemon answers.
 * NitroCloud's Knative runtime exposes no Docker daemon, so the same build
 * falls back to the bounded process backend there instead of failing at
 * `accept_offer`. `BOULDERSGATE_BACKEND` pins the choice when a deployment wants
 * one backend or nothing.
 */

const SELECTION_CACHE_MS = 30_000;

@Injectable({ deps: [DockerComputeProvider, ProcessComputeProvider] })
export class ComputeBackendService {
  private selection?: { provider: ComputeProvider; selectedAt: number };

  constructor(
    private readonly docker: DockerComputeProvider,
    private readonly process: ProcessComputeProvider,
  ) {}

  async select(now = Date.now()): Promise<ComputeProvider> {
    if (this.selection && now - this.selection.selectedAt < SELECTION_CACHE_MS) {
      return this.selection.provider;
    }

    const provider = await this.resolve();
    this.selection = { provider, selectedAt: now };
    return provider;
  }

  private async resolve(): Promise<ComputeProvider> {
    const pinned = process.env.BOULDERSGATE_BACKEND?.trim().toLowerCase() as
      | BackendId
      | 'auto'
      | undefined;

    if (pinned === 'docker') {
      if (!(await this.docker.isAvailable())) {
        throw new Error('BOULDERSGATE_BACKEND=docker, but no Docker daemon is reachable.');
      }
      return this.docker;
    }
    if (pinned === 'process') {
      return this.process;
    }

    return (await this.docker.isAvailable()) ? this.docker : this.process;
  }
}
