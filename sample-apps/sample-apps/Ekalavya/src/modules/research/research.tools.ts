import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import https from 'https';

// ─────────────────────────────────────────────────────────────
// BM25 Ranking Engine (Pure TypeScript Math - No Dependencies)
// ─────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  if (!text) return [];
  return text.toLowerCase().match(/\w+/g) || [];
}

function rankPapers(query: string, papers: any[]): any[] {
  if (!papers.length) return papers;

  const k1 = 1.5, b = 0.75;
  const queryTokens = tokenize(query);
  const docTokens = papers.map(p => tokenize(`${p.title || ''} ${p.abstract || ''}`));
  
  const N = docTokens.length;
  const avgdl = docTokens.reduce((s, d) => s + d.length, 0) / Math.max(1, N);
  
  // Term → Document Frequency map
  const df: Record<string, number> = {};
  docTokens.forEach(d => {
    const unique = new Set(d);
    unique.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  
  // IDF calculation
  const idf: Record<string, number> = {};
  Object.entries(df).forEach(([term, freq]) => {
    idf[term] = Math.log(1 + (N - freq + 0.5) / (freq + 0.5));
  });
  
  const currentYear = new Date().getFullYear();
  
  return papers.map((paper, i) => {
    const docFreqs: Record<string, number> = {};
    docTokens[i].forEach(t => { docFreqs[t] = (docFreqs[t] || 0) + 1; });
    
    // BM25 Score
    let bm25 = 0;
    const docLen = docTokens[i].length;
    queryTokens.forEach(term => {
      const freq = docFreqs[term] || 0;
      if (!freq) return;
      const num = freq * (k1 + 1);
      const den = freq + k1 * (1 - b + b * docLen / avgdl);
      bm25 += (idf[term] || 0) * (num / den);
    });
    
    // Recency Decay
    const yearMatch = (paper.authors_venue_year || '').match(/\b(19|20)\d{2}\b/);
    let recency = 1.0;
    if (yearMatch) {
      const age = Math.max(0, currentYear - parseInt(yearMatch[0]));
      recency = Math.exp(-0.2 * age);
    }
    
    return { ...paper, ranking_score: bm25 * recency };
  }).sort((a, b) => b.ranking_score - a.ranking_score);
}

// ─────────────────────────────────────────────────────────────
// HTTP Fetch Helper (no external dependencies)
// ─────────────────────────────────────────────────────────────
function fetchUrl(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const reqOptions = {
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers
      }
    };
    https.get(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Simple HTML parser - extracts text within a tag found by class
function extractByClass(html: string, tag: string, className: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*>(.*?)<\\/${tag}>`, 'gis');
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Strip inner HTML tags
    results.push(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return results;
}

function extractLinks(html: string, wrapperClass: string): { text: string; href: string }[] {
  const results: { text: string; href: string }[] = [];
  const wrapperRegex = new RegExp(`<div[^>]*class="[^"]*${wrapperClass}[^"]*"[^>]*>(.*?)</div>`, 'gis');
  let wm;
  while ((wm = wrapperRegex.exec(html)) !== null) {
    const inner = wm[1];
    const aRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/is;
    const am = aRegex.exec(inner);
    if (am) {
      results.push({ href: am[1], text: am[2].replace(/<[^>]+>/g, '').trim() });
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
// Research Tools Controller
// ─────────────────────────────────────────────────────────────
@Controller('research')
export class ResearchTools {

  @Tool({
    name: 'search_papers',
    description: 'Search for academic research papers on a given topic using Google Scholar scraping + BM25 ranking.',
    inputSchema: z.object({
      query: z.string().describe('The research topic or keywords to search for'),
    })
  })
  async searchPapers(input: { query: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Searching papers for: ${input.query}`);
    const papers: any[] = [];
    const encoded = encodeURIComponent(input.query);

    for (const start of [0, 10, 20]) {
      try {
        const url = `https://scholar.google.com/scholar?q=${encoded}&hl=en&start=${start}`;
        const html = await fetchUrl(url);

        // Extract each gs_ri div manually
        const blockRegex = /<div[^>]*class="[^"]*gs_ri[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
        let match;
        while ((match = blockRegex.exec(html)) !== null) {
          const block = match[1];
          // Title & link
          const titleMatch = /<h3[^>]*class="[^"]*gs_rt[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
          if (!titleMatch) continue;
          const link = titleMatch[1];
          const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

          // Authors/venue/year
          const authorMatch = /<div[^>]*class="[^"]*gs_a[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(block);
          const authors_venue_year = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          // Abstract
          const abstractMatch = /<div[^>]*class="[^"]*gs_rs[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(block);
          const abstract = abstractMatch ? abstractMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          papers.push({ title, link, authors_venue_year, abstract });
        }
      } catch (err) {
        ctx.logger.warn(`Scholar scrape failed for start=${start}: ${err}`);
        break;
      }
    }

    if (!papers.length) {
      return { papers: [], message: 'No papers found or Google Scholar is blocking the request. Try again later.' };
    }

    const ranked = rankPapers(input.query, papers);
    return { papers: ranked, total: ranked.length };
  }

  @Tool({
    name: 'search_conferences',
    description: 'Search for upcoming academic conferences, journals, and calls for papers on a topic.',
    inputSchema: z.object({
      query: z.string().describe('The research domain to find conferences/journals for'),
    })
  })
  async searchConferences(input: { query: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Searching conferences for: ${input.query}`);

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      return { conferences: [], error: 'TAVILY_API_KEY not configured' };
    }

    const searchQuery = `Call for papers conference journal ${input.query} 2025 OR 2026 submission deadline`;

    // Call Tavily REST API directly (no external SDK)
    const body = JSON.stringify({
      api_key: tavilyApiKey,
      query: searchQuery,
      search_depth: 'advanced',
      max_results: 25,
    });

    let rawResults: any[] = [];
    try {
      const response = await new Promise<string>((resolve, reject) => {
        const req = https.request({
          hostname: 'api.tavily.com',
          path: '/search',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
      const parsed = JSON.parse(response);
      rawResults = parsed.results || [];
    } catch (err) {
      ctx.logger.error(`Tavily API error: ${err}`);
      return { conferences: [], error: 'Failed to fetch conference data.' };
    }

    // Parse results
    const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/i;
    const conferences = rawResults.slice(0, 18).map(r => {
      const title = r.title || '';
      const content = r.content || '';
      const url = r.url || '';
      const type = /journal/i.test(title + content) ? 'Journal' : 'Conference';
      const deadlineMatch = dateRegex.exec(content);
      const deadline = deadlineMatch ? deadlineMatch[0] : 'TBA';
      return { type, title, description: content, url, deadline, location: 'See website for details' };
    });

    return { conferences, total: conferences.length };
  }
}
