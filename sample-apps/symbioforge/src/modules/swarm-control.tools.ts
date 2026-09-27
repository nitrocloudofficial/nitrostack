import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager, scheduler, eventBus } from './bootstrap.js';

@Injectable()
export class SwarmControlTools {
  private getSwarmSnapshot() {
    const state = stateManager.getState();
    return {
      circularScore: state.circularScore,
      totalCo2Avoided: state.totalCo2Avoided,
      totalLandfillDiverted: state.totalLandfillDiverted,
      totalWaterSaved: state.totalWaterSaved,
      totalFinancialValue: state.totalFinancialValue,
      factoriesCount: state.factories.length,
      matchesCount: state.matches.length,
      productsCount: state.products.length,
      blueprintsCount: state.blueprints.length,
      logsCount: state.activityLogs.length,
      activityLogs: state.activityLogs.slice(0, 50)
    };
  }

  @Tool({
    name: 'control-swarm',
    description: 'Start, stop, or reset the autonomous agent swarm and scheduler.',
    inputSchema: z.object({
      action: z.enum(['start', 'stop', 'reset']).describe('The action to perform')
    })
  })
  public async controlSwarm(args: { action: 'start' | 'stop' | 'reset' }, ctx: ExecutionContext) {
    ctx.logger.info(`[SymbioForge] Swarm control action: ${args.action}`);
    if (args.action === 'start') {
      stateManager.setSwarmActive(true);
      scheduler.start();
      return { success: true, message: 'Swarm and scheduler started.', ...this.getSwarmSnapshot(), widgetUri: 'ui://agent-swarm-monitor' };
    } else if (args.action === 'stop') {
      stateManager.setSwarmActive(false);
      scheduler.stop();
      return { success: true, message: 'Swarm and scheduler stopped.', ...this.getSwarmSnapshot(), widgetUri: 'ui://agent-swarm-monitor' };
    } else {
      stateManager.resetState();
      scheduler.reset();
      return { success: true, message: 'Swarm and cluster state reset to initial values.', ...this.getSwarmSnapshot(), widgetUri: 'ui://agent-swarm-monitor' };
    }
  }

  @Tool({
    name: 'trigger-disruption',
    description: 'Simulate a factory shutdown or volume change to test the Sentinel self-healing capabilities.',
    inputSchema: z.object({
      factoryId: z.string().describe('The ID of the factory to halt'),
      volume: z.number().optional().describe('New waste volume (if simulating volume spike/drop instead of halt)')
    })
  })
  public async triggerDisruption(args: { factoryId: string, volume?: number }, ctx: ExecutionContext) {
    ctx.logger.info(`[SymbioForge] Triggering disruption for: ${args.factoryId}`);
    const factory = stateManager.getFactory(args.factoryId);
    if (!factory) {
      return { success: false, message: `Factory with ID "${args.factoryId}" not found.`, ...this.getSwarmSnapshot() };
    }

    if (args.volume !== undefined) {
      stateManager.addLog('System', `MANUAL ALERT: Volume update injected for ${factory.name} (${args.volume} kg)`, 'info');
      eventBus.publish({ type: 'VOLUME_UPDATE', payload: { factoryId: args.factoryId, currentVolume: args.volume } });
      return { success: true, message: `Volume update (${args.volume} kg) sent to Sentinel.`, ...this.getSwarmSnapshot(), widgetUri: 'ui://agent-swarm-monitor' };
    }

    stateManager.addLog('Sentinel', `MANUAL ALERT: Factory "${factory.name}" reported temporary production halt!`, 'warning');
    const matches = stateManager.getMatches();
    const affectedMatches = matches.filter(m => m.sourceFactoryId === args.factoryId || m.targetFactoryId === args.factoryId);

    if (affectedMatches.length > 0) {
      stateManager.addLog('Sentinel', `Impact: ${affectedMatches.length} symbiotic chains affected. Re-triggering Matchmaker...`, 'warning');
      factory.complianceStatus = 'pending';
      stateManager.recalculateMetrics();
      eventBus.publish({ type: 'SENTINEL_TRIGGERED', payload: { reason: `manual_halt_${args.factoryId}` } });
      return { success: true, message: `Disruption triggered. Sentinel is self-healing ${affectedMatches.length} affected chains.`, ...this.getSwarmSnapshot(), widgetUri: 'ui://agent-swarm-monitor' };
    }

    return { success: true, message: `Disruption triggered for "${factory.name}", but no active symbiotic chains were affected.`, ...this.getSwarmSnapshot(), widgetUri: 'ui://agent-swarm-monitor' };
  }
}
