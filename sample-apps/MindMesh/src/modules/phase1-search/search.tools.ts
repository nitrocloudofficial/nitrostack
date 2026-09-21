import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { SemanticScholarService } from '../../core/services/semantic-scholar.service.js';
import { QuartileLookupService } from '../../core/services/quartile-lookup.service.js';
import { Paper, SearchPapersInput } from '../../core/memory/session.schema.js';

/**
 * Phase 1: Paper Search Tools
 */
@Injectable({ deps: [MemoryStore, SemanticScholarService, QuartileLookupService] })
export class SearchTools {
  constructor(
    private memory: MemoryStore,
    private semanticScholar: SemanticScholarService,
    private quartileLookup: QuartileLookupService
  ) {}

  @Tool({
    name: 'search_papers',
    description: 'Search Semantic Scholar for papers with filters',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      yearFrom: z.number().int().optional().describe('Filter papers from this year'),
      yearTo: z.number().int().optional().describe('Filter papers up to this year'),
      venues: z.array(z.string()).optional().describe('Filter by venue names'),
      minCitations: z.number().int().optional().describe('Minimum citation count'),
      limit: z.number().int().default(25).describe('Maximum results'),
      sessionId: z.string().optional().describe('Session ID to store results'),
    }),
    invocation: {
      invoking: 'Searching Semantic Scholar with filters...',
      invoked: 'Paper search complete'
    },
    examples: {
      request: { query: 'flash attention transformers', yearFrom: 2020, yearTo: 2024, venues: ['NeurIPS', 'ICML', 'ICLR'], minCitations: 50, limit: 10 },
      response: { query: 'flash attention transformers', count: 8, papers: [{ paperId: 'p1', title: 'FlashAttention: Fast and Memory-Efficient Exact Attention', authors: ['T. Dao', 'D. Fu'], year: 2022, venue: 'NeurIPS', citationCount: 1450, quartile: 'Q1', url: 'https://...' }] }
    }
  })
  @Widget('phase-search-bar')
  async searchPapers(
    input: SearchPapersInput & { sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { query, yearFrom, yearTo, venues, minCitations, limit, sessionId } = input;

    ctx.logger.info('Searching papers', { query, yearFrom, yearTo, venues, minCitations, limit });

    const papers = await this.semanticScholar.searchPapers(query, {
      yearFrom,
      yearTo,
      venues,
      minCitations,
      limit,
    });

    // Enhance with quartile lookup
    for (const paper of papers) {
      if (paper.venue) {
        paper.quartile = this.quartileLookup.lookup(paper.venue);
      }
    }

    // Store in session if provided
    if (sessionId) {
      this.memory.addPapers(sessionId, papers);
    }

    return {
      query,
      count: papers.length,
      papers,
    };
  }

  @Tool({
    name: 'get_paper_metadata',
    description: 'Get detailed metadata for a specific paper',
    inputSchema: z.object({
      paperId: z.string().describe('Semantic Scholar paper ID'),
      sessionId: z.string().optional().describe('Session ID to store result'),
    }),
    invocation: {
      invoking: 'Fetching paper metadata...',
      invoked: 'Paper metadata retrieved'
    },
    examples: {
      request: { paperId: 'p12345', sessionId: 'sess_001' },
      response: { paperId: 'p12345', title: 'FlashAttention: Fast and Memory-Efficient Exact Attention', authors: ['T. Dao', 'D. Fu', 'S. Ermon'], year: 2022, venue: 'NeurIPS', citationCount: 1450, quartile: 'Q1', abstract: 'We present FlashAttention...', url: 'https://...' }
    }
  })
  @Widget('phase-search-bar')
  async getPaperMetadata(
    input: { paperId: string; sessionId?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Getting paper metadata', { paperId: input.paperId });

    const paper = await this.semanticScholar.getPaper(input.paperId);
    if (!paper) {
      throw new Error(`Paper ${input.paperId} not found`);
    }

    if (input.sessionId) {
      this.memory.addPapers(input.sessionId, [paper]);
    }

    return paper;
  }

  @Tool({
    name: 'score_paper_relevance',
    description: 'Score paper relevance to a research question using LLM',
    inputSchema: z.object({
      paperId: z.string().describe('Paper ID'),
      researchQuestion: z.string().describe('Research question'),
      sessionId: z.string().optional().describe('Session to get paper from'),
    }),
    invocation: {
      invoking: 'Scoring paper relevance to research question...',
      invoked: 'Relevance score computed'
    },
    examples: {
      request: { paperId: 'p1', researchQuestion: 'Can we achieve sub-quadratic attention with theoretical guarantees?' },
      response: { paperId: 'p1', researchQuestion: 'Can we achieve sub-quadratic attention with theoretical guarantees?', relevanceScore: 92 }
    }
  })
  @Widget('phase-search-bar')
  async scorePaperRelevance(
    input: { paperId: string; researchQuestion: string; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { paperId, researchQuestion, sessionId } = input;

    ctx.logger.info('Scoring paper relevance', { paperId, researchQuestion });

    // Get paper
    let paper: Paper | null = null;
    if (sessionId) {
      const memPaper = this.memory.getPaper(sessionId, paperId);
      paper = memPaper ?? null;
    }
    if (!paper) {
      const apiPaper = await this.semanticScholar.getPaper(paperId);
      paper = apiPaper ?? null;
    }
    if (!paper) {
      throw new Error(`Paper ${paperId} not found`);
    }

    // Simple heuristic scoring (in production, call LLM)
    const questionKeywords = researchQuestion.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const paperText = `${paper.title} ${paper.abstract ?? ''} ${paper.venue ?? ''}`.toLowerCase();

    let score = 0;
    for (const kw of questionKeywords) {
      if (paperText.includes(kw)) score += 10;
    }

    // Boost for high citation count
    score += Math.min(paper.citationCount / 10, 30);

    // Boost for Q1/Q2 venue
    if (paper.quartile === 'Q1') score += 20;
    else if (paper.quartile === 'Q2') score += 10;

    const normalizedScore = Math.min(100, Math.max(0, score));

    return {
      paperId,
      researchQuestion,
      relevanceScore: normalizedScore,
      breakdown: {
        keywordMatches: questionKeywords.filter(kw => paperText.includes(kw)).length,
        citationBoost: Math.min(paper.citationCount / 10, 30),
        venueBoost: paper.quartile === 'Q1' ? 20 : (paper.quartile === 'Q2' ? 10 : 0),
      },
    };
  }

  @Tool({
    name: 'filter_by_quartile',
    description: 'Filter papers by quartile (Q1, Q2, etc.)',
    inputSchema: z.object({
      papers: z.array(z.any()).describe('Papers to filter'),
      allowed: z.array(z.enum(['Q1', 'Q2', 'Q3', 'Q4'])).default(['Q1', 'Q2']).describe('Allowed quartiles'),
    }),
    invocation: {
      invoking: 'Filtering papers by quartile...',
      invoked: 'Quartile filter applied'
    },
    examples: {
      request: { papers: [{ paperId: 'p1', quartile: 'Q1' }, { paperId: 'p2', quartile: 'Q3' }], allowed: ['Q1', 'Q2'] },
      response: { papers: [{ paperId: 'p1', quartile: 'Q1' }], allowed: ['Q1', 'Q2'] }
    }
  })
  @Widget('phase-search-bar')
  async filterByQuartile(
    input: { papers: Paper[]; allowed: ('Q1' | 'Q2' | 'Q3' | 'Q4')[] },
    ctx: ExecutionContext
  ) {
    const { papers, allowed } = input;

    const filtered = papers.filter(p => allowed.includes(p.quartile as 'Q1' | 'Q2' | 'Q3' | 'Q4'));
    ctx.logger.info('Filtered by quartile', { original: papers.length, filtered: filtered.length, allowed });

    return { papers: filtered, allowed };
  }

  @Tool({
    name: 'sort_by_recency',
    description: 'Sort papers newest to oldest',
    inputSchema: z.object({
      papers: z.array(z.any()).describe('Papers to sort'),
    }),
    invocation: {
      invoking: 'Sorting papers by recency...',
      invoked: 'Papers sorted by year'
    },
    examples: {
      request: { papers: [{ paperId: 'p1', year: 2020 }, { paperId: 'p2', year: 2023 }] },
      response: { papers: [{ paperId: 'p2', year: 2023 }, { paperId: 'p1', year: 2020 }] }
    }
  })
  @Widget('phase-search-bar')
  async sortByRecency(
    input: { papers: Paper[] },
    ctx: ExecutionContext
  ) {
    const sorted = [...input.papers].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    return { papers: sorted };
  }

  @Tool({
    name: 'get_citation_graph',
    description: 'Get citation graph for a paper (references and citations)',
    inputSchema: z.object({
      paperId: z.string().describe('Paper ID'),
      depth: z.number().int().default(1).describe('Graph depth'),
    }),
    invocation: {
      invoking: 'Fetching citation graph...',
      invoked: 'Citation graph retrieved'
    },
    examples: {
      request: { paperId: 'p12345', depth: 1 },
      response: { paperId: 'p12345', references: ['ref1', 'ref2'], citations: ['cite1', 'cite2'], referenceCount: 42, citationCount: 156 }
    }
  })
  @Widget('phase-search-bar')
  async getCitationGraph(
    input: { paperId: string; depth: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Getting citation graph', { paperId: input.paperId });

    const graph = await this.semanticScholar.getCitationGraph(input.paperId);

    return {
      paperId: input.paperId,
      references: graph.references,
      citations: graph.citations,
      referenceCount: graph.references.length,
      citationCount: graph.citations.length,
    };
  }
}