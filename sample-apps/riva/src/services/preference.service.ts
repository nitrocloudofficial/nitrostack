import { Injectable } from '@nitrostack/core';
import type { RiderPreferences } from '../domain/types.js';

/**
 * PreferenceService
 *
 * Phase 1 explicitly excludes user accounts and authentication, so there is
 * no per-user identity to key preferences against. We store a single
 * "active rider" preference set in memory for the life of the server
 * process. This is a deliberate, documented simplification for the
 * customer-only MVP — a future phase with accounts would key this by
 * user ID instead of using a process-wide singleton.
 */
@Injectable()
export class PreferenceService {
  private active: RiderPreferences = {};

  set(preferences: RiderPreferences): RiderPreferences {
    this.active = { ...this.active, ...preferences };
    return this.get();
  }

  get(): RiderPreferences {
    return { ...this.active };
  }

  reset(): void {
    this.active = {};
  }

  /** Merge explicit per-call preferences over the stored active preferences. */
  merge(overrides?: RiderPreferences): RiderPreferences {
    return { ...this.active, ...(overrides ?? {}) };
  }
}
