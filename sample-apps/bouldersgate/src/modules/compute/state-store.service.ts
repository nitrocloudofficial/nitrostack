import { Injectable } from '@nitrostack/core';
import type {
  ComputeOffer,
  EnvironmentRecord,
  PublicEnvironment,
} from './compute.types.js';

function publicEnvironment(environment: EnvironmentRecord): PublicEnvironment {
  return {
    environmentId: environment.environmentId,
    runtime: environment.runtime,
    granted: structuredClone(environment.granted),
    attestation: structuredClone(environment.attestation),
    createdAt: environment.createdAt,
    expiresAt: environment.expiresAt,
    status: environment.status,
    ...(environment.releasedAt ? { releasedAt: environment.releasedAt } : {}),
  };
}

@Injectable()
export class StateStoreService {
  private readonly offers = new Map<string, ComputeOffer>();
  private readonly environments = new Map<string, EnvironmentRecord>();

  saveOffer(offer: ComputeOffer): void {
    this.offers.set(offer.offerId, structuredClone(offer));
  }

  claimOffer(agentId: string, offerId: string, now = new Date()): ComputeOffer {
    const offer = this.offers.get(offerId);
    if (!offer || offer.agentId !== agentId) {
      throw new Error('Offer not found for this agent.');
    }
    if (new Date(offer.expiresAt).getTime() <= now.getTime()) {
      offer.status = 'expired';
      throw new Error('Offer has expired; request a new counter-offer.');
    }
    if (offer.status !== 'pending') {
      throw new Error(`Offer cannot be accepted from status "${offer.status}".`);
    }

    offer.status = 'accepting';
    return structuredClone(offer);
  }

  markOfferAccepted(offerId: string, environmentId: string): void {
    const offer = this.requireOffer(offerId);
    offer.status = 'accepted';
    offer.environmentId = environmentId;
  }

  markOfferFailed(offerId: string): void {
    const offer = this.requireOffer(offerId);
    offer.status = 'failed';
  }

  saveEnvironment(environment: EnvironmentRecord): void {
    this.environments.set(environment.environmentId, structuredClone(environment));
  }

  getEnvironment(agentId: string, environmentId: string): EnvironmentRecord {
    const environment = this.environments.get(environmentId);
    if (!environment || environment.agentId !== agentId) {
      throw new Error('Environment not found for this agent.');
    }
    return structuredClone(environment);
  }

  getPublicEnvironment(agentId: string, environmentId: string): PublicEnvironment {
    return publicEnvironment(this.getEnvironment(agentId, environmentId));
  }

  listEnvironments(agentId: string): PublicEnvironment[] {
    return [...this.environments.values()]
      .filter((environment) => environment.agentId === agentId)
      .map(publicEnvironment)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  markEnvironmentReleased(
    agentId: string,
    environmentId: string,
    status: 'released' | 'expired' = 'released',
    now = new Date(),
  ): PublicEnvironment {
    const environment = this.environments.get(environmentId);
    if (!environment || environment.agentId !== agentId) {
      throw new Error('Environment not found for this agent.');
    }

    if (environment.status === 'active') {
      environment.status = status;
      environment.releasedAt = now.toISOString();
    }
    return publicEnvironment(environment);
  }

  activeEnvironments(): EnvironmentRecord[] {
    return [...this.environments.values()]
      .filter((environment) => environment.status === 'active')
      .map((environment) => structuredClone(environment));
  }

  private requireOffer(offerId: string): ComputeOffer {
    const offer = this.offers.get(offerId);
    if (!offer) {
      throw new Error('Offer not found.');
    }
    return offer;
  }
}
