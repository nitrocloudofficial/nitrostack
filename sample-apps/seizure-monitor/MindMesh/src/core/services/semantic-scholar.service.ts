import { Injectable, OnModuleInit } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';
import { Paper } from '../../core/memory/session.schema.js';

/**
 * Semantic Scholar Service
 *
 * Wrapper around Semantic Scholar API for paper search, metadata, and citation graph.
 * Provides rate limiting and caching.
 */
@Injectable()
export class SemanticScholarService implements OnModuleInit {
  private baseUrl = 'https://api.semanticscholar.org/graph/v1';
  private apiKey: string | undefined;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private config: ConfigService) {
    console.error('[DEBUG SemanticScholarService] Constructor called', {
      hasConfig: !!config,
      configKeys: config ? Object.keys(config) : 'undefined',
    });
  }

  onModuleInit(): void {
    console.error('[DEBUG SemanticScholarService] onModuleInit called');
    this.apiKey = this.config.getSemanticScholarApiKey();
    console.error('[DEBUG SemanticScholarService] API key loaded:', !!this.apiKey);
  }

  /**
   * Search for papers by query
   */
  async searchPapers(
    query: string,
    options: {
      yearFrom?: number;
      yearTo?: number;
      venues?: string[];
      minCitations?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Paper[]> {
    const {
      yearFrom,
      yearTo,
      venues,
      minCitations,
      limit = 25,
      offset = 0,
    } = options;

    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      offset: offset.toString(),
      fields: 'paperId,title,venue,year,authors,abstract,citationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,url',
    });

    if (yearFrom) params.append('year', `${yearFrom}-${yearTo || new Date().getFullYear()}`);
    if (minCitations) params.append('minCitationCount', minCitations.toString());

    const cacheKey = `search:${params.toString()}`;
    const cached = this.getCached<Paper[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetch<{ data: any[] }>(`/paper/search?${params}`);
      const papers = this.mapSearchResults(data.data || []);
      this.setCache(cacheKey, papers);
      return papers;
    } catch (error) {
      console.error('[SemanticScholar] Search failed:', error);
      throw new Error(`Paper search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get paper details by ID
   */
  async getPaper(paperId: string): Promise<Paper | null> {
    const cacheKey = `paper:${paperId}`;
    const cached = this.getCached<Paper>(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetch<any>(
        `/paper/${paperId}?fields=paperId,title,venue,year,authors,abstract,citationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,url,references,citations`
      );
      const paper = this.mapPaperDetail(data);
      this.setCache(cacheKey, paper);
      return paper;
    } catch (error) {
      console.error('[SemanticScholar] Get paper failed:', error);
      return null;
    }
  }

  /**
   * Get multiple papers by IDs (batch)
   */
  async getPapers(paperIds: string[]): Promise<Paper[]> {
    const uniqueIds = [...new Set(paperIds)];
    const results: Paper[] = [];

    // Process in batches of 50 (API limit)
    for (let i = 0; i < uniqueIds.length; i += 50) {
      const batch = uniqueIds.slice(i, i + 50);
      const idsParam = batch.join(',');
      const data = await this.fetch<{ data: any[] }>(
        `/paper/batch?fields=paperId,title,venue,year,authors,abstract,citationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,url`
      );
      results.push(...data.data.map(item => this.mapPaperDetail(item)));
    }

    return results;
  }

  /**
   * Get citation graph for a paper
   */
  async getCitationGraph(paperId: string): Promise<{
    references: Paper[];
    citations: Paper[];
  }> {
    const cacheKey = `citations:${paperId}`;
    const cached = this.getCached<{ references: Paper[]; citations: Paper[] }>(cacheKey);
    if (cached) return cached;

    try {
      const [refs, cits] = await Promise.all([
        this.fetch<{ data: any[] }>(
          `/paper/${paperId}/references?fields=paperId,title,venue,year,authors,abstract,citationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,url`
        ),
        this.fetch<{ data: any[] }>(
          `/paper/${paperId}/citations?fields=paperId,title,venue,year,authors,abstract,citationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,url`
        ),
      ]);

      const result = {
        references: refs.data.map(item => this.mapPaperDetail(item)),
        citations: cits.data.map(item => this.mapPaperDetail(item)),
      };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[SemanticScholar] Citation graph failed:', error);
      return { references: [], citations: [] };
    }
  }

  /**
   * Get author information
   */
  async getAuthor(authorId: string): Promise<any> {
    try {
      return await this.fetch(`/author/${authorId}`);
    } catch (error) {
      console.error('[SemanticScholar] Get author failed:', error);
      return null;
    }
  }

  /**
   * Get paper recommendations
   */
  async getRecommendations(paperId: string, limit = 10): Promise<Paper[]> {
    try {
      const data = await this.fetch<{ data: any[] }>(
        `/paper/${paperId}/recommendations?limit=${limit}&fields=paperId,title,venue,year,authors,abstract,citationCount,fieldsOfStudy,isOpenAccess,openAccessPdf,url`
      );
      return data.data.map(item => this.mapPaperDetail(item));
    } catch (error) {
      console.error('[SemanticScholar] Recommendations failed:', error);
      return [];
    }
  }

  /**
   * Internal fetch with API key
   */
  private async fetch<T = any>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Semantic Scholar API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Map search results to Paper type
   */
  private mapSearchResults(items: any[]): Paper[] {
    return items.map(item => this.mapPaperDetail(item));
  }

  /**
   * Map paper detail to Paper type
   */
  private mapPaperDetail(item: any): Paper {
    return {
      paperId: item.paperId,
      title: item.title,
      authors: item.authors?.map((a: any) => a.name) ?? [],
      year: item.year,
      venue: item.venue,
      abstract: item.abstract,
      doi: item.doi,
      url: item.url,
      citationCount: item.citationCount ?? 0,
      quartile: this.inferQuartile(item.venue, item.citationCount),
      fieldsOfStudy: item.fieldsOfStudy ?? [],
      pdfUrl: item.openAccessPdf?.url,
      isOpenAccess: item.isOpenAccess ?? false,
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Infer quartile from venue and citation count (simplified)
   */
  private inferQuartile(venue: string | undefined, citations: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'unknown' {
    if (!venue) return 'unknown';

    const topVenues = [
      'nature', 'science', 'cell', 'pnas',
      'neurips', 'icml', 'iclr', 'aaai', 'ijcai',
      'cvpr', 'iccv', 'eccv', 'siggraph', 'sigcomm',
      'osdi', 'sosp', 'asplos', 'isca', 'hpca',
      'icse', 'fse', 'ase', 'icse', 'ooopsla', 'pldi', 'popl',
      'vldb', 'sigmod', 'icde', 'cidr',
      'ndss', 'uss', 'security', 'ccs',
      'mobicom', 'mobisys', 'conext',
    ];

    const venueLower = venue.toLowerCase();
    const isTopVenue = topVenues.some(v => venueLower.includes(v));
    const highCitations = citations > 100;

    if (isTopVenue && highCitations) return 'Q1';
    if (isTopVenue || highCitations) return 'Q2';
    if (citations > 10) return 'Q3';
    return 'Q4';
  }

  // ========== Cache Management ==========

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTtlMs) {
      return entry.data as T;
    }
    if (entry) this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    // Limit cache size
    if (this.cache.size > 1000) {
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < 100; i++) {
        this.cache.delete(keys[i]);
      }
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}