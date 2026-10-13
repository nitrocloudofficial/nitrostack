import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

@Injectable()
export class ClusterStateTools {
  @Tool({
    name: 'get-cluster-state',
    description: 'Retrieve the live state of the industrial cluster, including factories, matches, products, and activity logs.',
    inputSchema: z.object({})
  })
  @Widget('agent-swarm-monitor')
  public async getClusterState(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Retrieving live cluster state');
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
      logsCount: state.activityLogs.length,
      activityLogs: state.activityLogs,
      widgetUri: 'ui://agent-swarm-monitor'
    };
  }
}
