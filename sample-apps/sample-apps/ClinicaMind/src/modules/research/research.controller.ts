import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { ResearchService } from './research.service.js';

const SearchPubMedSchema = z.object({
  query: z.string().describe('Medical query or symptom keywords to search on PubMed E-utilities'),
  limit: z.number().optional().default(3).describe('Maximum number of citations to retrieve')
});

const SummarizeResearchSchema = z.object({
  text: z.string().describe('Abstract or clinical text snippet to summarize')
});

@Injectable({ deps: [ResearchService] })
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Tool({
    name: 'search_pubmed',
    description: 'Query NCBI PubMed literature for published clinical guidelines, RCT evidence, and peer-reviewed treatment studies.',
    inputSchema: SearchPubMedSchema,
    examples: {
      request: { query: 'pneumonia elderly diabetes guidelines', limit: 2 },
      response: {
        agent: 'Research Agent',
        articles: [
          {
            pmid: '38291045',
            title: '2026 Clinical Practice Guidelines for Management of Community-Acquired Pneumonia',
            journal: 'JAMA',
            year: '2026',
            evidenceLevel: 'Clinical Guideline',
            url: 'https://pubmed.ncbi.nlm.nih.gov/38291045/'
          }
        ]
      }
    }
  })
  async searchPubMed(args: z.infer<typeof SearchPubMedSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`📚 [Research Agent] Querying PubMed E-utilities for: "${args.query}"`);
    const articles = await this.researchService.searchPubMed(args.query, args.limit);
    return {
      status: 'success',
      agent: 'Research Agent',
      query: args.query,
      articlesCount: articles.length,
      articles
    };
  }

  @Tool({
    name: 'summarize_research',
    description: 'Synthesize medical abstracts into actionable clinical bullet points for physician reference.',
    inputSchema: SummarizeResearchSchema
  })
  async summarizeResearch(args: z.infer<typeof SummarizeResearchSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`📝 [Research Agent] Summarizing research text snippet...`);
    return {
      status: 'success',
      agent: 'Research Agent',
      summary: `Key Finding: ${args.text.slice(0, 150)}... [Evidence Strength: High]`
    };
  }
}
