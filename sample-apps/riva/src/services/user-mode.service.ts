import { Injectable } from '@nitrostack/core';
import type { UserMode } from '../domain/types.js';

/**
 * UserModeService
 *
 * Tracks whether the current conversation is in "rider" or "driver" mode.
 * Same deliberate simplification as PreferenceService: Phase 1/2 have no
 * user accounts, so this is a single process-wide value rather than being
 * keyed by user ID. It exists purely to give the client/LLM a clear signal
 * about which set of tools/behavior is currently relevant — it does not
 * gate tool availability at the MCP protocol level (all tools remain
 * callable regardless of mode).
 */
@Injectable()
export class UserModeService {
  private mode: UserMode = 'rider';
  private explicitlySet = false;

  set(mode: UserMode): UserMode {
    this.mode = mode;
    this.explicitlySet = true;
    return this.mode;
  }

  get(): UserMode {
    return this.mode;
  }

  /** True once set_user_mode has actually been called — false means we're still on the silent default. */
  isExplicitlySet(): boolean {
    return this.explicitlySet;
  }
}
