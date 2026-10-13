import { ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { ElasticService, type RetrievalResult } from '../services/elastic.client.js';
import { buildSuccessEnvelope, dependencyUnavailableEnvelope } from '../domain/response-envelope.js';

type SearchStatus = 'HIT' | 'MISS' | 'DEGRADED';

/**
 * HIT takes priority over DEGRADED whenever real hits were found, even via lexical
 * fallback - the data is genuine either way. DEGRADED only fires on an empty lexical
 * result, since a hybrid search might have found something a BM25-only pass could not.
 * `warnings` still discloses lexical fallback on the HIT path (see below).
 */
function deriveSearchStatus(result: RetrievalResult): SearchStatus {
  if (result.hits.length > 0) return 'HIT';
  return result.mode === 'lexical' ? 'DEGRADED' : 'MISS';
}

function lexicalFallbackWarnings(result: RetrievalResult): string[] {
  return result.mode === 'lexical'
    ? ['Semantic vector search was unavailable; results reflect BM25 lexical search only.']
    : [];
}

const searchFixSchema = z.object({
  stacktrace: z.string().describe('The error stacktrace or error message to search for.'),
  language: z.string().describe('Programming language environment (e.g. python, javascript, docker).'),
  framework: z.string().optional().describe('Framework name if applicable (e.g. fastapi, express, react).'),
  packageVersions: z.record(z.string()).optional().describe('Key-value record of active package versions.'),
  limit: z.number().optional().default(5).describe('Maximum number of results to return.'),
});

const findSimilarSchema = z.object({
  query: z.string().describe('Problem description or natural language query.'),
  limit: z.number().optional().default(5).describe('Maximum number of results to return.'),
});

export interface SearchToolsOptions {
  elasticService?: ElasticService;
}

@Controller()
export class SearchTools {
  private elasticService: ElasticService;

  constructor(options: SearchToolsOptions = {}) {
    this.elasticService = options.elasticService ?? new ElasticService();
  }

  @Tool({
    name: 'search_fix',
    description: 'Finds verified patches and fixes matching a given stack trace or error log.',
    inputSchema: searchFixSchema,
  })
  async searchFix(params: z.infer<typeof searchFixSchema>) {
    if (!this.elasticService.isConnected()) {
      return dependencyUnavailableEnvelope('Elasticsearch is not configured; search_fix cannot run.');
    }
    const result = await this.elasticService.searchFix(params);
    return buildSuccessEnvelope(
      deriveSearchStatus(result),
      {
        count: result.hits.length,
        searchMode: result.mode,
        fixes: result.hits.map((hit) => ({ ...hit.card, score: hit.score, confidence: hit.confidence })),
      },
      lexicalFallbackWarnings(result)
    );
  }

  @Tool({
    name: 'find_similar',
    description: 'Performs semantic vector search across the knowledge store to find related engineering fixes.',
    inputSchema: findSimilarSchema,
  })
  async findSimilar(params: z.infer<typeof findSimilarSchema>) {
    if (!this.elasticService.isConnected()) {
      return dependencyUnavailableEnvelope('Elasticsearch is not configured; find_similar cannot run.');
    }
    const result = await this.elasticService.findSimilar(params.query, params.limit);
    return buildSuccessEnvelope(
      deriveSearchStatus(result),
      {
        count: result.hits.length,
        searchMode: result.mode,
        applicationEligible: false as const,
        fixes: result.hits.map((hit) => ({ ...hit.card, score: hit.score, confidence: hit.confidence })),
      },
      lexicalFallbackWarnings(result)
    );
  }
}
