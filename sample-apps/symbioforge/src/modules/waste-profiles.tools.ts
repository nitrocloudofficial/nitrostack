import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

@Injectable()
export class WasteProfilesTools {
  @Tool({
    name: 'get-waste-profiles',
    description: 'Retrieve factories and their detailed classified waste streams.',
    inputSchema: z.object({})
  })
  @Widget('waste-profiles')
  public async getWasteProfiles(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Retrieving waste profiles');
    const state = stateManager.getState();
    return {
      success: true,
      factories: state.factories.map(f => ({
        id: f.id,
        name: f.name,
        industryType: f.industryType,
        productionCapacity: f.productionCapacity,
        declaredWastes: f.declaredWastes,
        wasteStreams: f.wasteStreams ?? [],
        complianceStatus: f.complianceStatus,
        savingsEarned: f.savingsEarned,
        co2Avoided: f.co2Avoided
      })),
      widgetUri: 'ui://waste-profiles'
    };
  }
}
