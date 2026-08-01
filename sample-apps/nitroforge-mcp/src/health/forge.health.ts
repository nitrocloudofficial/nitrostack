import { HealthCheck, Injectable, Inject, type HealthCheckInterface, type HealthCheckResult } from '@nitrostack/core';
import { ARTIFACT_STORE, type ArtifactStore } from '../contracts/store.contract.js';

/**
 * @HealthCheck is a CLASS decorator here, not a method decorator — confirmed
 * from the real CLI-generated system.health.ts (`@HealthCheck({ name,
 * description, interval }) class X implements HealthCheckInterface { async
 * check(): Promise<HealthCheckResult> }`). The SDK reference doc I fetched
 * earlier showed it as a method decorator (`@HealthCheck('database') async
 * checkDatabase()`) — that's wrong for this installed version.
 */
@HealthCheck({
  name: 'forge',
  description: 'ArtifactStore reachability and basic pipeline health',
  interval: 30,
})
@Injectable({ deps: [ARTIFACT_STORE] })
export class ForgeHealthCheck implements HealthCheckInterface {
  constructor(@Inject(ARTIFACT_STORE) private readonly store: ArtifactStore) {}

  async check(): Promise<HealthCheckResult> {
    try {
      // No list()/ping() in the frozen ArtifactStore contract, and writing
      // a probe record every 30s would pollute the store with garbage. A
      // read-only lookup against a bogus id exercises the store's code
      // path (and would throw if it were genuinely broken) without side
      // effects — a resolved `null` is the expected, healthy result.
      await this.store.getGraph('health_probe_nonexistent');
      return {
        status: 'up',
        message: 'ArtifactStore is reachable',
        details: { uptime: `${Math.floor(process.uptime())}s` },
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'ArtifactStore threw during health probe',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}
