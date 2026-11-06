// Looks up advisory ids (CVE / GHSA / MAL) and summarizes which packages they affect. Output is filtered (OWASP MCP10).
import { OsvClient, isValidAdvisoryId, type OsvVuln } from './osv.client.js';
import { mapSeverity, cleanText, type Severity } from './advisory.js';

export interface AdvisorySummary {
  id: string;
  found: boolean;
  aliases: string[];
  severity: Severity;
  summary: string;
  packages: Array<{ name: string; ecosystem: string; fixedVersions: string[] }>;
}

export const MAX_IDS = 10;
const MAX_PACKAGES = 10;
const MAX_FIXED = 5;

function packagesOf(v: OsvVuln): AdvisorySummary['packages'] {
  const byKey = new Map<string, { name: string; ecosystem: string; fixed: Set<string> }>();
  for (const a of Array.isArray(v.affected) ? v.affected : []) {
    const name = a?.package?.name;
    const ecosystem = a?.package?.ecosystem;
    if (typeof name !== 'string' || typeof ecosystem !== 'string') continue; // a bare CVE record can lack package data
    const key = `${ecosystem}:${name}`;
    const entry = byKey.get(key) ?? { name: cleanText(name, 214), ecosystem: cleanText(ecosystem, 32), fixed: new Set<string>() };
    for (const r of Array.isArray(a.ranges) ? a.ranges : []) {
      for (const e of Array.isArray(r?.events) ? r.events : []) {
        if (typeof e?.fixed === 'string') entry.fixed.add(cleanText(e.fixed, 64));
      }
    }
    byKey.set(key, entry);
  }
  return [...byKey.values()].slice(0, MAX_PACKAGES).map((e) => ({ name: e.name, ecosystem: e.ecosystem, fixedVersions: [...e.fixed].slice(0, MAX_FIXED) }));
}

export async function lookupAdvisories(ids: string[], client: Pick<OsvClient, 'getVuln'> = new OsvClient()): Promise<AdvisorySummary[]> {
  if (!Array.isArray(ids) || ids.length > MAX_IDS) throw new RangeError(`Too many ids: at most ${MAX_IDS} per call.`);
  const out: AdvisorySummary[] = [];
  for (const id of ids) {
    if (!isValidAdvisoryId(id)) throw new RangeError('Invalid advisory id: expected CVE-YYYY-N, GHSA-xxxx-xxxx-xxxx or MAL-YYYY-N.');
    const v = await client.getVuln(id);
    if (!v) {
      out.push({ id, found: false, aliases: [], severity: 'unknown', summary: '', packages: [] });
      continue;
    }
    out.push({
      id,
      found: true,
      aliases: (Array.isArray(v.aliases) ? v.aliases : []).filter((a): a is string => typeof a === 'string').slice(0, 10).map((a) => cleanText(a, 40)),
      severity: mapSeverity(v),
      summary: cleanText(v.summary),
      packages: packagesOf(v)
    });
  }
  return out;
}
