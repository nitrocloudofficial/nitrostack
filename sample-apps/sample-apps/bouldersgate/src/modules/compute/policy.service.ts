import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import type {
  ComputeRequest,
  Denial,
  GrantedCompute,
  NetworkRequirement,
  OfferDelta,
  PolicyDecision,
  PolicyOffer,
  RuntimeId,
} from './compute.types.js';

interface ComputePolicy {
  allowedRuntimes: RuntimeId[];
  maxMemoryMb: number;
  maxCpuCores: number;
  maxDurationMinutes: number;
  allowedHosts: string[];
  offerTtlSeconds: number;
}

const DEMO_POLICY: Readonly<ComputePolicy> = {
  allowedRuntimes: ['node20'],
  maxMemoryMb: 4096,
  maxCpuCores: 4,
  maxDurationMinutes: 20,
  // The first backend runs with Docker --network none. A proxy-backed allowlist
  // can expand this without changing the negotiation protocol.
  allowedHosts: [],
  offerTtlSeconds: 300,
};

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

function networkLabel(network: NetworkRequirement): string | string[] {
  if (network.mode === 'none') {
    return 'none';
  }
  if (network.mode === 'unrestricted') {
    return 'unrestricted';
  }
  return network.allowedHosts;
}

@Injectable()
export class PolicyService {
  /**
   * A field, deliberately not a constructor parameter. The DI container falls
   * back to `design:paramtypes` when a provider declares no explicit `deps`,
   * and an interface-typed parameter erases to `Object` — so the container
   * resolves `new Object()` and injects `{}`, silently replacing the policy
   * with an empty object. A constructor default does not save you: the
   * container passes an argument, so the default never applies.
   */
  private readonly policy: Readonly<ComputePolicy> = DEMO_POLICY;

  evaluate(agentId: string, request: ComputeRequest, now = new Date()): PolicyDecision {
    const denials = this.collectDenials(request);
    if (denials.length > 0) {
      return {
        decision: 'denied',
        denials,
      };
    }

    const deltas: OfferDelta[] = [];
    const granted: GrantedCompute = {
      runtime: request.runtime,
      memoryMb: this.reduceNumber(
        'limits.memoryMb.max',
        request.memoryMb,
        this.policy.maxMemoryMb,
        'Requested memory exceeds the agent policy cap.',
        deltas,
      ),
      cpuCores: this.reduceNumber(
        'limits.cpuCores.max',
        request.cpuCores,
        this.policy.maxCpuCores,
        'Requested CPU exceeds the agent policy cap.',
        deltas,
      ),
      durationMinutes: this.reduceNumber(
        'limits.durationMinutes.max',
        request.durationMinutes,
        this.policy.maxDurationMinutes,
        'Requested lifetime exceeds the agent policy cap.',
        deltas,
      ),
      network: this.negotiateNetwork(request.network, deltas),
    };

    const decision = deltas.length === 0 ? 'exact' : 'counter_offer';
    const expiresAt = new Date(now.getTime() + this.policy.offerTtlSeconds * 1000);
    const offer: PolicyOffer = {
      offerId: `offer_${randomUUID()}`,
      decision,
      requested: structuredClone(request),
      granted,
      deltas,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    return {
      decision,
      offer,
      denials: [],
    };
  }

  private collectDenials(request: ComputeRequest): Denial[] {
    const denials: Denial[] = [];

    if (!this.policy.allowedRuntimes.includes(request.runtime)) {
      denials.push({
        path: 'runtime',
        requested: request.runtime,
        reason: 'This runtime has no policy-permitted equivalent.',
      });
    }
    if (request.privileged) {
      denials.push({
        path: 'privileged',
        requested: true,
        reason: 'Privileged execution has no safe reduced form.',
      });
    }
    if (request.hostFilesystem) {
      denials.push({
        path: 'hostFilesystem',
        requested: true,
        reason: 'Host filesystem access has no safe reduced form.',
      });
    }
    if (request.dockerSocket) {
      denials.push({
        path: 'dockerSocket',
        requested: true,
        reason: 'Docker socket access would delegate infrastructure authority.',
      });
    }

    return denials;
  }

  private reduceNumber(
    path: string,
    requested: number,
    maximum: number,
    reason: string,
    deltas: OfferDelta[],
  ): number {
    if (requested <= maximum) {
      return requested;
    }

    deltas.push({
      kind: 'reduced',
      path,
      requested,
      granted: maximum,
      reason,
    });
    return maximum;
  }

  private negotiateNetwork(
    requested: NetworkRequirement,
    deltas: OfferDelta[],
  ): GrantedCompute['network'] {
    if (requested.mode === 'none') {
      return { mode: 'none', allowedHosts: [] };
    }

    const allowed = new Set(this.policy.allowedHosts.map(normalizeHost));
    const requestedHosts =
      requested.mode === 'unrestricted'
        ? []
        : [...new Set(requested.allowedHosts.map(normalizeHost))].sort();
    const grantedHosts = requestedHosts.filter((host) => allowed.has(host));
    const exact =
      requested.mode === 'allowlist' &&
      grantedHosts.length === requestedHosts.length;

    if (!exact) {
      deltas.push({
        kind: 'narrowed',
        path: 'network.allowedHosts',
        requested: networkLabel(requested),
        granted: grantedHosts.length === 0 ? 'none' : grantedHosts,
        reason: 'Outbound network access was intersected with the policy allowlist.',
      });
    }

    return grantedHosts.length === 0
      ? { mode: 'none', allowedHosts: [] }
      : { mode: 'allowlist', allowedHosts: grantedHosts };
  }
}

export { DEMO_POLICY };
