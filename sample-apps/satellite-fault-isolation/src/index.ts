import { NitroServer } from './sdk/nitrostack';
import { registerTelemetryModule } from './modules/telemetry/telemetry.controller.js';
import { registerAnomalyModule } from './modules/anomaly/anomaly.controller.js';
import { registerAlertsModule } from './modules/alerts/alerts.controller.js';
import { registerReportsModule } from './modules/reports/reports.controller.js';
import { registerAuthModule } from './modules/auth/auth.controller.js';
import { registerNasaModule } from './modules/nasa/nasa.controller.js';
import { registerResources } from './resources/satelliteResources.js';
import { registerPrompts } from './prompts/faultPrompts.js';

/**
 * Satellite Fault Isolation MCP Server
 * Autonomous onboard telemetry classification & fault isolation engine built with NitroStack.
 */

const server = new NitroServer({
  name: 'satellite-fault-isolation',
  version: '1.0.0',
  description: 'Autonomous onboard telemetry anomaly detection, space weather filtering, and safety envelope arbitration.'
});

// 1. Register MCP Tool Modules
registerTelemetryModule(server);
registerAnomalyModule(server);
registerAlertsModule(server);
registerReportsModule(server);
registerAuthModule(server);
registerNasaModule(server);

// 2. Register MCP Resources
registerResources(server);

// 3. Register MCP Prompts
registerPrompts(server);

// 4. Start MCP Server
server.start();
