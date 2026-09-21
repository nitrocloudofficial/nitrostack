import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { CitationsService } from './citations.service.js';

export class CitationsTools {
  private service = new CitationsService();

  @Tool({
    name: 'fetch_citations',
    description:
      'Retrieves real PubMed publication citation details (title, authors, journal, year, URL) for PubMed IDs. Accepts an array of pubmedIds directly, or extracts them from prsResult/filterResult.',
    inputSchema: z.object({
      pubmedIds: z.array(z.string()).optional().describe('Array of PubMed IDs (PMIDs) to fetch citations for'),
      prsResult: z.object({
        contributions: z.array(z.object({ pubmedId: z.string().optional() })).optional(),
      }).optional().describe('Output of calculate_prs to extract pubmedIds from'),
      filterResult: z.object({
        allDecisions: z.array(z.object({ pubmedId: z.string().optional(), decision: z.string().optional() })).optional(),
      }).optional().describe('Output of filter_evidence to extract included pubmedIds from'),
    }),
    examples: {
      request: { pubmedIds: ['17293876', '17460697'] },
      response: {
        citations: [
          {
            pubmedId: '17293876',
            title: 'TCF7L2 polymorphisms and progression to diabetes',
            authors: 'Florez JC et al.',
            journal: 'N Engl J Med',
            year: '2006',
            url: 'https://pubmed.ncbi.nlm.nih.gov/17293876/',
          },
        ],
      },
    },
  })
  async fetchCitations(input: any, ctx: ExecutionContext) {
    let idsToFetch: string[] = [];

    if (Array.isArray(input.pubmedIds) && input.pubmedIds.length > 0) {
      idsToFetch = input.pubmedIds;
    } else {
      // Extract PMIDs from prsResult contributions or included filter decisions
      const fromPrs = input.prsResult?.contributions?.map((c: any) => c.pubmedId) ?? [];
      const fromFilter = input.filterResult?.allDecisions
        ?.filter((d: any) => d.decision === 'included')
        ?.map((d: any) => d.pubmedId) ?? [];
      idsToFetch = [...new Set([...fromPrs, ...fromFilter].filter(Boolean))];
    }

    ctx.logger.info('Fetching PubMed citations', { count: idsToFetch.length });
    const citations = await this.service.getCitations(idsToFetch);
    return { citations };
  }

  @Tool({
    name: 'get_publication_citation',
    description:
      'Retrieves full PubMed publication citation details for a single PubMed ID (PMID).',
    inputSchema: z.object({
      pubmedId: z.string().describe('Single PubMed ID (PMID)'),
    }),
  })
  async getPublicationCitation(input: { pubmedId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching publication citation', { pubmedId: input.pubmedId });
    const citation = await this.service.getCitation(input.pubmedId);
    if (!citation) {
      return {
        found: false,
        pubmedId: input.pubmedId,
        message: `Citation for PubMed ID ${input.pubmedId} could not be retrieved.`,
      };
    }
    return {
      found: true,
      citation,
    };
  }
}
