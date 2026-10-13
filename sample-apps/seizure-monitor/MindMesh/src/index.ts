/**
 * Research Pilot MCP Server
 *
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { createResource } from '@nitrostack/core';
import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Fix widget component ID mismatch:
 * NitroStack's createComponentFromNextRoute creates component ID "next-{routePath}"
 * but the built HTML files are named "{routePath}.html" (without "next-" prefix).
 * This patches all registered tools and re-registers resources with correct URIs.
 */
function fixWidgetComponentIds(server: any) {
  // Fix tool components
  const tools = server.tools;
  if (tools) {
    for (const [toolName, tool] of tools.entries()) {
      if (tool.hasComponent && tool.hasComponent()) {
        const component = tool.getComponent();
        if (component && component.id && component.id.startsWith('next-')) {
          const routePathId = component.id.substring(5); // Remove 'next-' prefix

          // Override getResourceUri to return the correct URI matching built HTML filename
          component.getResourceUri = () => `ui://widget/${routePathId}.html`;

          // Also patch the component's internal definition ID
          if (component.definition) {
            component.definition.id = routePathId;
          }

          console.log(`[Widget Fix] Patched tool "${toolName}": component ID changed from "${component.id}" to "${routePathId}"`);

          // Re-register the component as a resource with the correct URI
          registerComponentAsResource(server, component, routePathId);
        }
      }
    }
  }

  // Fix resources that were already registered with wrong URIs - delete them
  const resources = server.resources;
  if (resources) {
    const urisToDelete: string[] = [];
    for (const [uri] of resources.entries()) {
      if (uri.startsWith('ui://widget/next-') && uri.endsWith('.html')) {
        urisToDelete.push(uri);
      }
    }
    for (const uri of urisToDelete) {
      resources.delete(uri);
      console.log(`[Widget Fix] Deleted incorrect resource URI: "${uri}"`);
    }
  }

  // Also check resourceTemplates
  const resourceTemplates = server.resourceTemplates;
  if (resourceTemplates) {
    const urisToDelete: string[] = [];
    for (const [templateUri] of resourceTemplates.entries()) {
      if (templateUri.startsWith('ui://widget/next-') && templateUri.endsWith('.html')) {
        urisToDelete.push(templateUri);
      }
    }
    for (const templateUri of urisToDelete) {
      resourceTemplates.delete(templateUri);
      console.log(`[Widget Fix] Deleted incorrect resource template: "${templateUri}"`);
    }
  }

  // Patch templateResources map if it exists
  const templateResources = server.templateResources;
  if (templateResources) {
    const urisToDelete: string[] = [];
    for (const [templateUri] of templateResources.entries()) {
      if (templateUri.startsWith('ui://widget/next-') && templateUri.endsWith('.html')) {
        urisToDelete.push(templateUri);
      }
    }
    for (const templateUri of urisToDelete) {
      templateResources.delete(templateUri);
      console.log(`[Widget Fix] Deleted incorrect template resource: "${templateUri}"`);
    }
  }
}

/**
 * Register a component as a resource with the correct URI
 */
async function registerComponentAsResource(server: any, component: any, routePathId: string) {
  try {
    // Compile the component if not already compiled
    await component.compile();

    // Create resource with the correct URI
    const resource = createResource({
      uri: `ui://widget/${routePathId}.html`,
      name: component.name,
      description: component.description || `UI component for ${component.name}`,
      mimeType: 'text/html',
      handler: async (uri: string, context: any) => {
        context.logger.info(`Serving component: ${uri}`);
        // In production, serve the bundled HTML file if available
        if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod') {
          try {
            const possiblePaths = [
              path.join(process.cwd(), 'src/widgets/out', `${routePathId}.html`),
              path.join(process.cwd(), 'dist/widgets/out', `${routePathId}.html`),
              path.join(process.cwd(), 'widgets/out', `${routePathId}.html`)
            ];
            for (const p of possiblePaths) {
              if (fs.existsSync(p)) {
                const html = fs.readFileSync(p, 'utf-8');
                return { type: 'text', data: html };
              }
            }
            context.logger.warn(`Bundled widget not found for ${routePathId}, falling back to default bundle`);
          }
          catch (error) {
            context.logger.error(`Error serving bundled widget: ${error}`);
          }
        }
        return { type: 'text', data: component.getBundle() };
      },
    });

    // Attach widget metadata
    const metadata = component.getResourceMetadata();
    if (metadata && Object.keys(metadata).length > 0) {
      resource.attachWidgetReadMeta(metadata);
    }

    // Register the resource
    server.resource(resource);

    // Also add to resources Map directly for fast lookup
    if (server.resources) {
      server.resources.set(`ui://widget/${routePathId}.html`, resource);
    }

    console.log(`[Widget Fix] Re-registered component "${component.name}" as resource: ui://widget/${routePathId}.html`);
  }
  catch (error) {
    console.error(`[Widget Fix] Failed to re-register component ${routePathId}:`, error);
  }
}

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Force dual transport (STDIO + HTTP SSE) for NitroStudio compatibility
  process.env.NODE_ENV = 'production';

  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);

  // Patch widget component IDs to match built HTML filenames
  fixWidgetComponentIds(server);

  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});