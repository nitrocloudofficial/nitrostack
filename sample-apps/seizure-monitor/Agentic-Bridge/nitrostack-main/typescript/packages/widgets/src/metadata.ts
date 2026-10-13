/**
 * Widget Metadata System
 * 
 * Allows frontend developers to define widget examples independently
 * from backend tool definitions.
 */

export interface WidgetExample {
  name: string;
  description: string;
  data: Record<string, any>;
}

export interface WidgetMetadata {
  /** Widget URI/route (e.g., '/calculator-result') */
  uri: string;
  
  /** Widget display name */
  name: string;
  
  /** Widget description */
  description: string;
  
  /** Example data for preview/testing */
  examples: WidgetExample[];
  
  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Define widget metadata with type safety
 * 
 * @example
 * ```typescript
 * export const metadata = defineWidgetMetadata({
 *   uri: '/calculator-result',
 *   name: 'Calculator Result',
 *   description: 'Displays calculation results',
 *   examples: [
 *     {
 *       name: 'Addition Example',
 *       description: 'Shows addition result',
 *       data: { result: 8, operation: 'add', a: 5, b: 3 }
 *     }
 *   ]
 * });
 * ```
 */
export function defineWidgetMetadata(metadata: WidgetMetadata): WidgetMetadata {
  return metadata;
}

/**
 * Widget manifest structure
 * Generated during widget build process
 */
export interface WidgetManifest {
  version: string;
  widgets: WidgetMetadata[];
  generatedAt: string;
}

