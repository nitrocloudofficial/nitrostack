import { Injectable } from '@nitrostack/core';
import type { FactChange, AuthoritativeSource } from '../types/index.js';
import { DataLoaderService, KnowledgeInputError } from './data-loader.service.js';

// ---------------------------------------------------------------------------
// ChangeDetectionService
// ---------------------------------------------------------------------------
// Compares the current authoritative sources (v2) against the previous
// version (v1) and reports every fact-level difference.
// ---------------------------------------------------------------------------

export interface ChangeDetectionResult {
  /** Total number of authoritative sources inspected. */
  total_sources_checked: number;
  /** Number of sources that contain at least one changed fact. */
  sources_with_changes: number;
  /** Flat list of every fact change (only entries where changed === true). */
  changes: FactChange[];
}

@Injectable({ deps: [DataLoaderService] })
export class ChangeDetectionService {
  constructor(private readonly dataLoader: DataLoaderService) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Compare current (v2) authoritative sources against the previous (v1)
   * snapshot and return a list of fact-level changes.
   *
   * When `sourceId` is provided, only that source is inspected; otherwise
   * every source is checked.
   *
   * @param sourceId  Optional — limit detection to a single authoritative source.
   * @returns         A {@link ChangeDetectionResult} containing aggregate counts
   *                  and the flat list of changed facts.
   */
  detectChanges(sourceId?: string): ChangeDetectionResult {
    const currentSources = this.dataLoader.getAuthoritativeSources();
    const previousSources = this.dataLoader.getPreviousSources();

    if (sourceId !== undefined && !this.dataLoader.getSourceById(sourceId)) {
      throw new KnowledgeInputError(`Unknown authoritative source: ${sourceId}`);
    }

    // If a specific source was requested, filter both lists to just that one.
    const sourcesToCheck = sourceId
      ? currentSources.filter((s) => s.id === sourceId)
      : currentSources;

    const changes: FactChange[] = [];

    for (const currentSource of sourcesToCheck) {
      const previousSource = previousSources.find(
        (s) => s.id === currentSource.id,
      );

      // If we don't have a previous version, every fact in the current
      // source is effectively "new" — but the plan focuses on changed
      // facts, so we skip sources that didn't exist before.
      if (!previousSource) continue;

      // Compare each fact in the current source against the previous.
      changes.push(
        ...this.compareFacts(currentSource, previousSource),
      );
    }

    // Only return entries where something actually changed.
    const changedFacts = changes.filter((c) => c.changed);

    const sourcesWithChanges = new Set(
      changedFacts.map((c) => c.source_id),
    ).size;

    return {
      total_sources_checked: sourcesToCheck.length,
      sources_with_changes: sourcesWithChanges,
      changes: changedFacts,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Compare every fact between two versions of the same authoritative source
   * and emit a {@link FactChange} entry for each fact key.
   */
  private compareFacts(
    current: AuthoritativeSource,
    previous: AuthoritativeSource,
  ): FactChange[] {
    const result: FactChange[] = [];

    // Gather the union of fact keys from both versions.
    const allFactKeys = new Set([
      ...Object.keys(current.facts),
      ...Object.keys(previous.facts),
    ]);

    for (const factKey of allFactKeys) {
      const oldValue = previous.facts[factKey] ?? '(removed)';
      const newValue = current.facts[factKey] ?? '(removed)';

      result.push({
        source_id: current.id,
        source_title: current.title,
        fact_key: factKey,
        old_value: oldValue,
        new_value: newValue,
        changed: oldValue !== newValue,
      });
    }

    return result;
  }
}
