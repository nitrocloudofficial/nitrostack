import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

@Injectable()
export class OpportunityFeedTools {
  @Tool({
    name: 'get-opportunity-feed',
    description: 'Retrieve a ranked feed of symbiotic matches and product concepts.',
    inputSchema: z.object({})
  })
  @Widget('opportunity-feed')
  public async getOpportunityFeed(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Retrieving opportunity feed');
    const state = stateManager.getState();

    const matches = state.matches.map(m => ({
      id: m.id, type: 'match' as const, title: `${m.wasteStreamName} Symbiosis`,
      source: m.sourceFactoryName, target: m.targetFactoryName,
      score: m.compatibilityScore, co2Saved: m.co2SavedTonsPerYear,
      savings: m.savingsInrPerYear, status: m.status
    }));

    const products = state.products.map(p => ({
      id: p.id, type: 'product' as const, title: p.name, description: p.description,
      score: p.feasibilityScore, co2Saved: p.co2SavedTonsPerYear,
      savings: p.revenuePotentialInrPerYear, status: p.status
    }));

    const feed = [...matches, ...products].sort((a, b) => b.score - a.score);
    return { success: true, feed, widgetUri: 'ui://opportunity-feed' };
  }
}
