import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

@Injectable()
export class PathwayTools {
  @Tool({
    name: 'get-pathway',
    description: 'Retrieve the step-by-step manufacturing pathway/blueprint for a specific opportunity.',
    inputSchema: z.object({
      opportunityId: z.string().describe('The ID of the symbiotic match or product concept')
    })
  })
  @Widget('pathway-viewer')
  public async getPathway(args: { opportunityId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`[SymbioForge] Retrieving pathway for opportunity: ${args.opportunityId}`);
    const state = stateManager.getState();
    const blueprint = state.blueprints.find(b => b.opportunityId === args.opportunityId);
    if (!blueprint) {
      return { success: false, message: `No blueprint found for opportunity ID "${args.opportunityId}".` };
    }
    return { success: true, blueprint, widgetUri: 'ui://pathway-viewer' };
  }
}
