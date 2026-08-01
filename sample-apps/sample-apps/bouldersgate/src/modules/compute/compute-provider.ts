import type {
  BackendId,
  ComputeOffer,
  EnvironmentRecord,
  ExecutionResult,
  RuntimeAttestation,
  RuntimeId,
} from './compute.types.js';

/**
 * The seam between the negotiation protocol and whatever actually runs code.
 * Everything above this interface — policy, offers, deltas, ownership, audit —
 * is identical whether the backend is a container, a bounded process, a
 * microVM, or a Kubernetes workload.
 */
export interface ComputeProvider {
  readonly name: BackendId;

  /** Whether this backend can serve requests in the current environment. */
  isAvailable(): Promise<boolean>;

  /** What the granted runtime resolves to on this backend. Must not throw. */
  attest(runtime: RuntimeId): Promise<RuntimeAttestation>;

  materialize(offer: ComputeOffer): Promise<EnvironmentRecord>;

  execute(
    environment: EnvironmentRecord,
    argv: string[],
    timeoutSeconds: number,
  ): Promise<ExecutionResult>;

  release(environment: EnvironmentRecord): Promise<void>;
}

/** What the protocol layer needs from backend selection, and nothing more. */
export interface BackendSelector {
  select(): Promise<ComputeProvider>;
}
