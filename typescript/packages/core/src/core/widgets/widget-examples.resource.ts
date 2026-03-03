/**
 * Widget Examples Resource
 * 
 * Exposes widget metadata and examples via MCP protocol
 */

import { getWidgetRegistry } from './widget-registry.js';

/**
 * Build widget examples resource
 * Returns resource definition for widget://examples
 */
export async function buildWidgetExamplesResource(): Promise<{
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: () => Promise<string>;
}> {
  return {
    uri: 'widget://examples',
    name: 'Widget Examples',
    description: 'Provides metadata and examples for all registered UI widgets',
    mimeType: 'application/json',
    read: async () => {
      const registry = getWidgetRegistry();
      const widgets = registry.getAllWidgets();
      
      return JSON.stringify({
        widgets,
        count: widgets.length,
        loaded: registry.isLoaded(),
      }, null, 2);
    },
  };
}

