export class CapabilityUnavailableError extends Error {
  constructor(readonly capability: string) {
    super(`Capability ${capability} is not configured`);
    this.name = 'CapabilityUnavailableError';
  }
}

export interface CapabilityPort {
  invoke(capability: string, input: unknown): Promise<unknown>;
}

export class UnavailableCapabilityPort implements CapabilityPort {
  invoke(capability: string): Promise<never> {
    return Promise.reject(new CapabilityUnavailableError(capability));
  }
}

export const unavailableCapabilityPort = new UnavailableCapabilityPort();
