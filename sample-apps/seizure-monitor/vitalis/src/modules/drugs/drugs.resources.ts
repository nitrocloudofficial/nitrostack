/**
 * DrugsResources — Resource templates for Drug Safety module.
 * Exposes vitalis://drugs/autocomplete/{query} for real-time frontend drug name suggestions.
 */
import {
  ResourceDecorator as Resource,
  ExecutionContext,
  Injectable,
  ControllerDecorator as Controller,
} from '@nitrostack/core';
import { RxNormService } from '../../integrations/rxnorm.service.js';

@Controller('drugs-resources')
@Injectable({ deps: [RxNormService] })
export class DrugsResources {
  constructor(private readonly rxnorm: RxNormService) {}

  @Resource({
    uri: 'vitalis://drugs/autocomplete/{query}',
    name: 'RxNorm Drug Name Autocomplete',
    description: 'Real-time drug name autocomplete suggestions via RxNorm approximate term matching.',
    mimeType: 'application/json',
  })
  async getAutocompleteSuggestions(params: { query: string }, ctx: ExecutionContext) {
    const query = (params as any)?.query ?? '';
    if (!query || String(query).trim().length < 2) {
      return JSON.stringify({ query, suggestions: [] });
    }

    try {
      const candidates = await this.rxnorm.approximateMatch(String(query), 5);
      const propsList = await Promise.all(
        candidates.map((c) => this.rxnorm.getProperties(c.rxcui)),
      );

      const suggestions = propsList
        .filter((p): p is NonNullable<typeof p> => Boolean(p?.name))
        .map((p) => ({
          name: p.name,
          rxcui: p.rxcui,
          synonym: p.synonym ?? undefined,
          tty: p.tty ?? undefined,
        }));

      return JSON.stringify({ query, suggestions }, null, 2);
    } catch {
      return JSON.stringify({ query, suggestions: [] });
    }
  }
}
