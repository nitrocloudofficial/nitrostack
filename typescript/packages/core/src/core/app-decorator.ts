import 'reflect-metadata';
import { createServer, NitroStackServer } from './server.js';
import { createLogger } from './logger.js';
import { DIContainer } from './di/container.js';
import { registerHealthCheck } from './decorators/health-check.decorator.js';
import { registerEventHandlers } from './events/event.decorator.js';
import { createResource } from './resource.js';
import { isModule, getModuleMetadata, ModuleMetadata, Provider } from './module.js';
import { buildTools, buildResources, buildPrompts } from './builders.js';
import type { ClassConstructor } from './types.js';

/**
 * Controller instance type
 */
interface ControllerInstance {
  [key: string]: unknown;
}

/**
 * Dynamic module with providers (from forRoot() style calls)
 */
interface DynamicModule {
  module?: ClassConstructor;
  providers?: Array<ClassConstructor | { provide: string | symbol; useValue: unknown }>;
}

/**
 * Helper to check if a provider is a ClassConstructor
 */
function isClassConstructor(provider: ClassConstructor | Provider): provider is ClassConstructor {
  return typeof provider === 'function';
}

/**
 * Register a provider (either class or object-style provider)
 */
function registerProvider(container: DIContainer, provider: ClassConstructor | Provider): void {
  if (isClassConstructor(provider)) {
    container.register(provider);
  } else {
    // Object-style provider: { provide: ..., useValue/useClass/useFactory: ... }
    const token = provider.provide as string | symbol;
    if (provider.useValue !== undefined) {
      container.registerValue(token, provider.useValue);
    } else if (provider.useClass) {
      container.register(token, provider.useClass);
    }
    // useFactory could be added later if needed
  }
}

/**
 * Health check instance interface
 */
interface HealthCheckInstance {
  check(): Promise<{ status: string; details?: Record<string, unknown> }> | { status: string; details?: Record<string, unknown> };
}

/**
 * MCP Application Options
 */
export interface McpAppOptions {
  /**
   * Root module of the application
   */
  module: ClassConstructor;
  
  /**
   * Server configuration
   */
  server?: {
    name?: string;
    version?: string;
  };
  
  /**
   * Logging configuration
   */
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
  
  /**
   * Transport configuration
   * - 'stdio': STDIO only (default)
   * - 'http': HTTP only
   * - 'dual': STDIO for MCP + HTTP for OAuth metadata (auto-enabled with OAuth)
   */
  transport?: {
    type: 'stdio' | 'http' | 'dual';
    http?: {
      port?: number;
      host?: string;
      basePath?: string;
    };
  };
}

/**
 * MCP Application Metadata Key
 */
const MCP_APP_METADATA = Symbol('mcp:app');

/**
 * @McpApp Decorator
 * Marks a class as the root application module
 */
export function McpApp(options: McpAppOptions): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any) => {
    Reflect.defineMetadata(MCP_APP_METADATA, options, target);
    return target;
  };
}

/**
 * Get MCP App metadata
 */
export function getMcpAppMetadata(target: ClassConstructor): McpAppOptions | undefined {
  return Reflect.getMetadata(MCP_APP_METADATA, target) as McpAppOptions | undefined;
}

/**
 * MCP Application Factory
 * Creates and bootstraps an MCP application
 */
