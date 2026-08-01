import { NitroServer } from '../sdk/nitrostack';

export function registerPrompts(server: NitroServer) {
  server.registerPrompt({
    name: 'triage_fault',
    description: 'Guided flight operations prompt for assessing telemetry anomalies and recommending isolation steps.',
    arguments: [
      {
        name: 'satellite_id',
        description: 'Target satellite identifier (e.g. SAT-ALPHA-1)',
        required: true
      }
    ],
    handler: async (args: { satellite_id: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are acting as the Chief Satellite Operations Engineer. Analyze the current telemetry vector and anomaly log for satellite ${args.satellite_id}.\n1. Run 'evaluate_telemetry' using current telemetry values.\n2. Determine if any observed anomaly is a true hardware fault, sensor drift, or South Atlantic Anomaly (SAA) radiation glitch.\n3. Recommend appropriate recovery maneuvers or subsystem isolation commands.`
            }
          }
        ]
      };
    }
  });

  server.registerPrompt({
    name: 'generate_pass_summary',
    description: 'Generates ground station pass summary prompt after satellite contact.',
    arguments: [
      {
        name: 'pass_id',
        description: 'Ground station pass log ID',
        required: true
      }
    ],
    handler: async (args: { pass_id: string }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate a comprehensive pass summary report for pass ID ${args.pass_id}. Query 'generate_diagnostic_report' and summarize any telemetry warnings encountered during contact.`
            }
          }
        ]
      };
    }
  });
}
