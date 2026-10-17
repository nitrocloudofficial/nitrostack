import { Injectable } from '@nitrostack/core';
import { fetchJson } from './http.js';
import { TtlCache } from './ttl-cache.js';

export interface Advisory {
  id: string;
  summary?: string;
  published?: string;
  /** OSV `MAL-` entries are known-malicious packages, not ordinary vulnerabilities. */
  malicious: boolean;
}

export interface AdvisoryLookup {
  /** False when OSV could not be reached; `advisories` is then empty. */
  available: boolean;
  advisories: Advisory[];
  error?: string;
}

interface OsvResponse {
  vulns?: { id: string; summary?: string; published?: string; aliases?: string[] }[];
}

/** Known advisories for one npm release from the free OSV database. */
@Injectable()
export class OsvService {
  private readonly cache = new TtlCache<AdvisoryLookup>(10 * 60_000, 1000);

  /** Never throws: an unreachable OSV is reported as `available: false` (and not cached). */
  async query(name: string, version: string): Promise<AdvisoryLookup> {
    try {
      return await this.cache.get(`${name}@${version}`, async () => {
        const r = await fetchJson<OsvResponse>('OSV', 'https://api.osv.dev/v1/query', {
          method: 'POST',
          body: { package: { name, ecosystem: 'npm' }, version },
          timeoutMs: 10_000,
        });
        const advisories = (r?.vulns ?? []).map((v) => ({
          id: v.id,
          summary: v.summary,
          published: v.published,
          malicious: v.id.startsWith('MAL-') || (v.aliases ?? []).some((a) => a.startsWith('MAL-')),
        }));
        return { available: true, advisories };
      });
    } catch (err) {
      return {
        available: false,
        advisories: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
