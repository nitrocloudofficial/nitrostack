import { ResourceDefinition, ResourceTemplateDefinition, ResourceAnnotations, ExecutionContext, ResourceContent } from './types.js';

/**
 * MCP Resource metadata structure (for protocol)
 */
interface McpResource {
  uri: string;
  name: string;
  title?: string;
  description: string;
  mimeType?: string;
  size?: number;
  annotations?: ResourceAnnotations;
}

/**
 * MCP Resource Template metadata structure (for protocol)
 */
interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  annotations?: ResourceAnnotations;
}

/**
 * Resource class provides a clean abstraction for defining and serving resources
 */
export class Resource {
  private definition: ResourceDefinition;
  private caches: Map<string, { content: ResourceContent; timestamp: number }> = new Map();
  private subscribers: Set<string> = new Set();

  constructor(definition: ResourceDefinition) {
    this.definition = definition;
  }

  /**
   * Get resource URI
   */
  get uri(): string {
    return this.definition.uri;
  }

  /**
   * Get resource name
   */
  get name(): string {
    return this.definition.name;
  }

  /**
   * Get resource title (display name)
   */
  get title(): string | undefined {
    return this.definition.title;
  }

  /**
   * Get resource description
   */
  get description(): string {
    return this.definition.description;
  }

  /**
   * Get resource MIME type
   */
  get mimeType(): string | undefined {
    return this.definition.mimeType;
  }

  /**
   * Get resource size in bytes
   */
  get size(): number | undefined {
    return this.definition.size;
  }

  /**
   * Get resource annotations
   */
  get annotations(): ResourceAnnotations | undefined {
    return this.definition.annotations;
  }

  /**
   * Add a subscriber to this resource
   */
  subscribe(subscriberId: string): void {
    this.subscribers.add(subscriberId);
  }

  /**
   * Remove a subscriber from this resource
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  /**
   * Get all subscriber IDs
   */
  getSubscribers(): string[] {
    return Array.from(this.subscribers);
  }

  /**
   * Check if there are any subscribers
   */
  hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }

  /**
   * Fetch the resource content
   * @param context - Execution context
   * @param uri - Optional specific URI to fetch (defaults to resource.uri)
   */
  async fetch(context: ExecutionContext, uri?: string): Promise<ResourceContent> {
    const targetUri = uri || this.uri;
    const cacheable = this.definition.metadata?.cacheable;
    const cacheMaxAge = this.definition.metadata?.cacheMaxAge || 60000; // 1 minute default

    // Check cache for this specific URI
    const existingCache = this.caches.get(targetUri);
    if (cacheable && existingCache) {
      const age = Date.now() - existingCache.timestamp;
      if (age < cacheMaxAge) {
        context.logger.debug(`Serving cached resource: ${targetUri}`);
        return existingCache.content;
      }
    }

    context.logger.info(`Fetching resource: ${targetUri}`);

    try {
      const content = await this.definition.handler(targetUri, context);

      // Update cache for this specific URI
      if (cacheable) {
        this.caches.set(targetUri, {
          content,
          timestamp: Date.now(),
        });
      }

      context.logger.info(`Resource fetched successfully: ${targetUri}`);
      return content;
    } catch (error) {
      context.logger.error(`Error fetching resource: ${targetUri}`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Clear cached content for all URIs or a specific one
   */
  clearCache(uri?: string): void {
    if (uri) {
      this.caches.delete(uri);
    } else {
      this.caches.clear();
    }
  }

  /**
   * MCP Resource metadata structure (full spec compliance)
   */
  toMcpResource(): McpResource {
    const resource: McpResource = {
      uri: this.uri,
      name: this.name,
      description: this.description,
    };

    if (this.title) resource.title = this.title;
    if (this.mimeType) resource.mimeType = this.mimeType;
    if (this.size !== undefined) resource.size = this.size;
    if (this.annotations) resource.annotations = this.annotations;

    return resource;
  }
}

/**
 * Resource Template class for parameterized resources (RFC 6570)
 */
export class ResourceTemplate {
  private definition: ResourceTemplateDefinition;

  constructor(definition: ResourceTemplateDefinition) {
    this.definition = definition;
  }

  get uriTemplate(): string {
    return this.definition.uriTemplate;
  }

  get name(): string {
    return this.definition.name;
  }

  get title(): string | undefined {
    return this.definition.title;
  }

  get description(): string | undefined {
    return this.definition.description;
  }

  get mimeType(): string | undefined {
    return this.definition.mimeType;
  }

  get annotations(): ResourceAnnotations | undefined {
    return this.definition.annotations;
  }

  /**
   * Convert to MCP protocol format
   */
  toMcpResourceTemplate(): McpResourceTemplate {
    const template: McpResourceTemplate = {
      uriTemplate: this.uriTemplate,
      name: this.name,
    };

    if (this.title) template.title = this.title;
    if (this.description) template.description = this.description;
    if (this.mimeType) template.mimeType = this.mimeType;
    if (this.annotations) template.annotations = this.annotations;

    return template;
  }
}

/**
 * Helper function to create a resource
 */
export function createResource(definition: ResourceDefinition): Resource {
  return new Resource(definition);
}

/**
 * Helper function to create a resource template
 */
export function createResourceTemplate(definition: ResourceTemplateDefinition): ResourceTemplate {
  return new ResourceTemplate(definition);
}


