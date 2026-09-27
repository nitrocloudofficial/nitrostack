import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Injectable } from '@nitrostack/core';
import type { EvidenceSnapshotV2 } from '../../domain/evidence-snapshot.js';
import { ApiGuardConfig } from './config.service.js';

@Injectable({ deps: [ApiGuardConfig] })
export class EvidenceSnapshotRepository {
  private readonly memoryStore = new Map<string, EvidenceSnapshotV2>();

  constructor(private readonly config: ApiGuardConfig) {}

  private filePath(snapshotId: string): string {
    return resolve(process.cwd(), '.apiguard', 'snapshots', `${snapshotId}.json`);
  }

  save(snapshot: EvidenceSnapshotV2): EvidenceSnapshotV2 {
    const clone = structuredClone(snapshot);
    this.memoryStore.set(snapshot.snapshotId, clone);

    try {
      const file = this.filePath(snapshot.snapshotId);
      const dir = dirname(file);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(snapshot, null, 2), 'utf8');
      renameSync(tmp, file);
    } catch (err) {
      console.error('[EvidenceSnapshotRepository] Failed to persist snapshot file:', err);
    }
    return clone;
  }

  get(snapshotId: string): EvidenceSnapshotV2 | undefined {
    const cached = this.memoryStore.get(snapshotId);
    if (cached) return structuredClone(cached);

    try {
      const file = this.filePath(snapshotId);
      if (!existsSync(file)) return undefined;
      const raw = readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw) as EvidenceSnapshotV2;
      this.memoryStore.set(snapshotId, parsed);
      return structuredClone(parsed);
    } catch {
      return undefined;
    }
  }

  getLatestForScenario(scenarioId: string): EvidenceSnapshotV2 | undefined {
    let matches: EvidenceSnapshotV2[] = [];
    for (const snap of this.memoryStore.values()) {
      if (snap.scenarioId === scenarioId) matches.push(snap);
    }

    // Scan disk for missing snapshots
    try {
      const snapshotsDir = resolve(process.cwd(), '.apiguard', 'snapshots');
      if (existsSync(snapshotsDir)) {
        const { readdirSync } = require('node:fs');
        const files = readdirSync(snapshotsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const snapshotId = file.replace('.json', '');
            if (!this.memoryStore.has(snapshotId)) {
              const snap = this.get(snapshotId);
              if (snap && snap.scenarioId === scenarioId) {
                matches.push(snap);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[EvidenceSnapshotRepository] Failed to scan snapshot directory:', err);
    }

    if (matches.length > 0) {
      matches.sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));
      return structuredClone(matches[0]);
    }
    return undefined;
  }
}
