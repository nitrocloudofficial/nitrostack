import {
  ToolDecorator as Tool,
  Widget,
  z,
  ExecutionContext,
  Injectable,
} from '@nitrostack/core';
import { ArxivService, ArxivPaper } from './services/arxiv.service.js';
import { ReadingListService } from './services/reading-list.service.js';

@Injectable({ deps: [ArxivService, ReadingListService] })
export class ScholarTools {
  constructor(
    private readonly arxivService: ArxivService,
    private readonly readingListService: ReadingListService
  ) {}

  // ============================================================================
  // Tool 1: search_papers
  // ============================================================================

  @Tool({
    name: 'search_papers',
    description:
      'Search arXiv academic database by keyword. Returns real papers with titles, authors, abstracts, and direct PDF links. ' +
      'Covers Computer Science, AI/ML, Mathematics, Physics, Statistics, Economics, and Quantitative fields. ' +
      'Does NOT cover clinical medicine, law, humanities, or business management.',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe(
          'Keyword or phrase. Works best for STEM topics: "transformer attention", "deep learning", "quantum computing". ' +
            'Non-STEM queries will return a domain limitation message.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(8)
        .describe('Results to return (1-20). Default: 8.'),
      year_from: z
        .number()
        .int()
        .optional()
        .describe('Filter: papers published from this year onwards. Example: 2022'),
      year_to: z
        .number()
        .int()
        .optional()
        .describe('Filter: papers published up to this year. Example: 2024'),
    }),
  })
  @Widget('paper-results')
  async searchPapers(
    input: { query: string; limit: number; year_from?: number; year_to?: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Searching arXiv papers', { query: input.query });

    try {
      const result = await this.arxivService.searchPapers(
        input.query,
        input.limit,
        input.year_from,
        input.year_to
      );

      // If domain is not supported or warning returned
      if (result.domainWarning) {
        return {
          query: input.query,
          total_available: 0,
          showing: 0,
          papers: [],
          domain_warning: result.domainWarning,
        };
      }

      const papers = result.papers.map((p: ArxivPaper) => ({
        id: p.paperId,
        title: p.title,
        year: p.year,
        citations: 'N/A (arXiv does not track citations)',
        authors: p.authors.slice(0, 3).map((a) => a.name),
        category: p.venue ?? 'Unknown category',
        abstract_snippet: this.truncateAbstract(p.abstract, 200),
        url: p.url,
        pdf_url: p.pdfUrl,
        arxiv_id: p.paperId,
      }));

      return {
        query: input.query,
        data_source: 'arXiv (free, unlimited API)',
        total_available: result.total,
        showing: papers.length,
        papers,
      };
    } catch (err) {
      return {
        query: input.query,
        data_source: 'arXiv',
        total_available: 0,
        showing: 0,
        papers: [],
        domain_warning: `Search Error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ============================================================================
  // Tool 2: get_paper_details
  // ============================================================================

  @Tool({
    name: 'get_paper_details',
    description:
      'Fetch full abstract and metadata for a single arXiv paper. ' +
      'Accepts arXiv ID (e.g. "2201.00978") or full arXiv URL (e.g. "https://arxiv.org/abs/2201.00978"). ' +
      'Use paper IDs returned from search_papers.',
    inputSchema: z.object({
      paper_id: z
        .string()
        .describe(
          'arXiv paper ID (e.g. "2201.00978") or full URL (e.g. "https://arxiv.org/abs/2201.00978"). ' +
            'Get this from search_papers results.'
        ),
    }),
  })
  async getPaperDetails(input: { paper_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching arXiv paper details', { paper_id: input.paper_id });

    try {
      const paper = await this.arxivService.getPaperDetails(input.paper_id);

      return {
        id: paper.paperId,
        title: paper.title,
        abstract: paper.abstract ?? 'No abstract available.',
        year: paper.year,
        citations: 'Not available (arXiv does not track citation counts)',
        authors: paper.authors.map((a) => a.name),
        primary_category: paper.venue,
        all_categories: paper.categories,
        arxiv_id: paper.paperId,
        url: paper.url,
        pdf_url: paper.pdfUrl,
        data_source: 'arXiv',
      };
    } catch (err) {
      return {
        id: input.paper_id,
        error: `Could not fetch paper details: ${err instanceof Error ? err.message : String(err)}`,
        data_source: 'arXiv',
      };
    }
  }

  // ============================================================================
  // Tool 3: get_related_papers  (replaces get_similar_papers / get_citation_tree)
  // ============================================================================

  @Tool({
    name: 'get_related_papers',
    description:
      'Find papers in the same research category as a given arXiv paper. ' +
      'Uses arXiv category-based search to surface recent work in the same field. ' +
      'Note: this is category-based, not content-based, since arXiv does not provide a recommendations API.',
    inputSchema: z.object({
      paper_id: z
        .string()
        .describe(
          'arXiv paper ID (e.g. "2201.00978"). Get this from search_papers or get_paper_details.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .describe('Number of related papers to return (1-10). Default: 5.'),
    }),
  })
  async getRelatedPapers(
    input: { paper_id: string; limit: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Finding related papers', { paper_id: input.paper_id });

    try {
      // First get the paper's category
      const paper = await this.arxivService.getPaperDetails(input.paper_id);
      const category = paper.venue ?? 'cs.LG';

      const related = await this.arxivService.getRelatedPapers(
        input.paper_id,
        category,
        input.limit
      );

      return {
        based_on: input.paper_id,
        based_on_category: category,
        method: 'Category-based search (arXiv does not provide content-based recommendations)',
        related_papers: related.map((p: ArxivPaper) => ({
          id: p.paperId,
          title: p.title,
          year: p.year,
          authors: p.authors.slice(0, 2).map((a) => a.name),
          category: p.venue,
          abstract_snippet: this.truncateAbstract(p.abstract, 150),
          url: p.url,
        })),
      };
    } catch (err) {
      return {
        based_on: input.paper_id,
        error: `Could not fetch related papers: ${err instanceof Error ? err.message : String(err)}`,
        related_papers: [],
      };
    }
  }

  // ============================================================================
  // Tool 4: save_to_reading_list
  // ============================================================================

  @Tool({
    name: 'save_to_reading_list',
    description:
      'Bookmark an arXiv paper to personal reading list with optional note. ' +
      'Saved papers appear in the researchradar://reading-list resource.',
    inputSchema: z.object({
      paper_id: z.string().describe('arXiv paper ID (e.g. "2201.00978")'),
      title: z.string().describe('Paper title'),
      year: z.number().int().optional().describe('Publication year'),
      category: z
        .string()
        .optional()
        .describe('arXiv category e.g. "cs.LG", "cs.AI"'),
      note: z
        .string()
        .max(500)
        .optional()
        .describe('Personal note about why this paper is relevant'),
      pdf_url: z.string().optional().describe('arXiv PDF URL for direct access'),
    }),
  })
  async saveToReadingList(
    input: {
      paper_id: string;
      title: string;
      year?: number;
      category?: string;
      note?: string;
      pdf_url?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Saving paper to reading list', {
      paper_id: input.paper_id,
      title: input.title,
    });

    const saved = this.readingListService.savePaper({
      paperId: input.paper_id,
      title: input.title,
      year: input.year ?? null,
      citationCount: null, // arXiv doesn't track this
      note: input.note ?? null,
    });

    return {
      success: true,
      message: `"${saved.title}" saved to reading list.`,
      saved_at: saved.savedAt.toISOString(),
      total_in_list: this.readingListService.count(),
    };
  }

  // ============================================================================
  // Tool 5: commercialize_research ⭐ (DIFFERENTIATOR)
  // ============================================================================

  @Tool({
    name: 'commercialize_research',
    description:
      'Research Commercialization Agent: Maps an arXiv paper abstract to target industries, market potential, ' +
      'startup ideas, IP licensing paths, and investor archetypes. ' +
      'Bridges the gap between academic research and real-world impact.',
    inputSchema: z.object({
      paper_id: z.string().describe('arXiv paper ID'),
      title: z.string().describe('Paper title'),
      abstract: z
        .string()
        .min(50)
        .describe('Full paper abstract — fetch via get_paper_details'),
      categories: z
        .string()
        .optional()
        .describe('arXiv categories e.g. "cs.LG, cs.AI" — helps with industry mapping'),
      domain_hints: z
        .string()
        .optional()
        .describe(
          'Optional context: "Indian agriculture", "edge computing", etc.'
        ),
      save_to_list: z
        .boolean()
        .default(false)
        .describe('Also save this paper to reading list?'),
    }),
  })
  async commercializeResearch(
    input: {
      paper_id: string;
      title: string;
      abstract: string;
      categories?: string;
      domain_hints?: string;
      save_to_list: boolean;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Analyzing research commercialization', {
      paper_id: input.paper_id,
      title: input.title,
    });

    // INDUSTRY MAPPING: Keyword-based matching
    const abstractLower = input.abstract.toLowerCase();
    const categoriesLower = (input.categories ?? '').toLowerCase();
    const combinedText = abstractLower + ' ' + categoriesLower;

    const industryKeywordMap: Record<string, string[]> = {
      'Healthcare & MedTech': [
        'health', 'medical', 'clinical', 'patient', 'disease', 'drug',
        'diagnosis', 'genomic', 'cancer', 'pharma', 'therapeutic', 'vaccine',
        'q-bio',
      ],
      'AgriTech': [
        'crop', 'agriculture', 'farming', 'soil', 'irrigation', 'yield',
        'pesticide', 'plant', 'seed', 'livestock', 'agri',
      ],
      'FinTech & BFSI': [
        'finance', 'bank', 'credit', 'fraud', 'risk', 'investment', 'portfolio',
        'insurance', 'payment', 'lending', 'fintech', 'q-fin',
      ],
      'EdTech': [
        'learning', 'education', 'student', 'curriculum', 'assessment',
        'adaptive', 'pedagogy', 'school', 'university', 'course', 'training',
      ],
      'Manufacturing & Industry 4.0': [
        'manufacturing', 'defect', 'quality', 'sensor', 'predictive',
        'maintenance', 'supply chain', 'factory', 'production', 'automation',
      ],
      'Energy & CleanTech': [
        'energy', 'solar', 'battery', 'renewable', 'grid', 'emission',
        'carbon', 'electric', 'wind', 'hydrogen', 'sustainability',
      ],
      'Cybersecurity': [
        'security', 'attack', 'malware', 'intrusion', 'vulnerability',
        'encryption', 'privacy', 'defense', 'threat', 'cyber',
      ],
      'Logistics & Supply Chain': [
        'logistics', 'route', 'delivery', 'warehouse', 'inventory',
        'fleet', 'transport', 'shipping', 'optimization',
      ],
      'Smart Cities & IoT': [
        'iot', 'sensor', 'smart city', 'traffic', 'urban', 'connectivity',
        'infrastructure', 'device', 'network',
      ],
      'AI & SaaS': [
        'language model', 'neural', 'transformer', 'nlp', 'computer vision',
        'deep learning', 'llm', 'generative', 'ai model', 'machine learning',
        'cs.lg', 'cs.ai', 'cs.cl', 'cs.cv',
      ],
    };

    const matchedIndustries: string[] = [];
    for (const [industry, keywords] of Object.entries(industryKeywordMap)) {
      if (keywords.some((kw) => combinedText.includes(kw))) {
        matchedIndustries.push(industry);
      }
    }

    if (matchedIndustries.length === 0) {
      matchedIndustries.push('General Technology / R&D Services');
    }

    // MARKET POTENTIAL ESTIMATION
    const highValueIndustries = [
      'Healthcare & MedTech', 'FinTech & BFSI', 'AI & SaaS', 'Energy & CleanTech',
    ];
    const marketTier = matchedIndustries.some((i) => highValueIndustries.includes(i))
      ? 'High (₹500Cr–₹5000Cr TAM)'
      : 'Medium (₹50Cr–₹500Cr TAM)';

    // STARTUP IDEAS (templated per industry)
    const startupIdeasTemplates: Record<string, string> = {
      'Healthcare & MedTech':
        "AI-powered diagnostics SaaS using this research's methodology — target hospital chains and diagnostic labs in Tier 1 & 2 Indian cities. White-label for healthcare providers.",
      AgriTech:
        'Mobile-first crop advisory app leveraging this research for smallholder farmers — partner with FPOs (Farmer Producer Organizations) and state agricultural departments.',
      'FinTech & BFSI':
        'Risk scoring API based on this research, sold to NBFCs and fintech lenders — integrate into existing loan origination pipelines.',
      EdTech:
        "Adaptive assessment engine using this research, licensed to ed-platforms (BYJU's, Unacademy, Vedantu) or sold directly to state education boards.",
      'Manufacturing & Industry 4.0':
        'Predictive maintenance SaaS for SME manufacturers using this methodology — subscription model with IoT sensor integration.',
      'Energy & CleanTech':
        'Grid optimization or renewable forecasting software for DISCOM utilities or solar farm operators.',
      Cybersecurity:
        'Threat detection API offered to MSSPs (Managed Security Service Providers) and enterprise IT teams — compliance-ready for CERT-In mandates.',
      'Logistics & Supply Chain':
        'Route optimization engine for last-mile delivery startups and 3PL (Third-Party Logistics) providers.',
      'Smart Cities & IoT':
        'Smart infrastructure monitoring platform sold to Smart City Mission municipal corporations.',
      'AI & SaaS':
        'Foundation model capability or fine-tuned model as an API — monetize via usage-based pricing to developers.',
      'General Technology / R&D Services':
        'Technology consulting and implementation services to enterprises seeking research outcomes similar to this paper.',
    };

    const startupIdeas = matchedIndustries
      .slice(0, 2)
      .map(
        (industry) =>
          startupIdeasTemplates[industry] ||
          `${industry} vertical SaaS solution built on this research.`
      );

    // LICENSING OPPORTUNITIES
    const licensingOpportunities = [
      'File a provisional/utility patent for the core algorithm/method through the university Technology Transfer Office (TTO)',
      `Non-exclusive license to ${matchedIndustries[0]} players — standard royalty 2–5% of revenue`,
      'Exclusive license to a single industry partner in exchange for research funding and sponsored trials',
      'Open-source the foundational layer; commercialize proprietary fine-tuned models or enterprise support + consulting',
    ];

    // INVESTOR ARCHETYPES
    const investorProfiles = [
      {
        type: 'University Incubators & TTOs',
        examples: 'Amrita TBI, IIT Madras ICSR, NASSCOM 10K Startups, NIDHI Startup Scheme',
        fit: 'First non-dilutive funding, IP support, lab access, mentor network',
      },
      {
        type: 'Seed-Stage VCs (Deep Tech Focus)',
        examples: 'Speciale Invest, Axilor Ventures, pi Ventures, Endiya Partners, Beenext',
        fit: '₹50L–₹2Cr for MVP and pilot customers',
      },
      {
        type: 'Corporate Venture Arms',
        examples: `${matchedIndustries[0]} conglomerates: Tata Ventures, Mahindra Partners, Infosys Springboard`,
        fit: 'Strategic investment + distribution through existing enterprise networks',
      },
      {
        type: 'Government Grants (Non-Dilutive)',
        examples: 'DST NIDHI, BIRAC (Biotech), Startup India Seed Fund, NASSCOM Foundation, MEITY Startup Scheme',
        fit: 'Non-dilutive capital ₹20L–₹2Cr; ideal for early-stage university spinoffs',
      },
    ];

    // NEXT STEPS
    const nextSteps = [
      'Register this research with your university Technology Transfer Office (TTO) — this is step 1 to any commercialization path',
      'Run 10 customer discovery interviews with target industry contacts — validate that industries actually need this',
      'Apply to Amrita TBI, DST NIDHI, or NASSCOM 10K Startups for first non-dilutive funding',
      'File provisional patent within 12 months of publication',
      'Prepare a 10-slide investor deck — use commercialization_pitch prompt to help draft the background section',
    ];

    // SAVE TO READING LIST (OPTIONAL)
    if (input.save_to_list) {
      const note = `Commercialization potential: ${marketTier}. Industries: ${matchedIndustries.join(', ')}.`;
      this.readingListService.savePaper({
        paperId: input.paper_id,
        title: input.title,
        year: null,
        citationCount: null,
        note,
        commercializationPotential: note,
      });
    }

    return {
      paper_id: input.paper_id,
      title: input.title,
      domain_context: input.domain_hints ?? 'General',
      data_source: 'arXiv',
      analysis: {
        target_industries: matchedIndustries,
        market_potential: {
          tier: marketTier,
          note: 'Estimate based on industry TAM benchmarks. Validate with primary customer discovery before fundraising.',
        },
        startup_ideas: startupIdeas,
        licensing_opportunities: licensingOpportunities,
        investor_archetypes: investorProfiles,
        next_steps: nextSteps,
      },
      saved_to_reading_list: input.save_to_list,
    };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private truncateAbstract(text: string | null, maxLen: number): string {
    if (!text) return 'No abstract available.';
    return text.length <= maxLen ? text : text.slice(0, maxLen).trim() + '…';
  }
}
