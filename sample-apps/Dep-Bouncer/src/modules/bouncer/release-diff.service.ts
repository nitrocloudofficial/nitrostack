import { Injectable } from '@nitrostack/core';
import { createHash } from 'node:crypto';
import { scanSource, type PatternHit } from '../analysis/code-patterns.js';
import type { FileMap, VersionManifest } from '../analysis/signal.js';
import { NpmRegistryService } from '../registry/npm-registry.service.js';
import { TarballService } from '../registry/tarball.service.js';

export interface DependencyDiff {
  added: { name: string; range: string }[];
  removed: { name: string; range: string }[];
  changed: { name: string; before: string; after: string }[];
}

export interface ManifestDiff {
  publisher: { before: string | null; after: string | null };
  provenance: { before: boolean; after: boolean };
  /** Only changed install lifecycle scripts, in execution order. */
  scripts: { name: string; before: string | null; after: string | null }[];
  dependencies: DependencyDiff;
  optionalDependencies: DependencyDiff;
  /** Unknown or invalid dates produce a null gap. Negative gaps preserve comparison direction. */
  publishTimes: { before: string | null; after: string | null; gapHours: number | null };
}

export interface FileChange {
  path: string;
  bytesBefore?: number;
  bytesAfter?: number;
}

export interface ReleaseFileDiff {
  /** Each list is sorted by path and capped at 50 entries. */
  added: FileChange[];
  removed: FileChange[];
  changed: FileChange[];
  counts: { added: number; removed: number; changed: number };
}

export interface FlaggedPattern extends PatternHit {
  path: string;
}

export interface ReleaseDiff extends ManifestDiff {
  name: string;
  from: string;
  to: string;
  files: ReleaseFileDiff | null;
  filesError?: string;
  /** At most 20 patterns newly present in added/changed JS files, compared by id per path. */
  flagged: FlaggedPattern[];
}

function diffDependencies(before: Record<string, string> = {}, after: Record<string, string> = {}): DependencyDiff {
  const result: DependencyDiff = { added: [], removed: [], changed: [] };
  for (const name of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    if (!Object.hasOwn(before, name)) result.added.push({ name, range: after[name] });
    else if (!Object.hasOwn(after, name)) result.removed.push({ name, range: before[name] });
    else if (before[name] !== after[name]) result.changed.push({ name, before: before[name], after: after[name] });
  }
  return result;
}

/** Compare registry metadata without fetching either release. */
export function diffManifests(before: VersionManifest, after: VersionManifest,
  time: Record<string, string> = {}): ManifestDiff {
  const publishedBefore = time[before.version] ?? null;
  const publishedAfter = time[after.version] ?? null;
  const gap = publishedBefore && publishedAfter
    ? (Date.parse(publishedAfter) - Date.parse(publishedBefore)) / 3_600_000 : NaN;
  return {
    publisher: { before: before._npmUser?.name ?? null, after: after._npmUser?.name ?? null },
    provenance: { before: Boolean(before.dist.attestations), after: Boolean(after.dist.attestations) },
    scripts: ['preinstall', 'install', 'postinstall'].flatMap(name => {
      const previous = before.scripts?.[name] ?? null;
      const next = after.scripts?.[name] ?? null;
      return previous === next ? [] : [{ name, before: previous, after: next }];
    }),
    dependencies: diffDependencies(before.dependencies, after.dependencies),
    optionalDependencies: diffDependencies(before.optionalDependencies, after.optionalDependencies),
    publishTimes: { before: publishedBefore, after: publishedAfter, gapHours: Number.isFinite(gap) ? gap : null },
  };
}

const hash = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** Compare all paths before capping output; scanning is independent of the 50-file list caps. */
export function diffFiles(before: FileMap, after: FileMap): { files: ReleaseFileDiff; flagged: FlaggedPattern[] } {
  const files: ReleaseFileDiff = {
    added: [], removed: [], changed: [], counts: { added: 0, removed: 0, changed: 0 },
  };
  const flagged: FlaggedPattern[] = [];
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const previous = before.get(path);
    const next = after.get(path);
    let kind: 'added' | 'removed' | 'changed';
    if (previous === undefined) kind = 'added';
    else if (next === undefined) kind = 'removed';
    else if (hash(previous) !== hash(next)) kind = 'changed';
    else continue;

    files.counts[kind]++;
    if (files[kind].length < 50) {
      files[kind].push({ path,
        ...(previous === undefined ? {} : { bytesBefore: previous.byteLength }),
        ...(next === undefined ? {} : { bytesAfter: next.byteLength }),
      });
    }
    if (!next || !/\.(?:js|cjs|mjs)$/i.test(path) || next.byteLength > 8 * 1024 * 1024 || flagged.length >= 20) continue;
    const oldIds = new Set(previous ? scanSource(path, Buffer.from(previous).toString('utf8')).map(hit => hit.id) : []);
    for (const hit of scanSource(path, Buffer.from(next).toString('utf8'))) {
      if (!oldIds.has(hit.id)) flagged.push({ path, ...hit, snippet: hit.snippet.slice(0, 120) });
      if (flagged.length === 20) break;
    }
  }
  return { files, flagged };
}

@Injectable({ deps: [NpmRegistryService, TarballService] })
export class ReleaseDiffService {
  constructor(private readonly registry: NpmRegistryService, private readonly tarballs: TarballService) {}

  async diff(name: string, from: string, to: string): Promise<ReleaseDiff> {
    const packument = await this.registry.getPackument(name);
    if (!packument) throw new Error(`${name} does not exist on npm`);
    const manifests = [from, to].map(version => {
      const manifest = Object.hasOwn(packument.versions, version) ? packument.versions[version] : undefined;
      if (!manifest) {
        throw new Error(Object.hasOwn(packument.time, version)
          ? `${name}@${version} was published and later removed from npm`
          : `${name}@${version} is not on the registry`);
      }
      return manifest;
    });
    const [before, after] = manifests;
    const metadata = { name, from, to, ...diffManifests(before, after, packument.time) };
    let loaded: [FileMap, FileMap];
    try {
      loaded = await Promise.all([
        this.tarballs.fetchFiles(before.dist.tarball),
        this.tarballs.fetchFiles(after.dist.tarball),
      ]);
    } catch (error) {
      return { ...metadata, files: null, filesError: error instanceof Error ? error.message : String(error), flagged: [] };
    }
    return { ...metadata, ...diffFiles(...loaded) };
  }
}
