import { Injectable } from '@nitrostack/core';

@Injectable()
export class SingleFlightGate {
  private inFlight = new Map<string, Promise<any>>();
  private currentEpoch = 0;
  public isActive = false;

  /**
   * Coalesces identical read requests (based on key) into a single upstream call.
   */
  async coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isActive) {
      return fn();
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Write-fence: invalidates active cache windows the instant an asset transfer write occurs.
   * Uses an epoch counter to immediately drop stale reads.
   */
  invalidateFence(): void {
    this.currentEpoch++;
  }

  getEpoch(): number {
    return this.currentEpoch;
  }
}
