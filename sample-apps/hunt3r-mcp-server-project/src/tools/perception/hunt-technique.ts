import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { siemLogsResource } from '../../resources/index.js';

export class HuntTechniqueTools {
  @Tool({
    name: 'hunt_technique',
    description: 'Hunt for a specific MITRE ATT&CK technique across SIEM data, corroborating evidence across hosts and time.',
    inputSchema: z.object({
      technique_id: z.string().describe('MITRE ATT&CK technique ID, e.g. T1059'),
      timeframe_hours: z.number().describe('How many hours back to search'),
      host_filter: z.array(z.string()).optional().describe('Optional list of host_ids to restrict the hunt to'),
    }),
  })
  async huntTechnique(
    { technique_id, timeframe_hours, host_filter }: {
      technique_id: string;
      timeframe_hours: number;
      host_filter?: string[];
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Hunting technique', { technique_id, timeframe_hours });

    const since = new Date(Date.now() - timeframe_hours * 3600000);
    const siemHits = await siemLogsResource.query({ technique: technique_id, since });

    // Filter by host if specified
    const filteredHits = host_filter
      ? siemHits.filter(h => host_filter.includes(h.host_id))
      : siemHits;

    return {
      technique_id,
      total_hits: filteredHits.length,
      severity: filteredHits.some(h => h.severity === 'critical') ? 'CRITICAL' :
                filteredHits.some(h => h.severity === 'high') ? 'HIGH' : 'MEDIUM',
      corroborated_evidence: filteredHits.map(hit => ({
        timestamp: hit.timestamp,
        host_id: hit.host_id,
        user: hit.user,
        evidence_type: 'siem',
        description: hit.command_line || hit.query || hit.event_type,
        confidence: hit.severity === 'critical' ? 95 : hit.severity === 'high' ? 80 : 60
      })),
      recommended_next_steps: filteredHits.length > 0
        ? ['generate_hypothesis', 'spin_twin']
        : ['continue_monitoring']
    };
  }
}
