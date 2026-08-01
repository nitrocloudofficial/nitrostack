/**
 * Single in-memory store for the surface module. No database, per CLAUDE.md.
 *
 * Deliberately stores only the two real inputs (ingested records, raw spec
 * paths) rather than caching derived findings/topology. runDetection is a
 * pure function of (records, documentedTemplates) — recomputing it on every
 * call is cheap (well under a second on the fixture dataset) and makes
 * staleness bugs structurally impossible: there's no cache to invalidate
 * when logs are re-ingested or a spec is imported after the fact.
 */

import { Injectable } from '@nitrostack/core';
import type { AccessLogRecord } from '../../engine/types.js';
import { aggregateEndpoints } from '../../engine/topology.js';
import { diffSpec } from '../../engine/spec.js';

@Injectable()
export class SurfaceStateService {
  private records: AccessLogRecord[] = [];
  private rawSpecPaths: string[] = [];
  private specSource: string | null = null;

  ingestRecords(records: AccessLogRecord[]): void {
    this.records = records;
  }

  setSpec(rawSpecPaths: string[], source: string): void {
    this.rawSpecPaths = rawSpecPaths;
    this.specSource = source;
  }

  getRecords(): AccessLogRecord[] {
    return this.records;
  }

  getRawSpecPaths(): string[] {
    return this.rawSpecPaths;
  }

  getSpecSource(): string | null {
    return this.specSource;
  }

  hasLogs(): boolean {
    return this.records.length > 0;
  }

  hasSpec(): boolean {
    return this.specSource !== null;
  }

  /**
   * Resolves the current documented/orphaned split fresh, using whatever
   * records and spec are currently in state. Position-based matching (see
   * spec.ts) happens here, once, so every tool that needs "is this template
   * documented" agrees with every other one.
   */
  computeDocumented(): { documentedTemplates: string[]; orphanedInSpec: string[] } {
    if (this.rawSpecPaths.length === 0) return { documentedTemplates: [], orphanedInSpec: [] };
    const observed = aggregateEndpoints(this.records, []);
    const diff = diffSpec(observed, this.rawSpecPaths);
    return { documentedTemplates: diff.documented.map((t) => t.template), orphanedInSpec: diff.orphanedInSpec };
  }
}
