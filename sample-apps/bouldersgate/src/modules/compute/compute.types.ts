export const supportedRuntimeIds = [
  'node20',
  'node22',
  'python312',
  'python313',
] as const;

export type RuntimeId = (typeof supportedRuntimeIds)[number];

export type NetworkRequirement =
  | { mode: 'none' }
  | { mode: 'allowlist'; allowedHosts: string[] }
  | { mode: 'unrestricted' };

export interface ComputeRequest {
  runtime: RuntimeId;
  memoryMb: number;
  cpuCores: number;
  durationMinutes: number;
  network: NetworkRequirement;
  privileged: boolean;
  hostFilesystem: boolean;
  dockerSocket: boolean;
}

export type BackendId = 'docker' | 'process';

/**
 * What the granted runtime actually resolves to. For the container backend this
 * is an immutable image digest read from the Docker Hub registry at offer time,
 * so the tag cannot be re-pointed between `request_compute` and `accept_offer`.
 */
export interface RuntimeAttestation {
  backend: BackendId;
  reference: string;
  digest: string | null;
  source: 'registry' | 'cache' | 'host' | 'unavailable';
  resolvedAt: string;
  note?: string;
}

export interface GrantedCompute {
  runtime: RuntimeId;
  memoryMb: number;
  cpuCores: number;
  durationMinutes: number;
  network: {
    mode: 'none' | 'allowlist';
    allowedHosts: string[];
  };
}

export type DeltaKind = 'reduced' | 'narrowed';

export interface OfferDelta {
  kind: DeltaKind;
  path: string;
  requested: string | number | string[];
  granted: string | number | string[];
  reason: string;
}

export interface Denial {
  path: string;
  requested: string | boolean;
  reason: string;
}

export interface ComputeOffer {
  offerId: string;
  agentId: string;
  decision: 'exact' | 'counter_offer';
  requested: ComputeRequest;
  granted: GrantedCompute;
  attestation: RuntimeAttestation;
  deltas: OfferDelta[];
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepting' | 'accepted' | 'failed' | 'expired';
  environmentId?: string;
}

/** An offer as returned to the agent: ownership and internal status stripped. */
export type PublicOffer = Omit<ComputeOffer, 'agentId' | 'status'>;

/**
 * What PolicyService produces. Policy decides the envelope; it does not know
 * which backend will serve it, so attestation is attached one layer up.
 */
export type PolicyOffer = Omit<PublicOffer, 'attestation'>;

export interface PolicyDecision {
  decision: 'exact' | 'counter_offer' | 'denied';
  offer?: PolicyOffer;
  denials: Denial[];
}

export interface NegotiationResult {
  decision: 'exact' | 'counter_offer' | 'denied';
  offer?: PublicOffer;
  denials: Denial[];
}

export interface EnvironmentRecord {
  environmentId: string;
  agentId: string;
  provider: string;
  providerRef: string;
  runtime: RuntimeId;
  granted: GrantedCompute;
  attestation: RuntimeAttestation;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'released' | 'expired' | 'failed';
  releasedAt?: string;
}

export interface PublicEnvironment {
  environmentId: string;
  runtime: RuntimeId;
  granted: GrantedCompute;
  attestation: RuntimeAttestation;
  createdAt: string;
  expiresAt: string;
  status: EnvironmentRecord['status'];
  releasedAt?: string;
}

export interface ExecutionResult {
  environmentId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
}

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  agentId: string;
  action:
    | 'compute.requested'
    | 'compute.denied'
    | 'offer.created'
    | 'offer.accepted'
    | 'offer.failed'
    | 'environment.executed'
    | 'environment.released';
  offerId?: string;
  environmentId?: string;
  details?: Record<string, string | number | boolean>;
}
