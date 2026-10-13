/**
 * Widget Registry
 * 
 * Manages widget metadata and example resolution
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface WidgetExample {
  name: string;
  description: string;
  data: Record<string, unknown>;
}

export interface WidgetMetadata {
  uri: string;
  name: string;
  description: string;
  examples: WidgetExample[];
  tags?: string[];
}

export interface WidgetManifest {
  version: string;
  widgets: WidgetMetadata[];
  generatedAt: string;
}

/**
 * Widget Registry
 * Loads and manages widget metadata from manifest
 */
export class WidgetRegistry {
  private widgets: Map<string, WidgetMetadata> = new Map();
  private loaded: boolean = false;

  /**
   * Load widget manifest from file
   */
  loadManifest(manifestPath: string): void {
    if (!existsSync(manifestPath)) {
      // Use stderr to avoid corrupting MCP stdio protocol
      console.error(`[Widget Registry] Manifest not found at ${manifestPath}, skipping widget examples`);
      return;
    }

    try {
      const manifestContent = readFileSync(manifestPath, 'utf-8');
      const manifest: WidgetManifest = JSON.parse(manifestContent);

      for (const widget of manifest.widgets) {
        this.widgets.set(widget.uri, widget);
      }

      this.loaded = true;
      // Use stderr to avoid corrupting MCP stdio protocol
      console.error(`[Widget Registry] Loaded ${this.widgets.size} widget(s) from manifest`);
    } catch (error: unknown) {
      console.error(`[Widget Registry] Failed to load widget manifest:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get all widgets
   */
  getAllWidgets(): WidgetMetadata[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widget by URI
   */
  getWidget(uri: string): WidgetMetadata | undefined {
    return this.widgets.get(uri);
  }

  /**
   * Get widget example data
   * Returns the first example's data, or undefined if no examples
   */
  getWidgetExampleData(uri: string): Record<string, unknown> | undefined {
    const widget = this.widgets.get(uri);
    return widget?.examples[0]?.data;
  }

  /**
   * Check if manifest is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

// Global registry instance
let registryInstance: WidgetRegistry | null = null;

/**
 * Get the global widget registry instance
 */
export function getWidgetRegistry(): WidgetRegistry {
  if (!registryInstance) {
    registryInstance = new WidgetRegistry();
  }
  return registryInstance;
}

