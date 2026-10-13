/**
 * PubMedService — NCBI E-utilities client.
 * ESearch (id list) → ESummary (citations) / EFetch (abstract XML).
 * NCBI etiquette: every request carries tool=vitalis + email; api_key when
 * configured (raises limit 3→10 req/s). Concurrency already capped at 2
 * for this host by HttpClientService (§4.3).
 */
import { Injectable } from '@nitrostack/core';
import { HttpClientService } from './http-client.service.js';
import { env } from '../config/env.js';

export type PublicationTypeFilter =
  | 'any'
  | 'guideline'
  | 'meta-analysis'
  | 'randomized-controlled-trial'
  | 'review';

const PUBMED_PT: Record<Exclude<PublicationTypeFilter, 'any'>, string> = {
  guideline: 'guideline',
  'meta-analysis': 'meta-analysis',
  'randomized-controlled-trial': 'randomized controlled trial',
  review: 'review',
};

export interface PubMedSummary {
  pmid: string;
  title: string;
  journal: string;
  pubDate: string;
  authors: string[];
  publicationTypes: string[];
  doi?: string;
}

export interface PubMedArticle extends PubMedSummary {
  abstract: string | null;
  meshTerms: string[];
}

/* ---------- minimal XML helpers (no new dependency) ---------- */

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/** Extracts abstract text per PMID from EFetch retmode=xml payloads. */
export function parseEfetchXml(xml: string): Map<
  string,
  { abstract: string | null; meshTerms: string[] }
> {
  const out = new Map<string, { abstract: string | null; meshTerms: string[] }>();
  if (!xml) return out;
  const articles = xml.split(/<PubmedArticle>/).slice(1);

  for (const block of articles) {
    const pmid = /<PMID[^>]*>(\d+)<\/PMID>/.exec(block)?.[1];
    if (!pmid) continue;

    // AbstractText elements (may carry Label / NlmCategory attributes and
    // contain inline formatting tags)
    const parts: string[] = [];
    for (const m of block.matchAll(
      /<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g,
    )) {
      const label = /Label="([^"]+)"/i.exec(m[1])?.[1];
      const text = decodeXmlEntities(stripTags(m[2])).trim();
      if (text) parts.push(label ? `${label}: ${text}` : text);
    }

    const meshTerms = [...block.matchAll(/<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g)]
      .map((m) => decodeXmlEntities(stripTags(m[1])).trim())
      .filter(Boolean);

    out.set(pmid, {
      abstract: parts.length ? parts.join('\n') : null,
      meshTerms,
    });
  }
  return out;
}

@Injectable({ deps: [HttpClientService] })
export class PubMedService {
  constructor(private readonly http: HttpClientService) {}

  private url(endpoint: string, params: Record<string, string | number>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) p.set(k, String(v));
    p.set('tool', 'vitalis');
    if (env.NCBI_EMAIL) p.set('email', env.NCBI_EMAIL);
    if (env.NCBI_API_KEY) p.set('api_key', env.NCBI_API_KEY);
    return `${env.NCBI_BASE_URL}/${endpoint}?${p}`;
  }

  /** Builds the PubMed query string with optional [pt] and date filters. */
  buildTerm(
    query: string,
    publicationType: PublicationTypeFilter = 'any',
    yearsBack?: number,
  ): string {
    let term = query;
    if (publicationType !== 'any') term += ` AND "${PUBMED_PT[publicationType]}"[pt]`;
    if (yearsBack) {
      const from = new Date().getFullYear() - yearsBack;
      term += ` AND ("${from}/01/01"[dp] : "3000"[dp])`;
    }
    return term;
  }

  /** ESearch → { total count, PMID list }. */
  async search(
    query: string,
    maxResults: number,
    publicationType: PublicationTypeFilter = 'any',
    yearsBack?: number,
  ): Promise<{ count: number; pmids: string[] }> {
    const res = await this.http.getJson<{
      esearchresult?: { count?: string; idlist?: string[] };
    }>({
      api: 'pubmed',
      url: this.url('esearch.fcgi', {
        db: 'pubmed',
        term: this.buildTerm(query, publicationType, yearsBack),
        retmode: 'json',
        retmax: maxResults,
        sort: 'relevance',
      }),
    });
    return {
      count: Number(res?.data?.esearchresult?.count ?? 0),
      pmids: res?.data?.esearchresult?.idlist ?? [],
    };
  }

  /** ESummary → citation metadata for a set of PMIDs. */
  async getSummaries(pmids: string[]): Promise<PubMedSummary[]> {
    if (!pmids || pmids.length === 0) return [];
    const res = await this.http.getJson<{
      result?: { uids?: string[] } & Record<string, unknown>;
    }>({
      api: 'pubmed',
      url: this.url('esummary.fcgi', {
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'json',
      }),
    });

    const result = res?.data?.result ?? {};
    const uids = result.uids ?? [];
    const summaries: PubMedSummary[] = [];
    for (const uid of uids) {
      const doc = result[uid] as
        | {
            title?: string;
            fulljournalname?: string;
            pubdate?: string;
            authors?: Array<{ name?: string }>;
            pubtype?: string[];
            articleids?: Array<{ idtype?: string; value?: string }>;
          }
        | undefined;
      if (!doc) continue;
      summaries.push({
        pmid: uid,
        title: doc.title ?? '',
        journal: doc.fulljournalname ?? '',
        pubDate: doc.pubdate ?? '',
        authors: (doc.authors ?? []).map((a) => a?.name ?? '').filter(Boolean).slice(0, 6),
        publicationTypes: doc.pubtype ?? [],
        doi: doc.articleids?.find((i) => i?.idtype === 'doi')?.value,
      });
    }
    return summaries;
  }

  /** EFetch (single batched call) → abstracts + MeSH terms per PMID. */
  async getAbstracts(pmids: string[]): Promise<Map<string, { abstract: string | null; meshTerms: string[] }>> {
    if (!pmids || pmids.length === 0) return new Map();
    const response = await this.http.getText({
      api: 'pubmed',
      url: this.url('efetch.fcgi', {
        db: 'pubmed',
        id: pmids.join(','),
        rettype: 'abstract',
        retmode: 'xml',
      }),
      headers: { Accept: 'application/xml' },
    });
    return parseEfetchXml(response.data);
  }

  /** Backward-compatible alias for callers that prefer the explicit XML name. */
  async getAbstractsXml(pmids: string[]): Promise<Map<string, { abstract: string | null; meshTerms: string[] }>> {
    return this.getAbstracts(pmids);
  }
}
