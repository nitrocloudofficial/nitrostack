import { Injectable } from '@nitrostack/core';

// ============================================================================
// Interfaces
// ============================================================================

export interface ArxivAuthor {
  name: string;
}

export interface ArxivPaper {
  paperId: string;        // arXiv ID e.g. "2201.00978"
  title: string;
  abstract: string | null;
  year: number | null;
  citationCount: number;  // Always 0 — arXiv doesn't track citations
  authors: ArxivAuthor[];
  venue: string | null;   // Primary arXiv category e.g. "cs.LG"
  externalIds: {
    ArXiv: string;
  };
  url: string;            // https://arxiv.org/abs/{arxivId}
  categories: string[];   // All arXiv categories e.g. ["cs.LG", "cs.AI"]
  pdfUrl: string;         // https://arxiv.org/pdf/{arxivId}
}

// ============================================================================
// Service
// ============================================================================

@Injectable({ deps: [] })
export class ArxivService {
  private readonly BASE_URL = 'https://export.arxiv.org/api/query';
  private readonly FETCH_HEADERS = {
    'User-Agent': 'ResearchRadar-MCP/1.0 (https://github.com/researchradar)',
    'Accept': 'application/atom+xml, application/xml, text/xml, */*',
  };

  /** Fetch with a 15-second timeout and one automatic retry on 429 */
  private async fetchWithTimeout(url: string, retryOn429 = true): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(url, { headers: this.FETCH_HEADERS, signal: controller.signal });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('arXiv API request timed out after 15 seconds. Check network connectivity.');
      }
      throw err;
    } finally {
      clearTimeout(id);
    }

    // Auto-retry once on 429 rate limit after a 4-second pause
    if (response.status === 429 && retryOn429) {
      await new Promise((res) => setTimeout(res, 4_000));
      return this.fetchWithTimeout(url, false); // no further retries
    }

    return response;
  }


  private readonly UNSUPPORTED_DOMAIN_KEYWORDS = [
    'clinical trial', 'medical diagnosis', 'patient care', 'hospital',
    'legal', 'law', 'contract', 'court',
    'marketing strategy', 'business management', 'mba', 'commerce',
    'social work', 'psychology therapy', 'literature review humanities',
    'history', 'philosophy', 'art', 'music theory',
  ];

  // --------------------------------------------------------------------------
  // Domain validation
  // --------------------------------------------------------------------------

  validateDomain(query: string): { supported: boolean; message?: string } {
    const lower = query.toLowerCase();
    const isUnsupported = this.UNSUPPORTED_DOMAIN_KEYWORDS.some((kw) =>
      lower.includes(kw)
    );

    if (isUnsupported) {
      return {
        supported: false,
        message:
          'arXiv does not index papers in this domain. arXiv covers STEM fields: ' +
          'Computer Science, Mathematics, Physics, Statistics, Economics, and ' +
          'Quantitative Biology/Finance. For medical/clinical research, try ' +
          'PubMed (https://pubmed.ncbi.nlm.nih.gov/). For social sciences, try ' +
          'SSRN (https://ssrn.com/).',
      };
    }
    return { supported: true };
  }

  // --------------------------------------------------------------------------
  // XML parsing (no external packages — pure regex)
  // --------------------------------------------------------------------------

  private parseArxivXML(xmlText: string): ArxivPaper[] {
    const entries: ArxivPaper[] = [];

    // Extract all <entry> blocks
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entry = match[1];

      const getId = (text: string): string => {
        const m = text.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<\s]+)/i);
        if (!m) return '';
        return m[1].replace(/v\d+$/, '').trim();
      };

      const getField = (tag: string, text: string): string => {
        const m = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? m[1].trim() : '';
      };

      const getYear = (text: string): number | null => {
        const m = text.match(/<published>(\d{4})/);
        return m ? parseInt(m[1], 10) : null;
      };

      const getAuthors = (text: string): ArxivAuthor[] => {
        const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
        const authors: ArxivAuthor[] = [];
        let authorMatch;
        while ((authorMatch = authorRegex.exec(text)) !== null) {
          authors.push({ name: authorMatch[1].trim() });
        }
        return authors;
      };

      const getCategories = (text: string): string[] => {
        const catRegex = /<category term="([^"]+)"/g;
        const cats: string[] = [];
        let catMatch;
        while ((catMatch = catRegex.exec(text)) !== null) {
          cats.push(catMatch[1]);
        }
        return cats;
      };

      const getPrimaryCategory = (text: string): string => {
        const m = text.match(/arxiv:primary_category[^>]*term="([^"]+)"/i) || text.match(/<category[^>]*term="([^"]+)"/i);
        return m ? m[1] : 'cs.LG';
      };

      const arxivId = getId(entry);
      if (!arxivId) continue;

      const paper: ArxivPaper = {
        paperId: arxivId,
        title: getField('title', entry).replace(/\s+/g, ' '),
        abstract: getField('summary', entry).replace(/\s+/g, ' ') || null,
        year: getYear(entry),
        citationCount: 0, // arXiv does not provide citation counts
        authors: getAuthors(entry),
        venue: getPrimaryCategory(entry),
        externalIds: { ArXiv: arxivId },
        url: `https://arxiv.org/abs/${arxivId}`,
        categories: getCategories(entry),
        pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
      };

      entries.push(paper);
    }

    return entries;
  }

  // --------------------------------------------------------------------------
  // Method 1: searchPapers
  // --------------------------------------------------------------------------

  private buildSearchQuery(query: string, yearFrom?: number, yearTo?: number): string {
    const clean = query.trim().replace(/["']/g, '');
    const words = clean.split(/\s+/).filter(Boolean);
    let q = '';
    if (words.length <= 1) {
      q = `all:${encodeURIComponent(clean || 'transformer')}`;
    } else {
      q = words.map((w) => `all:${encodeURIComponent(w)}`).join('+AND+');
    }

    if (yearFrom) {
      const yearToVal = yearTo ?? 2099;
      q += `+AND+submittedDate:[${yearFrom}01010000+TO+${yearToVal}12312359]`;
    }

    return q;
  }

  async searchPapers(
    query: string,
    limit: number = 8,
    yearFrom?: number,
    yearTo?: number
  ): Promise<{ total: number; papers: ArxivPaper[]; domainWarning?: string }> {
    try {
      // Domain validation first
      const domainCheck = this.validateDomain(query);
      if (!domainCheck.supported) {
        return { total: 0, papers: [], domainWarning: domainCheck.message };
      }

      const searchQuery = this.buildSearchQuery(query, yearFrom, yearTo);
      const url = `${this.BASE_URL}?search_query=${searchQuery}&max_results=${limit}&sortBy=relevance&sortOrder=descending`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return {
          total: 0,
          papers: [],
          domainWarning: `arXiv API status ${response.status}: ${body.slice(0, 150) || 'Rate limited or service unavailable. Please retry in a few seconds.'}`,
        };
      }

      const xmlText = await response.text();

      // Check if arXiv returned plain-text rate limit message instead of Atom XML
      if (xmlText.toLowerCase().includes('rate exceeded')) {
        return {
          total: 0,
          papers: [],
          domainWarning: 'arXiv API Rate Limit Exceeded. Please wait 3–5 seconds and try again.',
        };
      }

      const papers = this.parseArxivXML(xmlText);

      return { total: papers.length, papers };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        total: 0,
        papers: [],
        domainWarning: `arXiv API Connection Warning: ${message}. Please wait a few seconds and try again.`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Method 2: getPaperDetails
  // --------------------------------------------------------------------------

  async getPaperDetails(paperId: string): Promise<ArxivPaper> {
    try {
      // Clean the ID: strip "arxiv:" prefix, version suffix (v1, v2…), or extract from URL
      let cleanId = paperId.trim();

      // Handle full arXiv URL
      const urlMatch = cleanId.match(/arxiv\.org\/abs\/([^\s?#]+)/i);
      if (urlMatch) {
        cleanId = urlMatch[1];
      }

      // Strip "arxiv:" prefix (case-insensitive)
      cleanId = cleanId.replace(/^arxiv:/i, '');

      // Strip version suffix e.g. v1, v2
      cleanId = cleanId.replace(/v\d+$/, '');

      const url = `${this.BASE_URL}?id_list=${encodeURIComponent(cleanId)}`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`arXiv API error ${response.status}: ${body.slice(0, 200)}`);
      }

      const xmlText = await response.text();
      const papers = this.parseArxivXML(xmlText);

      if (papers.length === 0) {
        throw new Error(`Paper not found: ${paperId}`);
      }

      return papers[0];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch arXiv paper details: ${message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Method 3: getRelatedPapers (category-based fallback)
  // --------------------------------------------------------------------------

  async getRelatedPapers(
    paperId: string,
    category: string,
    limit: number = 5
  ): Promise<ArxivPaper[]> {
    try {
      const encodedCat = encodeURIComponent(`cat:${category}`);
      const url = `${this.BASE_URL}?search_query=${encodedCat}&max_results=${limit * 2}&sortBy=submittedDate&sortOrder=descending`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`arXiv API error ${response.status}: ${body.slice(0, 200)}`);
      }

      const xmlText = await response.text();
      const papers = this.parseArxivXML(xmlText);

      // Filter out the original paper and return first `limit` results
      return papers.filter((p) => p.paperId !== paperId).slice(0, limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch related arXiv papers: ${message}`);
    }
  }
}
