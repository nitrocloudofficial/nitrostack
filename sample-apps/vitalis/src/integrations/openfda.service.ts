/**
 * OpenFdaService — FDA openFDA client.
 * Drug labels (incl. drug_interactions text used for DDI cross-scan),
 * FAERS adverse-event counts, and enforcement/recall actions.
 * 404 ("No matches found!") is a normal empty result → mapped to null/[],
 * never thrown as an error.
 */
import { Injectable } from '@nitrostack/core';
import { HttpClientService, UpstreamError } from './http-client.service.js';
import { env } from '../config/env.js';

/** FDA Structured Product Label — only the sections Vitalis uses. */
export interface FdaDrugLabel {
  effective_time?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    rxcui?: string[];
    manufacturer_name?: string[];
  };
  boxed_warning?: string[];
  indications_and_usage?: string[];
  contraindications?: string[];
  warnings_and_cautions?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  pregnancy?: string[];
  overdosage?: string[];
  [key: string]: unknown;
}

export interface FdaReactionCount {
  term: string;
  count: number;
}

export interface FdaRecall {
  recallNumber: string;
  reason: string;
  classification: 'I' | 'II' | 'III' | string;
  date: string;
  status: string;
}

@Injectable({ deps: [HttpClientService] })
export class OpenFdaService {
  constructor(private readonly http: HttpClientService) {}

  private buildUrl(
    path: string,
    search: string,
    extra: Record<string, string | number> = {},
  ): string {
    const params = new URLSearchParams({ search });
    for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
    if (env.OPENFDA_API_KEY) params.set('api_key', env.OPENFDA_API_KEY);
    return `${env.OPENFDA_BASE_URL}${path}?${params}`;
  }

  private static isNotFound(e: unknown): boolean {
    return e instanceof UpstreamError && e.status === 404;
  }

  /** FDA label for a drug: generic_name first, brand_name fallback. */
  async getLabel(drugName: string): Promise<FdaDrugLabel | null> {
    for (const field of ['openfda.generic_name', 'openfda.brand_name']) {
      try {
        const res = await this.http.getJson<{ results?: FdaDrugLabel[] }>({
          api: 'openfda',
          url: this.buildUrl('/drug/label.json', `${field}:"${drugName}"`, { limit: 1 }),
        });
        const label = res.data.results?.[0];
        if (label) return label;
      } catch (e) {
        if (OpenFdaService.isNotFound(e)) continue;
        throw e;
      }
    }
    return null;
  }

  /** Top reported reactions from FAERS for a drug (count endpoint). */
  async getTopReactions(
    drugName: string,
    limit = 10,
  ): Promise<{ totalReports: number; reactions: FdaReactionCount[] }> {
    try {
      const res = await this.http.getJson<{
        meta?: { results?: { total?: number } };
        results?: Array<{ term?: string; count?: number }>;
      }>({
        api: 'openfda',
        url: this.buildUrl(
          '/drug/event.json',
          `patient.drug.openfda.generic_name:"${drugName}"`,
          { count: 'patient.reaction.reactionmeddrapt.exact' },
        ),
      });
      const reactions = (res.data.results ?? [])
        .filter((r): r is { term: string; count: number } => Boolean(r.term) && typeof r.count === 'number')
        .slice(0, limit)
        .map((r) => ({ term: r.term, count: r.count }));
      return {
        totalReports: res.data.meta?.results?.total ?? reactions.reduce((a, b) => a + b.count, 0),
        reactions,
      };
    } catch (e) {
      if (OpenFdaService.isNotFound(e)) return { totalReports: 0, reactions: [] };
      throw e;
    }
  }

  /** FDA enforcement (recall) actions for a drug. */
  async getRecalls(drugName: string, limit = 10): Promise<FdaRecall[]> {
    try {
      const res = await this.http.getJson<{
        results?: Array<{
          recall_number?: string;
          reason_for_recall?: string;
          classification?: string;
          recall_initiation_date?: string;
          status?: string;
        }>;
      }>({
        api: 'openfda',
        url: this.buildUrl('/drug/enforcement.json', `openfda.generic_name:"${drugName}"`, { limit }),
      });
      return (res.data.results ?? []).map((r) => ({
        recallNumber: r.recall_number ?? '',
        reason: r.reason_for_recall ?? '',
        classification: r.classification ?? '',
        date: r.recall_initiation_date ?? '',
        status: r.status ?? '',
      }));
    } catch (e) {
      if (OpenFdaService.isNotFound(e)) return [];
      throw e;
    }
  }
}
