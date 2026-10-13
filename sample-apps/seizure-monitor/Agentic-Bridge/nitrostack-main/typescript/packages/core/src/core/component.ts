import { ExecutionContext } from './types.js';

/**
 * Component metadata for UI rendering
 */
export interface ComponentMetadata {
  /** Unique identifier for the component */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what the component displays */
  description?: string;

  /** HTML content or path to HTML file */
  html: string;

  /** CSS content or path to CSS file */
  css?: string;

  /** JavaScript content or path to JS file */
  js?: string;

  /** Whether component can initiate tool calls */
  canInvokeTools?: boolean;

  /** Content Security Policy domains */
  csp?: {
    connectDomains?: string[];
    resourceDomains?: string[];
    frameDomains?: string[];
  };

  /** Custom subdomain for component rendering */
  subdomain?: string;

  /** Whether to show border around component */
  prefersBorder?: boolean;

  /** Provider-specific metadata */
  providerMetadata?: Record<string, unknown>;

  /** Internal metadata (not exposed to MCP) */
  _meta?: Record<string, unknown>;
}

/**
 * Component definition
 */
export interface ComponentDefinition extends ComponentMetadata {
  /** Data transformation function for structuredContent */
  transformer?: (data: unknown, context: ExecutionContext) => unknown;

  /** Data transformation function for _meta (widget state) */
  metaTransformer?: (data: unknown, context: ExecutionContext) => unknown;

  /** Component initialization logic */
  onInit?: (context: ExecutionContext) => void | Promise<void>;
}

/**
 * Component class for defining UI components
 */
export class Component {
  private definition: ComponentDefinition;
  private compiled: boolean = false;
  private bundle: {
    html: string;
    css?: string;
    js?: string;
  } = { html: '' };

  constructor(definition: ComponentDefinition) {
    this.definition = definition;
    this.validateDefinition();
  }

  private validateDefinition(): void {
    if (!this.definition.id) {
      throw new Error('Component ID is required');
    }
    if (!this.definition.name) {
      throw new Error('Component name is required');
    }
    // HTML is required unless we are in dev mode or using static exports
    if (!this.definition.html && !this.definition._meta?.devMode) {
      // We'll check for static files during compile
    }
  }

  /**
   * Get component ID
   */
  get id(): string {
    return this.definition.id;
  }

  /**
   * Get component name
   */
  get name(): string {
    return this.definition.name;
  }

  /**
   * Get component description
   */
  get description(): string | undefined {
    return this.definition.description;
  }

  /**
   * Compile component bundle
   */
  async compile(): Promise<void> {
    if (this.compiled) return;

    // Check if we should load from static export (esbuild output)
    // We assume the widgets are built to src/widgets/out
    // and the file name corresponds to the component ID (e.g. id="weather" -> weather.html)
    const fs = await import('fs');
    const path = await import('path');

    const widgetsOutDir = path.resolve(process.cwd(), 'src/widgets/out');

    // Try exact ID first
    let componentHtmlPath = path.join(widgetsOutDir, `${this.id}.html`);

    // If not found and ID starts with 'next-', try without the prefix
    // This handles the case where createComponentFromNextRoute adds 'next-' prefix
    // but the actual file is named without it (e.g., calculator-result.html)
    if (!fs.existsSync(componentHtmlPath) && this.id.startsWith('next-')) {
      const idWithoutPrefix = this.id.substring(5); // Remove 'next-' prefix
      componentHtmlPath = path.join(widgetsOutDir, `${idWithoutPrefix}.html`);
    }

    if (fs.existsSync(componentHtmlPath)) {
      try {
        // The esbuild bundler already creates self-contained HTML files
        // with all JavaScript and CSS inlined, so we just read the file
        const htmlContent = fs.readFileSync(componentHtmlPath, 'utf-8');

        this.bundle = {
          html: htmlContent
        };
        this.compiled = true;
        return;
      } catch (err) {
        console.warn(`Failed to read widget file for ${this.id}:`, err);
      }
    }

    // Fallback to inline definition
    this.bundle = {
      html: this.definition.html || '',
      css: this.definition.css,
      js: this.definition.js,
    };

    if (!this.bundle.html && !this.definition._meta?.devMode) {
      console.warn(`Warning: Component ${this.id} has no HTML content and no static file found at ${componentHtmlPath}`);
    }

    this.compiled = true;
  }

  /**
   * Get compiled bundle as HTML document
   */
  getBundle(): string {
    if (!this.compiled) {
      throw new Error('Component not compiled. Call compile() first.');
    }

    const cssTag = this.bundle.css
      ? `<style>${this.bundle.css}</style>`
      : '';

    const jsTag = this.bundle.js
      ? `<script type="module">${this.bundle.js}</script>`
      : '';

    return `
${this.bundle.html}
${cssTag}
${jsTag}
    `.trim();
  }

