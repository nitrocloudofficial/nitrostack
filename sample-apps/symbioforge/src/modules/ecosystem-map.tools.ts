import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

@Injectable()
export class EcosystemMapTools {
  @Tool({
    name: 'get-ecosystem-map',
    description: 'Retrieve nodes and edges representing factories and symbiotic waste flows for the ecosystem map.',
    inputSchema: z.object({})
  })
  @Widget('ecosystem-map')
  public async getEcosystemMap(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Retrieving ecosystem map data');
    const state = stateManager.getState();

    const nodes = state.factories.map(f => ({
      id: f.id, name: f.name, industryType: f.industryType,
      lat: f.location.lat, lng: f.location.lng,
      co2Avoided: f.co2Avoided, savingsEarned: f.savingsEarned,
      complianceStatus: f.complianceStatus
    }));

    const edges = state.matches.map(m => ({
      id: m.id, source: m.sourceFactoryId, target: m.targetFactoryId,
      wasteStreamName: m.wasteStreamName, compatibilityScore: m.compatibilityScore,
      volumeTonsPerYear: m.volumeTonsPerYear, co2SavedTonsPerYear: m.co2SavedTonsPerYear,
      status: m.status
    }));

    return { success: true, circularScore: state.circularScore, nodes, edges, widgetUri: 'ui://ecosystem-map' };
  }
}
