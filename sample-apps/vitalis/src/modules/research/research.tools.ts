/**
 * ResearchTools — Medical Research module tools.
 * Interacts with NCBI PubMed and ClinicalTrials.gov.
 */
import {
  ToolDecorator as Tool,
  Widget,
  ExecutionContext,
  Injectable,
  ControllerDecorator as Controller,
  RateLimit,
  z,
} from '@nitrostack/core';
import { ResearchService } from './research.service.js';
import { UseClinicalGateway } from '../../gateway/clinical-gateway.decorator.js';
import { Cache } from '../../gateway/cache.decorator.js';

@Controller('research')
@Injectable({ deps: [ResearchService] })
export class ResearchTools {
  constructor(private readonly researchService: ResearchService) {}

  @Tool({
    name: 'search_pubmed',
    description:
      'Search NCBI PubMed for biomedical literature and clinical studies by query, ' +
      'publication type filter (guideline, meta-analysis, RCT, review), and recency.',
    inputSchema: z.object({
      query: z.string().min(2).max(300).describe('Search query, e.g. "type 2 diabetes SGLT2 inhibitors"'),
      max_results: z.number().int().min(1).max(20).default(5).describe('Maximum articles to return'),
      publication_type: z
        .enum(['any', 'guideline', 'meta-analysis', 'randomized-controlled-trial', 'review'])
        .default('any')
        .describe('Filter by publication type'),
      years_back: z.number().int().min(1).max(20).optional().describe('Filter to past N years'),
    }),
    examples: {
      request: { query: 'hypertension guidelines', max_results: 5, publication_type: 'guideline' },
      response: {
        total_count: 42,
        articles: [
          {
            pmid: '12345678',
            title: '2025 Clinical Practice Guideline for Hypertension',
            journal: 'Journal of Cardiology',
            pub_date: '2025 Jan',
            authors: ['Smith J', 'Doe A'],
            publication_types: ['Guideline'],
          },
        ],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({
    ttl: 21600,
    key: (input: any) =>
      `pubmed_search:${String(input.query).toLowerCase()}:${input.max_results}:${input.publication_type}:${input.years_back ?? ''}`,
  })
  @RateLimit({ requests: 10, window: '1m' })
  async searchPubmed(input: any, ctx: ExecutionContext) {
    ctx.logger.info('research_search_pubmed', { query: input.query });
    const result = await this.researchService.searchPubmed(
      input.query,
      input.max_results ?? 5,
      input.publication_type ?? 'any',
      input.years_back,
    );
    return {
      ...result,
      _safety: {
        disclaimer: 'For informational and research purposes only. Not clinical advice.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'get_article',
    description: 'Get full citation metadata, DOI, MeSH terms, and abstract text for a PubMed PMID.',
    inputSchema: z.object({
      pmid: z.string().regex(/^\d{1,9}$/).describe('PubMed ID (1-9 digits)'),
    }),
    examples: {
      request: { pmid: '31234567' },
      response: {
        pmid: '31234567',
        title: 'Efficacy of SGLT2 Inhibitors in Renal Disease',
        abstract: 'Background: ... Methods: ... Results: ... Conclusion: ...',
        authors: ['Smith J'],
        journal: 'N Engl J Med',
        pub_date: '2020',
        doi: '10.1056/NEJMoa1902681',
        mesh_terms: ['Diabetes Mellitus, Type 2', 'Kidney Failure, Chronic'],
        pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/31234567/',
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `pubmed_article:${input.pmid}` })
  @RateLimit({ requests: 10, window: '1m' })
  async getArticle(input: any, ctx: ExecutionContext) {
    ctx.logger.info('research_get_article', { pmid: input.pmid });
    const result = await this.researchService.getArticle(input.pmid);
    return {
      ...result,
      _safety: {
        disclaimer: 'For informational and research purposes only. Not clinical advice.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'search_trials',
    description: 'Search ClinicalTrials.gov for human clinical trials by condition, recruitment status, and phase.',
    inputSchema: z.object({
      condition: z.string().min(2).max(200).describe('Medical condition or disease, e.g. "type 2 diabetes"'),
      status: z
        .enum(['any', 'recruiting', 'active_not_recruiting', 'completed'])
        .default('any')
        .describe('Overall study status'),
      phase: z.enum(['any', '1', '2', '3', '4']).default('any').describe('Study phase'),
      max_results: z.number().int().min(1).max(20).default(10).describe('Maximum trials to return'),
    }),
    examples: {
      request: { condition: 'type 2 diabetes', status: 'recruiting', phase: '3' },
      response: {
        total_count: 15,
        trials: [
          {
            nct_id: 'NCT04567890',
            title: 'Evaluation of Novel Oral Agent in Type 2 Diabetes',
            overall_status: 'RECRUITING',
            phases: ['PHASE3'],
            conditions: ['Type 2 Diabetes'],
            lead_sponsor: 'Pharma Corp',
            url: 'https://clinicaltrials.gov/study/NCT04567890',
          },
        ],
      },
    },
  })
  @Widget('trial-list')
  @UseClinicalGateway()
  @Cache({
    ttl: 21600,
    key: (input: any) =>
      `trials_search:${String(input.condition).toLowerCase()}:${input.status}:${input.phase}:${input.max_results}`,
  })
  @RateLimit({ requests: 10, window: '1m' })
  async searchTrials(input: any, ctx: ExecutionContext) {
    ctx.logger.info('research_search_trials', { condition: input.condition });
    const result = await this.researchService.searchTrials(
      input.condition,
      input.status ?? 'any',
      input.phase ?? 'any',
      input.max_results ?? 10,
    );
    return {
      ...result,
      _safety: {
        disclaimer: 'Clinical trial listings are for informational purposes only.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'get_trial_details',
    description: 'Get detailed study protocol information, eligibility criteria, and locations for an NCT ID.',
    inputSchema: z.object({
      nct_id: z.string().regex(/^NCT\d{8}$/).describe('ClinicalTrials.gov Identifier, e.g. "NCT04567890"'),
    }),
    examples: {
      request: { nct_id: 'NCT04567890' },
      response: {
        nct_id: 'NCT04567890',
        title: 'Study of Novel Agent',
        status: 'RECRUITING',
        phase: ['PHASE3'],
        sponsor: 'Pharma Corp',
        eligibility: { sex: 'ALL', min_age: '18 Years', max_age: '75 Years' },
        url: 'https://clinicaltrials.gov/study/NCT04567890',
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `trial_detail:${input.nct_id}` })
  @RateLimit({ requests: 10, window: '1m' })
  async getTrialDetails(input: any, ctx: ExecutionContext) {
    ctx.logger.info('research_get_trial_details', { nct_id: input.nct_id });
    const result = await this.researchService.getTrialDetails(input.nct_id);
    return {
      ...result,
      _safety: {
        disclaimer: 'Clinical trial details are for informational purposes only.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'summarize_evidence',
    description: 'Fetch PubMed abstracts for a topic and structure an evidence digest for LLM synthesis.',
    inputSchema: z.object({
      topic: z.string().min(2).max(300).describe('Medical or research topic'),
      max_results: z.number().int().min(1).max(10).default(5).describe('Number of top articles to include'),
    }),
    examples: {
      request: { topic: 'GLP-1 receptor agonists cardiovascular outcomes', max_results: 3 },
      response: {
        topic: 'GLP-1 receptor agonists cardiovascular outcomes',
        synthesized_from: 3,
        articles: [
          { pmid: '12345', title: 'CV Outcomes Trial', pub_date: '2023', abstract: '...' },
        ],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({
    ttl: 21600,
    key: (input: any) => `evidence_summary:${String(input.topic).toLowerCase()}:${input.max_results}`,
  })
  @RateLimit({ requests: 10, window: '1m' })
  async summarizeEvidence(input: any, ctx: ExecutionContext) {
    ctx.logger.info('research_summarize_evidence', { topic: input.topic });
    const result = await this.researchService.summarizeEvidence(input.topic, input.max_results ?? 5);
    return {
      ...result,
      _safety: {
        disclaimer: 'Evidence summaries are for informational purposes only.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }
}