  /**
   * Get component URI for resource registration
   */
  getResourceUri(): string {
    // In dev mode, return the dev URL if available
    if (this.definition._meta?.devMode && this.definition._meta?.devUrl) {
      return String(this.definition._meta.devUrl);
    }
    return `ui://widget/${this.definition.id}.html`;
  }

  /**
   * Check if component is in dev mode
   */
  isDevMode(): boolean {
    return this.definition._meta?.devMode === true;
  }

  /**
   * Get dev URL if in dev mode
   */
  getDevUrl(): string | null {
    const devUrl = this.definition._meta?.devUrl;
    return devUrl ? String(devUrl) : null;
  }

  /**
   * Transform data for component
   */
  async transformData(data: unknown, context: ExecutionContext): Promise<unknown> {
    if (this.definition.transformer) {
      return await this.definition.transformer(data, context);
    }
    return data;
  }

  /**
   * Get widget metadata (state)
   */
  async getWidgetMeta(data: unknown, context: ExecutionContext): Promise<unknown> {
    if (this.definition.metaTransformer) {
      return await this.definition.metaTransformer(data, context);
    }
    // Default: return empty object or maybe the data itself if appropriate?
    // For now, let's return null so the server knows there's no specific meta
    return null;
  }

  /**
   * Get provider-specific metadata
   */
  getProviderMetadata(provider: 'openai' | 'anthropic' | 'generic'): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    switch (provider) {
      case 'openai':
        metadata['openai/outputTemplate'] = this.getResourceUri();
        metadata['openai/widgetAccessible'] = this.definition.canInvokeTools || false;

        if (this.definition.description) {
          metadata['openai/widgetDescription'] = this.definition.description;
        }

        if (this.definition.prefersBorder) {
          metadata['openai/widgetPrefersBorder'] = true;
        }

        if (this.definition.subdomain) {
          metadata['openai/widgetDomain'] = this.definition.subdomain;
        }

        if (this.definition.csp) {
          const csp: Record<string, string[]> = {};
          if (this.definition.csp.connectDomains && this.definition.csp.connectDomains.length > 0) {
            csp.connect_domains = this.definition.csp.connectDomains;
          }
          if (this.definition.csp.resourceDomains && this.definition.csp.resourceDomains.length > 0) {
            csp.resource_domains = this.definition.csp.resourceDomains;
          }
          if (this.definition.csp.frameDomains && this.definition.csp.frameDomains.length > 0) {
            csp.frame_domains = this.definition.csp.frameDomains;
          }
          
          if (Object.keys(csp).length > 0) {
            metadata['openai/widgetCSP'] = csp;
          }
        }
        break;

      case 'anthropic':
        // Future: Anthropic-specific metadata
        metadata['anthropic/ui'] = this.getResourceUri();
        break;

      case 'generic':
      default:
        // Generic provider metadata
        metadata['ui/template'] = this.getResourceUri();
        metadata['ui/interactive'] = this.definition.canInvokeTools || false;
        break;
    }

    // Merge with custom provider metadata
    if (this.definition.providerMetadata) {
      Object.assign(metadata, this.definition.providerMetadata);
    }

    return metadata;
  }

  /**
   * Get resource metadata for MCP
   */
  getResourceMetadata(): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      mimeType: 'text/html',
    };

    // Add OpenAI-specific metadata
    const openaiMeta = this.getProviderMetadata('openai');
    if (openaiMeta['openai/widgetCSP']) {
      metadata['openai/widgetCSP'] = openaiMeta['openai/widgetCSP'];
    }
    if (openaiMeta['openai/widgetDescription']) {
      metadata['openai/widgetDescription'] = openaiMeta['openai/widgetDescription'];
    }
    if (openaiMeta['openai/widgetPrefersBorder']) {
      metadata['openai/widgetPrefersBorder'] = openaiMeta['openai/widgetPrefersBorder'];
    }
    if (openaiMeta['openai/widgetDomain']) {
      metadata['openai/widgetDomain'] = openaiMeta['openai/widgetDomain'];
    }

    return metadata;
  }

  /**
   * Initialize component
   */
  async initialize(context: ExecutionContext): Promise<void> {
    if (this.definition.onInit) {
      await this.definition.onInit(context);
    }
  }
}

/**
 * Helper function to create a component
 */
export function createComponent(definition: ComponentDefinition): Component {
  return new Component(definition);
}

