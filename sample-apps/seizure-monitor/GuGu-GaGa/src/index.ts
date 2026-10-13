/**
 * CREED-Lite MCP Server
 * 
 * Main entry point for the MCP server.
 * Causal Recourse Engine for Equitable Decision-Making.
 *
 * After server creation, inline HTML widget components are attached
 * to each tool so NitroStudio renders rich visual dashboards instead
 * of raw JSON text.
 */

// Set app mode BEFORE any imports — isMcpAppMode() in @nitrostack/core reads
// process.env.NITROSTACK_APP_MODE to decide whether to set _meta.ui.resourceUri
// on tool responses. NitroStudio needs 'mcp-app' mode to load widgets via MCP
// resources/read instead of attempting a localhost HTTP fetch.
process.env.NITROSTACK_APP_MODE = 'mcp-app';

// Run in dual mode (STDIO + HTTP) so that the HTTP server is started on port 3000
// to serve the inline HTML widget resources to NitroStack Studio.
process.env.MCP_TRANSPORT_TYPE = 'dual';

import http from 'http';
import { McpApplicationFactory, createComponent } from '@nitrostack/core';
import { AppModule } from './app.module.js';

// Import inline widget components
import { evaluateApplicantWidget } from './ui-components/evaluate-applicant.widget.js';
import { recoursePathsWidget } from './ui-components/recourse-paths.widget.js';
import { adverseActionWidget } from './ui-components/adverse-action.widget.js';
import { simulateInterventionWidget } from './ui-components/simulate-intervention.widget.js';

/**
 * Widget-to-tool mapping.
 * Keys are tool names (as registered via @Tool decorator),
 * values are the inline Component instances.
 */
const WIDGET_MAP: Record<string, ReturnType<typeof createComponent>> = {
  'evaluate_applicant': evaluateApplicantWidget,
  'find_recourse_paths': recoursePathsWidget,
  'get_adverse_action_reasons': adverseActionWidget,
  'simulate_intervention': simulateInterventionWidget,
};

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create the MCP server (registers all tools, resources, prompts via DI)
  const server = await McpApplicationFactory.create(AppModule);

  // Attach inline HTML widget components to tools.
  // The server's `tools` map is private, but we can access it via
  // the `tool()` method's side-effect: when a Tool already has a
  // component attached, re-registering it via server.tool() triggers
  // registerComponentResource() which makes NitroStudio aware of the widget.
  //
  // We access the private tools Map to find existing Tool instances,
  // attach components to them, and then re-register the component resource.
  const serverInternal = server as any;
  const toolsMap = serverInternal.tools as Map<string, any>;

  for (const [toolName, component] of Object.entries(WIDGET_MAP)) {
    const tool = toolsMap.get(toolName);
    if (tool) {
      tool.setComponent(component);
      // Manually trigger component resource registration so NitroStudio
      // can fetch the widget HTML via resources/read
      await serverInternal.registerComponentResource(component);
      console.log(`  ✓ Widget attached: ${toolName} → ${component.id}`);
    } else {
      console.warn(`  ⚠ Tool not found for widget: ${toolName}`);
    }
  }

  // Start a local widget server on port 3001 to serve the inline HTML widgets
  // directly to NitroStack Studio's iframe requests.
  const widgetServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.replace(/^\/+/, ''); // e.g. 'evaluate-applicant'

    if (req.method === 'POST' && pathname === 'log') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        console.error('--- WIDGET MESSAGE LOG ---');
        console.error(body);
        try {
          import('fs').then(fs => {
            fs.appendFileSync('c:/Users/kalya/Desktop/GuGu-GaGa/scratch/widget_postmessage.log', body + '\n');
          });
        } catch (e) {}
        res.writeHead(200);
        res.end();
      });
      return;
    }
    
    const component = Object.values(WIDGET_MAP).find(c => c.id === pathname);
    if (component) {
      component.compile().then(() => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(component.getBundle());
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Internal Server Error: ${err.message}`);
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  widgetServer.listen(3001, () => {
    console.log('  ✓ Inline widget server listening on port 3001');
  });

  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start CREED-Lite:', error);
  process.exit(1);
});
