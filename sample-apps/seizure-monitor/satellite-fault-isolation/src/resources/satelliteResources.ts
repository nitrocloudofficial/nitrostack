import { NitroServer } from '../sdk/nitrostack';
import { telemetryStore } from '../db/telemetryStore.js';
import { DEFAULT_THRESHOLDS } from '../config/thresholds.js';

export function registerResources(server: NitroServer) {
  server.registerResource({
    uri: 'telemetry://current-state',
    name: 'Current Spacecraft Telemetry Vector',
    mimeType: 'application/json',
    description: 'Provides latest real-time sensor vector for SAT-ALPHA-1',
    handler: async () => {
      return {
        contents: [
          {
            uri: 'telemetry://current-state',
            mimeType: 'application/json',
            text: JSON.stringify(telemetryStore.getCurrentTelemetry(), null, 2)
          }
        ]
      };
    }
  });

  server.registerResource({
    uri: 'telemetry://safety-thresholds',
    name: 'Hard Safety Envelope Thresholds',
    mimeType: 'application/json',
    description: 'Configured hardware limits for bus voltage, battery temp, and tumbling rate',
    handler: async () => {
      return {
        contents: [
          {
            uri: 'telemetry://safety-thresholds',
            mimeType: 'application/json',
            text: JSON.stringify(DEFAULT_THRESHOLDS, null, 2)
          }
        ]
      };
    }
  });

  server.registerResource({
    uri: 'satellite://constellation-health',
    name: 'Constellation Health Matrix',
    mimeType: 'application/json',
    description: 'Status summary across active constellation satellites',
    handler: async () => {
      return {
        contents: [
          {
            uri: 'satellite://constellation-health',
            mimeType: 'application/json',
            text: JSON.stringify(
              [
                { id: 'SAT-ALPHA-1', status: 'NOMINAL', orbit: 'LEO 550km', inclination: '53.0 deg' },
                { id: 'SAT-ALPHA-2', status: 'NOMINAL', orbit: 'LEO 550km', inclination: '53.0 deg' },
                { id: 'SAT-BETA-1', status: 'MONITORING', orbit: 'LEO 600km', inclination: '97.8 deg' }
              ],
              null,
              2
            )
          }
        ]
      };
    }
  });
}
