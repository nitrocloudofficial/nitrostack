/**
 * RxNormService — NLM RxNorm + RxClass client.
 * Resolves free-text drug names to RxCUIs, synonyms, dose forms, and classes.
 * NOTE: NLM retired the /interaction endpoints (verified) — interaction
 * checking lives in OpenFdaService label cross-scan instead.
 */
import { Injectable } from '@nitrostack/core';
import { HttpClientService } from './http-client.service.js';
import { env } from '../config/env.js';

export interface RxNormCandidate {
  rxcui: string;
  score?: number;
}

export interface RxNormDrugProperties {
  rxcui: string;
  name: string;
  synonym?: string;
  tty?: string;
}

export interface RxNormDrug {
  rxcui: string;
  name: string;
  tty: string;
  synonym?: string;
}

@Injectable({ deps: [HttpClientService] })
export class RxNormService {
  constructor(private readonly http: HttpClientService) {}

  private url(path: string, params: Record<string, string | number> = {}): string {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]): [string, string] => [k, String(v)]),
    );
    const base = `${env.RXNORM_BASE_URL}${path}`;
    return qs.size ? `${base}?${qs}` : base;
  }

  /** Exact-ish name → single best RxCUI (null when unknown). */
  async resolveName(name: string): Promise<string | null> {
    const res = await this.http.getJson<{ idGroup?: { rxnormId?: string[] } }>({
      api: 'rxnorm',
      url: this.url('/rxcui.json', { name }),
    });
    return res.data.idGroup?.rxnormId?.[0] ?? null;
  }

  /** Fuzzy spelling-tolerant candidates. */
  async approximateMatch(term: string, maxEntries = 5): Promise<RxNormCandidate[]> {
    const res = await this.http.getJson<{
      approximateGroup?: { candidate?: Array<{ rxcui?: string; score?: string }> };
    }>({
      api: 'rxnorm',
      url: this.url('/approximateTerm.json', { term, maxEntries }),
    });
    return (res.data.approximateGroup?.candidate ?? [])
      .filter((c): c is { rxcui: string; score?: string } => Boolean(c.rxcui))
      .map((c) => ({ rxcui: c.rxcui, score: c.score ? Number(c.score) : undefined }));
  }

  /** Canonical properties for one RxCUI. */
  async getProperties(rxcui: string): Promise<RxNormDrugProperties | null> {
    const res = await this.http.getJson<{
      properties?: { rxcui?: string; name?: string; synonym?: string; tty?: string };
    }>({
      api: 'rxnorm',
      url: this.url(`/rxcui/${encodeURIComponent(rxcui)}/properties.json`),
    });
    const p = res.data.properties;
    if (!p?.rxcui || !p.name) return null;
    return { rxcui: p.rxcui, name: p.name, synonym: p.synonym, tty: p.tty };
  }

  /** All drug concepts (SBD/SCD/BPCK/GPCK/IN...) for a name. */
  async getDrugs(name: string): Promise<RxNormDrug[]> {
    const res = await this.http.getJson<{
      drugGroup?: {
        conceptGroup?: Array<{
          tty?: string;
          conceptProperties?: Array<{
            rxcui?: string;
            name?: string;
            tty?: string;
            synonym?: string;
          }>;
        }>;
      };
    }>({
      api: 'rxnorm',
      url: this.url('/drugs.json', { name }),
    });
    const out: RxNormDrug[] = [];
    for (const group of res.data.drugGroup?.conceptGroup ?? []) {
      for (const p of group.conceptProperties ?? []) {
        if (p.rxcui && p.name) {
          out.push({ rxcui: p.rxcui, name: p.name, tty: p.tty ?? group.tty ?? '', synonym: p.synonym });
        }
      }
    }
    return out;
  }

  /** Drug class names (RxClass: EPC/MOA/PE/STRUCT...) for one RxCUI. */
  async getClasses(rxcui: string): Promise<string[]> {
    const res = await this.http.getJson<{
      rxclassDrugInfoList?: {
        rxclassDrugInfo?: Array<{
          rxclassMinConceptItem?: { className?: string };
        }>;
      };
    }>({
      api: 'rxclass',
      url: `${env.RXCLASS_BASE_URL}/class/byRxcui.json?rxcui=${encodeURIComponent(rxcui)}`,
    });
    const names = (res.data.rxclassDrugInfoList?.rxclassDrugInfo ?? [])
      .map((i) => i.rxclassMinConceptItem?.className)
      .filter((n): n is string => Boolean(n));
    return [...new Set(names)];
  }
}