export class McpApplicationFactory {
  /**
   * Create an MCP application from an app module
   */
  static async create(AppModule: ClassConstructor): Promise<NitroStackServer> {
    const options = getMcpAppMetadata(AppModule);
    
    if (!options) {
      throw new Error(
        `${AppModule.name} is not decorated with @McpApp. ` +
        `Please add @McpApp decorator to your root module.`
      );
    }

    // Create logger
    const logger = createLogger({ level: options.logging?.level || 'info' });
    
    // Set log level if provided
    if (options.logging?.level) {
      process.env.LOG_LEVEL = options.logging.level;
    }

    // Create DI container
    const container = DIContainer.getInstance();
    
    // Register logger in DI for modules that need it
    container.registerValue('Logger', logger);

    // Get module metadata
    const moduleMetadata = getModuleMetadata(options.module);
    
    if (!moduleMetadata) {
      throw new Error(`${options.module.name} is not decorated with @Module`);
    }

    // Register all providers
    if (moduleMetadata.providers) {
      for (const provider of moduleMetadata.providers) {
        registerProvider(container, provider);
        
        // Check if provider is a health check or event handler (only for class constructors)
        if (isClassConstructor(provider)) {
          const healthCheckMetadata = Reflect.getMetadata('nitrostack:health_check', provider) as { name: string } | undefined;
          if (healthCheckMetadata) {
            // Resolve and register health check
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const healthCheckInstance = container.resolve(provider) as any;
            registerHealthCheck(healthCheckInstance, healthCheckMetadata);
            logger.info(`  ✓ Health Check: ${healthCheckMetadata.name}`);
          }
          
          // Check for event handlers
          const eventHandlers = Reflect.getMetadata('nitrostack:event_handler', provider) as Array<{ event: string }> | undefined;
          if (eventHandlers && eventHandlers.length > 0) {
            // Resolve and register event handlers
            const instance = container.resolve(provider);
            registerEventHandlers(instance as object & Record<string, unknown>);
            logger.info(`  ✓ Event Handler: ${provider.name} (${eventHandlers.length} event(s))`);
          }
        }
      }
    }

    // Register all controllers (tools/resources/prompts)
    if (moduleMetadata.controllers) {
      for (const controller of moduleMetadata.controllers) {
        container.register(controller);
      }
    }

    // Track dynamic modules (forRoot() style) to add to server after creation
    const dynamicModulesToAdd: ClassConstructor[] = [];

    // Process imports (other modules)
    if (moduleMetadata.imports) {
      for (const importedModule of moduleMetadata.imports) {
        if (typeof importedModule === 'function') {
          const importedMetadata = getModuleMetadata(importedModule);
          if (importedMetadata) {
            // Register providers from imported module
            if (importedMetadata.providers) {
              for (const provider of importedMetadata.providers) {
                registerProvider(container, provider);
                
                // Check if provider is a health check or event handler (only for class constructors)
                if (isClassConstructor(provider)) {
                  const healthCheckMetadata = Reflect.getMetadata('nitrostack:health_check', provider) as { name: string } | undefined;
                  if (healthCheckMetadata) {
                    // Resolve and register health check
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const healthCheckInstance = container.resolve(provider) as any;
                    registerHealthCheck(healthCheckInstance, healthCheckMetadata);
                    logger.info(`  ✓ Health Check: ${healthCheckMetadata.name}`);
                  }
                  
                  // Check for event handlers
                  const eventHandlers = Reflect.getMetadata('nitrostack:event_handler', provider) as Array<{ event: string }> | undefined;
                  if (eventHandlers && eventHandlers.length > 0) {
                    // Resolve and register event handlers
                    const instance = container.resolve(provider);
                    registerEventHandlers(instance as object & Record<string, unknown>);
                    logger.info(`  ✓ Event Handler: ${provider.name} (${eventHandlers.length} event(s))`);
                  }
                }
              }
            }
            // Register controllers from imported module
            if (importedMetadata.controllers) {
              for (const controller of importedMetadata.controllers) {
                container.register(controller);
              }
            }
          }
        } else if (importedModule && typeof importedModule === 'object') {
          // Handle ConfigModule.forRoot() style dynamic modules
          const dynamicMod = importedModule as DynamicModule;
          if (dynamicMod.providers) {
            for (const provider of dynamicMod.providers) {
              // Check if provider has {provide, useValue} format
              if (provider && typeof provider === 'object' && 'provide' in provider && 'useValue' in provider) {
                const valueProvider = provider as { provide: string | symbol; useValue: unknown };
                container.registerValue(valueProvider.provide, valueProvider.useValue);
              } else {
                container.register(provider as ClassConstructor);
              }
            }
          }
          // If the dynamic module has a module class, we'll add it to the server after creation
          // Don't register it in DI yet to avoid circular dependency issues
          if (dynamicMod.module) {
            dynamicModulesToAdd.push(dynamicMod.module);
          }
        }
      }
    }

    // Create server
    const server = createServer({
      name: options.server?.name || 'mcp-server',
      version: options.server?.version || '1.0.0',
    });

    // Register the server itself in DI so dynamic modules can inject it
    // Use string token since NitroStackServer has specific constructor signature
    container.registerValue('NitroStackServer', server);

    // Now register and add dynamic modules (from forRoot() calls) to server
    for (const dynamicModule of dynamicModulesToAdd) {
      container.register(dynamicModule);
      // Access internal modules array
      const serverInternal = server as unknown as { modules: ClassConstructor[] };
      serverInternal.modules.push(dynamicModule);
    }

    // Build and register tools, resources, and prompts from all controllers
    let totalTools = 0;
    let totalResources = 0;
    let totalPrompts = 0;

    // Process all registered controllers
    const allControllers: ClassConstructor[] = [];
    
    // Get controllers from root module
    if (moduleMetadata.controllers) {
      allControllers.push(...moduleMetadata.controllers);
    }

    // Get controllers from imported modules
    if (moduleMetadata.imports) {
      for (const importedModule of moduleMetadata.imports) {
        if (typeof importedModule === 'function') {
          const importedMetadata = getModuleMetadata(importedModule);
          if (importedMetadata?.controllers) {
            allControllers.push(...importedMetadata.controllers);
          }
        }
      }
    }

    // Build and register from each controller
    for (const controllerClass of allControllers) {
      // Resolve controller instance from DI container
      const controller = container.resolve(controllerClass) as ControllerInstance;
      
      // Build tools
      const tools = buildTools(controller);
      for (const tool of tools) {
        server.tool(tool);
        totalTools++;
      }

      // Build resources
      const resources = buildResources(controller);
      for (const resource of resources) {
        server.resource(resource);
        totalResources++;
      }

      // Build prompts
      const prompts = buildPrompts(controller);
      for (const prompt of prompts) {
        server.prompt(prompt);
        totalPrompts++;
      }
    }

    // Register health checks resource if any health checks exist
    const { buildHealthChecksResource } = await import('./health/health-checks.resource.js');
    const healthChecksResourceDef = await buildHealthChecksResource();
    const healthChecksResource = createResource({
      uri: healthChecksResourceDef.uri,
      name: healthChecksResourceDef.name,
      description: healthChecksResourceDef.description,
      mimeType: healthChecksResourceDef.mimeType,
      handler: async (uri: string, context) => {
        const content = await healthChecksResourceDef.read();
        return { type: 'text', data: content };
      },
    });
    server.resource(healthChecksResource);
    logger.info(`✅ Health checks resource registered`);

    // Load widget manifest and register widget examples resource
    try {
      const { getWidgetRegistry } = await import('./widgets/widget-registry.js');
      const { buildWidgetExamplesResource } = await import('./widgets/widget-examples.resource.js');
      const { join } = await import('path');
      
      const registry = getWidgetRegistry();
      const widgetManifestPath = join(process.cwd(), 'src', 'widgets', 'widget-manifest.json');
      registry.loadManifest(widgetManifestPath);
      
      const widgetExamplesResourceDef = await buildWidgetExamplesResource();
      const widgetExamplesResource = createResource({
        uri: widgetExamplesResourceDef.uri,
        name: widgetExamplesResourceDef.name,
        description: widgetExamplesResourceDef.description,
        mimeType: widgetExamplesResourceDef.mimeType,
        handler: async (uri: string, context) => {
          const content = await widgetExamplesResourceDef.read();
          return { type: 'text' as const, data: content };
        },
      });
      server.resource(widgetExamplesResource);
      logger.info(`Widget examples resource registered`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Widget examples not available: ${errorMessage}`);
    }

    logger.info(`✅ Application initialized with ${totalTools} tools, ${totalResources} resources, ${totalPrompts} prompts`);

    // Transport options interface
    interface TransportOptions {
      port: number;
      host: string;
      basePath: string;
      oauth?: {
        resourceUri: string;
        authorizationServers: string[];
        scopesSupported?: string[];
      };
    }

    // Auto-detect transport type based on configuration
    let transportType: 'stdio' | 'http' | 'dual' = 'stdio';
    let transportOptions: TransportOptions | undefined = undefined;
    
    // Check explicit transport configuration
    if (options.transport?.type) {
      transportType = options.transport.type;
    }
    
    // Check if OAuth is configured
    const { OAuthModule } = await import('./oauth-module.js');
    const oauthConfig = OAuthModule.getConfig();
    
    if (oauthConfig) {
      // OAuth requires DUAL transport: STDIO for MCP + HTTP for metadata
      // This allows Studio to connect via STDIO while exposing OAuth metadata via HTTP
      transportType = 'dual';
      
      // Extract port from resourceUri (e.g., http://localhost:3002)
      let port = 3000;
      try {
        const resourceUrl = new URL(oauthConfig.resourceUri);
        port = resourceUrl.port ? parseInt(resourceUrl.port) : (resourceUrl.protocol === 'https:' ? 443 : 80);
      } catch (error) {
        logger.warn(`Failed to parse resourceUri for port, using default 3000`);
      }
      
      // Override with explicit config if provided
      if (oauthConfig.http?.port) {
        port = oauthConfig.http.port;
      } else if (options.transport?.http?.port) {
        port = options.transport.http.port;
      }
      
      transportOptions = {
        port,
        host: oauthConfig.http?.host || options.transport?.http?.host || '0.0.0.0',
        basePath: oauthConfig.http?.basePath || options.transport?.http?.basePath || '/mcp',
        oauth: {
          resourceUri: oauthConfig.resourceUri,
          authorizationServers: oauthConfig.authorizationServers,
          scopesSupported: oauthConfig.scopesSupported,
        },
      };
      logger.info(`🔐 OAuth 2.1 detected - using HTTP transport on port ${port}`);
    } else if (options.transport?.type === 'http') {
      // Explicitly configured HTTP transport
      transportType = 'http';
      transportOptions = {
        port: options.transport.http?.port || 3000,
        host: options.transport.http?.host || '0.0.0.0',
        basePath: options.transport.http?.basePath || '/mcp',
      };
    }
    
    // Store transport configuration on server for later use
    const serverInternal = server as unknown as { 
      _transportType: 'stdio' | 'http' | 'dual';
      _transportOptions: TransportOptions | undefined;
    };
    serverInternal._transportType = transportType;
    serverInternal._transportOptions = transportOptions;

    return server;
  }
}

