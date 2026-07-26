import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { networkTopologyResource } from '../../resources/index.js';

export class SpinTwinTools {
  @Tool({
    name: 'spin_twin',
    description: 'Spin up a digital twin of the network around a seed host, out to a given depth of trust relationships.',
    inputSchema: z.object({
      seed_host_id: z.string().describe('The host_id to center the twin on'),
      depth_hops: z.number().describe('How many trust-relationship hops to include'),
    }),
  })
  async spinTwin(
    { seed_host_id, depth_hops }: { seed_host_id: string; depth_hops: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Spinning digital twin', { seed_host_id, depth_hops });

    const topology = networkTopologyResource;
    const seed = await topology.getHost(seed_host_id);
    if (!seed) throw new Error(`Host ${seed_host_id} not found`);

    const neighbors = await topology.getNeighbors(seed_host_id, depth_hops);
    const allHosts = [seed, ...neighbors];

    return {
      twin_id: `TWIN-${Date.now()}`,
      seed_host: seed_host_id,
      depth: depth_hops,
      total_hosts: allHosts.length,
      critical_assets_in_scope: allHosts.filter(h => h.criticality === 'CRITICAL').length,
      hosts: allHosts.map(h => ({
        host_id: h.host_id,
        compromised: h.host_id === seed_host_id,
        criticality: h.criticality,
        trust_relationships: h.trust_relationships.filter(t =>
          allHosts.some(ah => ah.host_id === t)
        )
      })),
      simulation_ready: true
    };
  }
}
