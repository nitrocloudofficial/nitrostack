import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { siemLogsResource } from '../../resources/index.js';

export class TemporalReconstructionTools {
  @Tool({
    name: 'temporal_reconstruction',
    description: 'Reconstruct the timeline of suspicious activity on a host to find patient zero and dwell time.',
    inputSchema: z.object({
      host_id: z.string().describe('The host to reconstruct a timeline for'),
      lookback_hours: z.number().describe('How many hours back to search'),
    }),
  })
  async temporalReconstruction(
    { host_id, lookback_hours }: { host_id: string; lookback_hours: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Reconstructing timeline', { host_id, lookback_hours });

    const siem = siemLogsResource;
    const since = new Date(Date.now() - lookback_hours * 3600000);

    const events = await siem.query({ host_id, since });
    const suspicious = events.filter(e =>
      ['high', 'critical'].includes(e.severity) || e.mitre_technique
    );

    const patientZero = suspicious[0] || null;
    const dwellTime = patientZero
      ? (new Date().getTime() - new Date(patientZero.timestamp).getTime()) / 3600000
      : 0;

    return {
      host_id,
      patient_zero: patientZero ? {
        timestamp: patientZero.timestamp,
        technique: patientZero.mitre_technique,
        description: `${patientZero.process_name}: ${patientZero.command_line?.substring(0, 80)}...`
      } : null,
      dwell_time_hours: Math.round(dwellTime * 100) / 100,
      total_events: events.length,
      suspicious_events: suspicious.length,
      key_moments: suspicious.map(e => ({
        timestamp: e.timestamp,
        type: e.mitre_technique || e.event_type,
        severity: e.severity
      }))
    };
  }
}
