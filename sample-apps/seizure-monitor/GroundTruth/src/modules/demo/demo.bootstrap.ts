import { Injectable, OnApplicationBootstrap } from '@nitrostack/core';
import { store } from '../../store/store.js';
import { seedHistory } from './demo.tools.js';

/**
 * Re-seeds demo history on boot when the store is empty.
 *
 * A deployed container starts with an empty data file, and every push
 * auto-deploys — so the seeded history a demo depends on disappears the moment
 * anyone commits. Discovering that minutes before recording, and having to
 * re-run a tool by hand against production, is exactly the kind of avoidable
 * failure that costs a demo.
 *
 * Opt-in via DEMO_AUTOSEED, and only ever runs when there are no reports at
 * all, so it can never overwrite real submissions.
 */
@Injectable()
export class DemoAutoSeed implements OnApplicationBootstrap {
  async onApplicationBootstrap(): Promise<void> {
    const enabled = /^(1|true|yes)$/i.test(process.env.DEMO_AUTOSEED?.trim() ?? '');
    if (!enabled) return;

    const existing = store.listReports().length;
    if (existing > 0) {
      // Never clobber a running instance that already has data.
      console.error(
        `[demo] DEMO_AUTOSEED is on but ${existing} report(s) already exist — leaving them alone.`,
      );
      return;
    }

    const days = Number(process.env.DEMO_AUTOSEED_DAYS ?? 3);
    const created = seedHistory(Number.isFinite(days) && days > 0 ? days : 3, false);

    // stderr, not stdout — stdout carries the MCP JSON-RPC stream.
    console.error(
      `[demo] Store was empty; seeded ${created.length} report(s) across ${days} prior day(s). ` +
        "Today is intentionally left empty so it can be submitted live.",
    );
  }
}
