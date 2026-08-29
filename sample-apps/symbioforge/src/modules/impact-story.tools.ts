import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { StateManager } from '../orchestrator/state-manager.js';

const stateManager = StateManager.getInstance();

@Injectable()
export class ImpactStoryTools {
  @Tool({
    name: 'get-impact-story',
    description: 'Generates a human-readable impact story based on current ecosystem metrics.',
    inputSchema: z.object({})
  })
  @Widget('impact-story')
  public async getImpactStory(args: any, ctx: ExecutionContext) {
    ctx.logger.info('[SymbioForge] Generating Impact Story');
    const state = stateManager.getState();
    
    // Calculate human equivalents
    const carsOffRoad = Math.round(state.totalCo2Avoided / 4.6);
    const landSavedSqMeters = Math.round(state.totalLandfillDiverted * 4);
    const microLoansFunded = Math.floor(state.totalFinancialValue / 200000);
    const jobsCreated = Math.round(state.totalLandfillDiverted / 50); // 1 job per 50 tons
    const taxRevenue = Math.round(state.totalFinancialValue * 0.15); // 15% estimated tax

    return {
      success: true,
      rawMetrics: {
        co2Avoided: state.totalCo2Avoided,
        landfillDiverted: state.totalLandfillDiverted,
        financialValue: state.totalFinancialValue
      },
      equivalencies: {
        carsOffRoad,
        landSavedSqMeters,
        microLoansFunded,
        jobsCreated,
        taxRevenue
      },
      widgetUri: 'ui://impact-story'
    };
  }
}
