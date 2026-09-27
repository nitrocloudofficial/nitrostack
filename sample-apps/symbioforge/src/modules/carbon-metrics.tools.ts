import { ToolDecorator as Tool, ResourceDecorator as Resource, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

@Injectable()
export class CarbonMetricsTools {
  @Tool({
    name: 'get-carbon-metrics',
    description: 'Retrieve cluster-wide environmental and financial impact metrics.',
    inputSchema: z.object({})
  })
  @Widget('carbon-dashboard')
  public async getCarbonMetrics(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Retrieving carbon and impact metrics');
    const state = stateManager.getState();
    return {
      success: true,
      circularScore: state.circularScore,
      totalCo2Avoided: state.totalCo2Avoided,
      totalLandfillDiverted: state.totalLandfillDiverted,
      totalWaterSaved: state.totalWaterSaved,
      totalEnergySaved: state.totalEnergySaved,
      totalFinancialValue: state.totalFinancialValue,
      factoriesCount: state.factories.length,
      matchesCount: state.matches.length,
      productsCount: state.products.length,
      blueprintsCount: state.blueprints.length,
      widgetUri: 'ui://carbon-dashboard'
    };
  }

  @Resource({
    uri: 'symbioforge://cluster-state',
    name: 'Live SymbioForge Cluster State',
    description: 'Exposes the complete live state of the industrial cluster, including factories, matches, products, and activity logs.',
    mimeType: 'application/json'
  })
  public async getClusterStateResource(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Exposing cluster state resource');
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(stateManager.getState(), null, 2) }]
    };
  }
}
