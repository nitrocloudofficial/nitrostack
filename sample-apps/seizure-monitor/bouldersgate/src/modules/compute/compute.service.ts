import { Injectable } from '@nitrostack/core';
import type { BeforeApplicationShutdown } from '@nitrostack/core';
import { AuditLogService } from './audit-log.service.js';
import type { BackendSelector } from './compute-provider.js';
import { ComputeBackendService } from './compute-backend.service.js';
import { PolicyService } from './policy.service.js';
import { StateStoreService } from './state-store.service.js';
import type {
  AuditEvent,
  ComputeOffer,
  ComputeRequest,
  EnvironmentRecord,
  ExecutionResult,
  NegotiationResult,
  PublicEnvironment,
  PublicOffer,
} from './compute.types.js';

function publicOffer(offer: ComputeOffer): PublicOffer {
  const { agentId: _agentId, status: _status, ...result } = offer;
  return result;
}

@Injectable({
  deps: [
    PolicyService,
    StateStoreService,
    ComputeBackendService,
    AuditLogService,
  ],
})
export class ComputeService implements BeforeApplicationShutdown {
  constructor(
    private readonly policy: PolicyService,
    private readonly state: StateStoreService,
    private readonly backend: BackendSelector,
    private readonly audit: AuditLogService,
  ) {}

  async requestCompute(agentId: string, request: ComputeRequest): Promise<NegotiationResult> {
    this.audit.record({
      agentId,
      action: 'compute.requested',
      details: {
        runtime: request.runtime,
        memoryMb: request.memoryMb,
        cpuCores: request.cpuCores,
        durationMinutes: request.durationMinutes,
      },
    });

    const result = this.policy.evaluate(agentId, request);
    if (result.decision === 'denied') {
      this.audit.record({
        agentId,
        action: 'compute.denied',
        details: { denialCount: result.denials.length },
      });
      return { decision: 'denied', denials: result.denials };
    }

    if (!result.offer) {
      throw new Error('Policy returned an invalid negotiation result.');
    }

    // Policy decides the envelope; the backend states what that envelope
    // actually resolves to, before the agent commits to it.
    const provider = await this.backend.select();
    const offer: ComputeOffer = {
      ...result.offer,
      attestation: await provider.attest(result.offer.granted.runtime),
      agentId,
      status: 'pending',
    };
    this.state.saveOffer(offer);
    this.audit.record({
      agentId,
      action: 'offer.created',
      offerId: offer.offerId,
      details: {
        decision: offer.decision,
        deltaCount: offer.deltas.length,
        backend: offer.attestation.backend,
      },
    });

    return {
      decision: result.decision,
      denials: result.denials,
      offer: publicOffer(offer),
    };
  }

  async acceptOffer(agentId: string, offerId: string): Promise<PublicEnvironment> {
    const offer = this.state.claimOffer(agentId, offerId);
    try {
      const provider = await this.backend.select();
      const environment = await provider.materialize(offer);
      this.state.saveEnvironment(environment);
      this.state.markOfferAccepted(offerId, environment.environmentId);
      this.audit.record({
        agentId,
        action: 'offer.accepted',
        offerId,
        environmentId: environment.environmentId,
        details: { provider: environment.provider },
      });
      return this.state.getPublicEnvironment(agentId, environment.environmentId);
    } catch (error) {
      this.state.markOfferFailed(offerId);
      this.audit.record({
        agentId,
        action: 'offer.failed',
        offerId,
      });
      throw error;
    }
  }

  async execute(
    agentId: string,
    environmentId: string,
    argv: string[],
    timeoutSeconds: number,
  ): Promise<ExecutionResult> {
    const environment = await this.requireActive(agentId, environmentId);
    const provider = await this.backend.select();
    const result = await provider.execute(environment, argv, timeoutSeconds);
    this.audit.record({
      agentId,
      action: 'environment.executed',
      environmentId,
      details: {
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        timedOut: result.timedOut,
        truncated: result.truncated,
      },
    });
    return result;
  }

  listEnvironments(agentId: string): PublicEnvironment[] {
    return this.state.listEnvironments(agentId);
  }

  listAuditEvents(agentId: string, limit: number): AuditEvent[] {
    return this.audit.forAgent(agentId, limit);
  }

  async release(agentId: string, environmentId: string): Promise<PublicEnvironment> {
    const environment = this.state.getEnvironment(agentId, environmentId);
    if (environment.status === 'active') {
      const provider = await this.backend.select();
      await provider.release(environment);
      this.state.markEnvironmentReleased(agentId, environmentId);
      this.audit.record({
        agentId,
        action: 'environment.released',
        environmentId,
      });
    }
    return this.state.getPublicEnvironment(agentId, environmentId);
  }

  async beforeApplicationShutdown(): Promise<void> {
    const active = this.state.activeEnvironments();
    if (active.length === 0) {
      return;
    }
    const provider = await this.backend.select();
    await Promise.allSettled(
      active.map(async (environment) => {
        await provider.release(environment);
        this.state.markEnvironmentReleased(
          environment.agentId,
          environment.environmentId,
        );
      }),
    );
  }

  private async requireActive(
    agentId: string,
    environmentId: string,
  ): Promise<EnvironmentRecord> {
    const environment = this.state.getEnvironment(agentId, environmentId);
    if (environment.status !== 'active') {
      throw new Error(`Environment is not active (status: ${environment.status}).`);
    }
    if (new Date(environment.expiresAt).getTime() <= Date.now()) {
      const provider = await this.backend.select();
      await provider.release(environment);
      this.state.markEnvironmentReleased(agentId, environmentId, 'expired');
      throw new Error('Environment has expired.');
    }
    return environment;
  }
}
