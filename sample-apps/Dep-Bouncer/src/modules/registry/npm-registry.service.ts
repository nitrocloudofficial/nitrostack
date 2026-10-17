import { Injectable } from '@nitrostack/core';
import type { PackageInfo, VersionManifest } from '../analysis/signal.js';
import { fetchBytes, fetchJson, UpstreamError } from './http.js';
import { compare, parse, satisfies } from './semver.js';
import { TtlCache } from './ttl-cache.js';

const REGISTRY = 'https://registry.npmjs.org';
const DOWNLOADS = 'https://api.npmjs.org/downloads/point/last-week';

/** The parts of an npm packument Dep Bouncer reads. */
export interface Packument {
  name: string;
  'dist-tags': Record<string, string>;
  time: Record<string, string>;
  versions: Record<string, VersionManifest>;
}

const NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;

export class InvalidPackageNameError extends Error {
  constructor(name: string) {
    super(`"${name}" is not a valid npm package name`);
    this.name = 'InvalidPackageNameError';
  }
}

/** Throws unless `name` is a syntactically valid npm package name. */
export function assertValidName(name: string): void {
  if (name.length === 0 || name.length > 214 || !NAME.test(name)) {
    throw new InvalidPackageNameError(name);
  }
}

function encodeName(name: string): string {
  return name.startsWith('@') ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
}

/** Keeps only the manifest fields of the contract, so cached packuments stay small. */
function trimManifest(m: VersionManifest): VersionManifest {
  return {
    name: m.name,
    version: m.version,
    scripts: m.scripts,
    dependencies: m.dependencies,
    optionalDependencies: m.optionalDependencies,
    _npmUser: m._npmUser ? { name: m._npmUser.name } : undefined,
    dist: {
      tarball: m.dist?.tarball,
      integrity: m.dist?.integrity,
      unpackedSize: m.dist?.unpackedSize,
      attestations: m.dist?.attestations
        ? {
            url: m.dist.attestations.url,
            provenance: m.dist.attestations.provenance,
          }
        : undefined,
    },
  };
}

/**
 * Read-only client for the public npm registry and downloads API. Responses are cached for
 * five minutes; nothing here downloads or runs package code.
 */
@Injectable()
export class NpmRegistryService {
  private readonly packumentSizes = new WeakMap<Packument, number>();
  private readonly packuments = new TtlCache<Packument | null>(5 * 60_000, 200, {
    maxBytes: 192 * 1024 * 1024,
    sizeOf: p => p === null ? 0 : this.packumentSizes.get(p) ?? Infinity,
  });
  private readonly downloads = new TtlCache<number | undefined>(30 * 60_000, 1000);

  /** Full packument (trimmed), or null if the package does not exist. */
  getPackument(name: string): Promise<Packument | null> {
    assertValidName(name);
    return this.packuments.get(name, async () => {
      const bytes = await fetchBytes('npm registry', `${REGISTRY}/${encodeName(name)}`, {
        timeoutMs: 20_000,
        maxBytes: 80 * 1024 * 1024,
      });
      if (bytes === null) return null;
      let raw: Packument;
      try {
        raw = JSON.parse(new TextDecoder().decode(bytes)) as Packument;
      } catch {
        throw new UpstreamError('npm registry', 'invalid JSON response');
      }
      if (!raw || !raw.versions || !raw.time) {
        throw new UpstreamError('npm registry', `unexpected packument shape for ${name}`);
      }
      const versions: Record<string, VersionManifest> = Object.create(null);
      for (const [v, m] of Object.entries(raw.versions)) versions[v] = trimManifest(m);
      const packument = { name: raw.name, 'dist-tags': raw['dist-tags'] ?? {}, time: raw.time, versions };
      this.packumentSizes.set(packument, bytes.byteLength > 20 * 1024 * 1024
        ? Infinity : Buffer.byteLength(JSON.stringify(packument)));
      return packument;
    });
  }

  /** Weekly downloads, or undefined if the downloads API has no data or fails. */
  getWeeklyDownloads(name: string): Promise<number | undefined> {
    assertValidName(name);
    return this.downloads.get(name, async () => {
      try {
        const r = await fetchJson<{ downloads?: number }>(
          'npm downloads',
          `${DOWNLOADS}/${name}`,
          { timeoutMs: 8_000 },
        );
        return r?.downloads;
      } catch {
        return undefined;
      }
    });
  }

  /** Summary used to judge a dependency that a release newly adds. */
  async lookupPackage(name: string, range?: string): Promise<PackageInfo | null> {
    try {
      assertValidName(name);
    } catch {
      return null;
    }
    const [p, weeklyDownloads] = await Promise.all([
      this.getPackument(name),
      this.getWeeklyDownloads(name),
    ]);
    if (!p) return null;
    const latestVersion = Object.hasOwn(p['dist-tags'], 'latest') ? p['dist-tags'].latest : undefined;
    const latest = typeof latestVersion === 'string' && parse(latestVersion) && Object.hasOwn(p.versions, latestVersion)
      ? p.versions[latestVersion] : undefined;
    const requested = range?.trim() ?? 'latest';
    const tagged = Object.hasOwn(p['dist-tags'], requested);
    const tagVersion = tagged ? p['dist-tags'][requested] : undefined;
    const resolvedVersion = tagged
      ? (typeof tagVersion === 'string' && parse(tagVersion) && Object.hasOwn(p.versions, tagVersion) ? tagVersion : undefined)
      : Object.keys(p.versions).filter(v => satisfies(v, requested)).sort((a, b) => compare(b, a))[0];
    return {
      name,
      created: Object.hasOwn(p.time, 'created') ? p.time.created : undefined,
      latest,
      resolved: resolvedVersion && Object.hasOwn(p.versions, resolvedVersion) ? p.versions[resolvedVersion] : undefined,
      versionCount: Object.keys(p.versions).length,
      weeklyDownloads,
    };
  }
}
