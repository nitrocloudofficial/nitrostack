import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { networkTopologyResource, threatIntelResource } from '../../resources/index.js';

export class SimulateLateralMovementTools {
  @Tool({
    name: 'simulate_lateral_movement',
    description: 'Simulate an attacker moving laterally through the digital twin from an entry point, using an APT profile for behavior.',
    inputSchema: z.object({
      twin_id: z.string().describe('The twin_id returned by spin_twin'),
      attacker_profile: z.string().describe('APT profile name to drive simulated behavior'),
      entry_point: z.string().describe('host_id the attacker starts from'),
      simulation_duration_minutes: z.number().describe('Maximum simulated minutes to run'),
    }),
  })
  async simulateLateralMovement(
    { twin_id, attacker_profile, entry_point, simulation_duration_minutes }: {
      twin_id: string;
      attacker_profile: string;
      entry_point: string;
      simulation_duration_minutes: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Simulating lateral movement', { twin_id, attacker_profile, entry_point });

    const topology = networkTopologyResource;
    const threatIntel = threatIntelResource;

    const profile = await threatIntel.getAPTProfile(attacker_profile);
    const criticalAssets = await topology.getCriticalAssets();

    // Simple simulation: follow trust relationships
    const compromised = new Set([entry_point]);
    const steps: any[] = [];
    let current = entry_point;
    let timeElapsed = 0;

    while (timeElapsed < simulation_duration_minutes) {
      const host = await topology.getHost(current);
      if (!host) break;

      const reachable = host.trust_relationships.filter(h => !compromised.has(h));
      if (reachable.length === 0) break;

      // Target critical assets first (APT29 behavior)
      const target = reachable.find(r => criticalAssets.some(c => c.host_id === r)) || reachable[0];
      const timeToCompromise = profile?.kill_chain.find((k: any) => k.phase === 'lateral-movement')?.typical_duration_minutes || 5;

      timeElapsed += timeToCompromise;
      compromised.add(target);
      steps.push({ time: timeElapsed, from: current, to: target, technique: 'T1021' });

      if (criticalAssets.some(c => c.host_id === target)) {
        steps.push({ time: timeElapsed, event: 'CRITICAL_ASSET_COMPROMISED', asset: target });
        break;
      }
      current = target;
    }

    return {
      twin_id,
      time_to_critical: timeElapsed,
      total_hosts_compromised: compromised.size,
      critical_assets_reached: criticalAssets.filter(c => compromised.has(c.host_id)).length,
      simulation_steps: steps,
      recommended_blocks: Array.from(compromised).filter(h => h !== entry_point)
    };
  }
}
