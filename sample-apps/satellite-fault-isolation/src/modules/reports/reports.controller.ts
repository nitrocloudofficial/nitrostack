import { NitroServer } from '../../sdk/nitrostack';
import { telemetryStore } from '../../db/telemetryStore.js';

export function registerReportsModule(server: NitroServer) {
  server.registerTool({
    name: 'generate_diagnostic_report',
    description: 'Generates structured satellite anomaly diagnosis summary for flight operations controllers.',
    parameters: {
      type: 'object',
      properties: {
        time_window_minutes: { type: 'number', description: 'Time window in minutes to evaluate' },
        satellite_id: { type: 'string' }
      }
    },
    handler: async (args: { time_window_minutes?: number; satellite_id?: string }) => {
      const satId = args.satellite_id || 'SAT-ALPHA-1';
      const history = telemetryStore.getHistory(20);
      const anomalyEvents = telemetryStore.getAnomalyEvents();

      return {
        satellite_id: satId,
        generated_at: new Date().toISOString(),
        time_window: `${args.time_window_minutes || 60} minutes`,
        total_evaluations: history.length,
        anomalies_flagged: anomalyEvents.length,
        current_status: history.length > 0 ? history[0].class : 'UNKNOWN',
        diagnostic_summary: anomalyEvents.length === 0
          ? 'No spacecraft fault detected. System nominal.'
          : `Detected ${anomalyEvents.length} fault event(s). Primary cause: ${anomalyEvents[0].reason}`,
        recommended_action: anomalyEvents.length === 0
          ? 'Continue routine payload scheduling.'
          : anomalyEvents[0].action,
        raw_events: anomalyEvents
      };
    }
  });
}
