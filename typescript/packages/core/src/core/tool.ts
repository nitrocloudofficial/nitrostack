import { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { Component } from './component.js';
import { ExecutionContext, JsonValue, ToolAnnotations } from './types.js';
import { Guard, GuardConstructor } from './guards/guard.interface.js';
import { MiddlewareInterface, MiddlewareConstructor } from './middleware/middleware.interface.js';
import { InterceptorInterface, InterceptorConstructor } from './interceptors/interceptor.interface.js';
import { PipeInterface, PipeConstructor } from './pipes/pipe.interface.js';
import { ExceptionFilterInterface, ExceptionFilterConstructor } from './filters/exception-filter.interface.js';
import { DIContainer } from './di/container.js';
import type { TaskSupportLevel } from './task.js';
import { isMcpAppMode, isOpenAiMode } from './app-mode.js';
import { mergeToolUiMeta } from './widget-mcp-meta.js';

/**
 * JSON Schema representation for tool input
 */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  description?: string;
  default?: JsonValue;
  enum?: JsonValue[];
  [key: string]: unknown;
}

/**
 * Tool input schema - can be Zod schema or JSON Schema
 */
export type ToolInputSchema = z.ZodSchema | JsonSchema;

/**
 * Tool handler function type
 */
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ExecutionContext
) => Promise<TOutput>;

/**
 * Tool examples for documentation
 */
export interface ToolExamples {
  request?: JsonValue;
  response?: JsonValue;
}

/**
 * Tool invocation status messages (OpenAI Apps SDK)
 */
export interface ToolInvocation {
  /** Message shown while tool is executing */
  invoking?: string;
  /** Message shown after tool completes */
  invoked?: string;
}

export interface ToolOptions<TInput = unknown, TOutput = unknown> {
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description: string;
  inputSchema: ToolInputSchema;
  /** Optional JSON Schema for validating tool output */
  outputSchema?: ToolInputSchema;
  /** Optional annotations describing tool behavior */
  annotations?: ToolAnnotations;
  /** Optional invocation status messages for UI feedback */
  invocation?: ToolInvocation;
  handler: ToolHandler<TInput, TOutput>;
  guards?: GuardConstructor[];
  middlewares?: MiddlewareConstructor[];
  interceptors?: InterceptorConstructor[];
  pipes?: PipeConstructor[];
  filters?: ExceptionFilterConstructor[];
  examples?: ToolExamples;
  widget?: {
    route: string;
  };
  outputTemplate?: string;
  isInitial?: boolean;
  /**
   * Task support level for this tool.
   * - 'forbidden' (default): Tool cannot be invoked as a task
   * - 'optional': Tool can be invoked normally or as a task
   * - 'required': Tool MUST be invoked as a task
   */
  taskSupport?: TaskSupportLevel;
  /**
   * Tool visibility (MCP Apps mode).
   */
  visibility?: 'visible' | 'hidden';
}

export class Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  title?: string;
  description: string;
  inputSchema: ToolInputSchema;
  outputSchema?: ToolInputSchema;
  annotations?: ToolAnnotations;
  invocation?: ToolInvocation;
  visibility?: 'visible' | 'hidden';
  examples?: ToolExamples;
  widget?: {
    route: string;
  };
  outputTemplate?: string;
  isInitial?: boolean;
  /** Task support level for this tool */
  taskSupport: TaskSupportLevel;
  private handler: ToolHandler<TInput, TOutput>;
  private guards: GuardConstructor[];
  private middlewares: MiddlewareConstructor[];
  private interceptors: InterceptorConstructor[];
  private pipes: PipeConstructor[];
  private filters: ExceptionFilterConstructor[];
  private component?: Component;

  constructor(options: ToolOptions<TInput, TOutput>) {
    this.name = options.name;
    this.title = options.title;
    this.description = options.description;
    this.inputSchema = options.inputSchema;
    this.outputSchema = options.outputSchema;
    this.annotations = options.annotations;
    this.invocation = options.invocation;
    this.handler = options.handler;
    this.guards = options.guards || [];
    this.middlewares = options.middlewares || [];
    this.interceptors = options.interceptors || [];
    this.pipes = options.pipes || [];
    this.filters = options.filters || [];
    this.examples = options.examples;
    this.widget = options.widget;
    this.outputTemplate = options.outputTemplate;
    this.isInitial = options.isInitial;
    this.taskSupport = options.taskSupport ?? 'forbidden';
    this.visibility = options.visibility || 'visible';
  }

  /**
   * Execute the tool with full pipeline:
   * Exception Filters -> Guards -> Middleware -> Interceptors -> Pipes -> Handler
   */
  async execute(input: TInput, context: ExecutionContext): Promise<TOutput> {
    const container = DIContainer.getInstance();

    try {
      // 1. Execute Guards
      for (const GuardClass of this.guards) {
        const guard: Guard = container.has(GuardClass)
          ? container.resolve<Guard>(GuardClass)
          : new GuardClass();

        const canActivate = await guard.canActivate(context);
        if (!canActivate) {
          throw new Error('Access denied by guard');
        }
      }

      // 2. Build Middleware Chain
      const middlewareChain = async (chainInput: TInput): Promise<TOutput> => {
        let index = 0;
        const middlewareInstances = this.middlewares.map(M =>
          container.has(M) ? container.resolve<MiddlewareInterface>(M) : new M()
        );

        const next = async (): Promise<TOutput> => {
          if (index >= middlewareInstances.length) {
            // 3. Build Interceptor Chain
            return await this.executeWithInterceptors(chainInput, context);
          }

          const middleware = middlewareInstances[index++];
          return await middleware.use(context, next) as TOutput;
        };

        return await next();
      };

      return await middlewareChain(input);

    } catch (error: unknown) {
      // Execute Exception Filters
      if (this.filters.length > 0) {
        for (const FilterClass of this.filters) {
          const filter: ExceptionFilterInterface = container.has(FilterClass)
            ? container.resolve<ExceptionFilterInterface>(FilterClass)
            : new FilterClass();

          return await filter.catch(error, context) as TOutput;
        }
      }

      // Re-throw if no filters handled it
      throw error;
    }
  }

  /**
   * Execute with interceptor chain
   */
  private async executeWithInterceptors(input: TInput, context: ExecutionContext): Promise<TOutput> {
    const container = DIContainer.getInstance();
    let index = 0;
    const interceptorInstances = this.interceptors.map(I =>
      container.has(I) ? container.resolve<InterceptorInterface>(I) : new I()
    );

    const next = async (): Promise<TOutput> => {
      if (index >= interceptorInstances.length) {
        // 4. Execute Pipes, then Handler
        return await this.executeWithPipes(input, context);
      }

      const interceptor = interceptorInstances[index++];
      return await interceptor.intercept(context, next) as TOutput;
    };

    return await next();
  }

  /**
   * Execute pipes and then the handler
   */
  private async executeWithPipes(input: TInput, context: ExecutionContext): Promise<TOutput> {
    const container = DIContainer.getInstance();
    let transformedInput: unknown = input;

    // Execute Pipes
    for (const PipeClass of this.pipes) {
      const pipe: PipeInterface = container.has(PipeClass)
        ? container.resolve<PipeInterface>(PipeClass)
        : new PipeClass();

      transformedInput = await pipe.transform(transformedInput, {
        type: 'body',
        metatype: undefined,
        data: undefined,
      });
    }

    // Finally, execute the actual handler
    return await this.handler(transformedInput as TInput, context);
  }

  /**
   * Attach a UI component to this tool
   */
  setComponent(component: Component): void {
    this.component = component;
  }

  /**
   * Check if tool has a component
   */
  hasComponent(): boolean {
    return this.component !== undefined;
  }

  /**
   * Get the attached component
   */
  getComponent(): Component | undefined {
    return this.component;
  }

  /**
   * Check if schema is a Zod schema
   */
  private isZodSchema(schema: ToolInputSchema): schema is z.ZodSchema {
    return schema && typeof schema === 'object' && '_def' in schema;
  }

  /**
   * Convert schema to JSON Schema format
   */
  private async convertToJsonSchema(schema: ToolInputSchema): Promise<JsonSchema> {
    if (this.isZodSchema(schema)) {
      try {
        const zodToJsonSchemaModule = await import('zod-to-json-schema');
        const zodToJsonSchema = zodToJsonSchemaModule.zodToJsonSchema || zodToJsonSchemaModule.default;
        return zodToJsonSchema(schema, {
          $refStrategy: 'none',
          target: 'jsonSchema7',
        }) as JsonSchema;
      } catch (_error) {
        // Silently fall back to permissive schema — console output is
        // disabled in MCP servers as it breaks the JSON-RPC stdio protocol.
        return { type: 'object', properties: {}, additionalProperties: true };
      }
    }
    return schema as JsonSchema;
  }

  /**
   * Convert to MCP tool format
   */
  async toMcpTool(): Promise<McpTool> {
    // Convert input schema
    let jsonSchema = await this.convertToJsonSchema(this.inputSchema);

    // Ensure type is set to "object" if not present
    if (!jsonSchema.type) {
      jsonSchema = { ...jsonSchema, type: 'object' };
    }

    // Convert output schema if present and ensure type: "object"
    let outputJsonSchema: { type: 'object';[key: string]: unknown } | undefined;
    if (this.outputSchema) {
      const converted = await this.convertToJsonSchema(this.outputSchema);
      const { type: outputType, ...outputRest } = converted;
      outputJsonSchema = { ...outputRest, type: 'object' as const };
    }

    // MCP tool with extended metadata - use intersection type for proper typing
    type McpToolWithMeta = McpTool & {
      title?: string;
      annotations?: ToolAnnotations;
      _meta?: Record<string, JsonValue>;
      examples?: ToolExamples;
      widget?: { route: string };
      outputTemplate?: string;
      execution?: { taskSupport?: string };
    };

    // Construct the final schema, ensuring type is "object"
    const { type: schemaType, ...restSchema } = jsonSchema;
    const finalSchema: McpTool['inputSchema'] = {
      ...restSchema,
      type: 'object' as const,
    };

    const mcpTool: McpToolWithMeta = {
      name: this.name,
      description: this.description,
      inputSchema: finalSchema,
    };

    // Add optional fields per MCP spec
    if (this.title) {
      mcpTool.title = this.title;
    }

    if (outputJsonSchema) {
      mcpTool.outputSchema = outputJsonSchema;
    }

    if (this.annotations) {
      mcpTool.annotations = this.annotations;
    }

    // Add task support level (MCP Tasks spec)
    if (this.taskSupport && this.taskSupport !== 'forbidden') {
      mcpTool.execution = { taskSupport: this.taskSupport };
    }

    // Initialize _meta if needed
    mcpTool._meta = mcpTool._meta || {};

    // Initial tool flag
    if (this.isInitial) {
      mcpTool._meta['tool/initial'] = true;
    }

    // Include examples if available
    if (this.examples) {
      mcpTool.examples = this.examples;
      // CRITICAL: Also store examples in _meta to ensure they're preserved
      // through MCP serialization/deserialization. The studio checks _meta
      // fields, and custom top-level fields may be stripped by the MCP SDK.
      mcpTool._meta['tool/examples'] = this.examples as JsonValue;
    }

    // Include widget if available (for backward compatibility)
    if (this.widget) {
      mcpTool.widget = this.widget;
    }

    // Include outputTemplate if available (for backward compatibility)
    if (this.outputTemplate) {
      mcpTool.outputTemplate = this.outputTemplate;
    }

    // CRITICAL: Store widget info in _meta to ensure it's preserved
    // through MCP serialization/deserialization. The studio checks _meta
    // fields, and custom top-level fields may be stripped by the MCP SDK.
    //
    // We support multiple formats for compatibility:
    // - MCP Apps spec: _meta.ui = { resourceUri: '...' }
    // - OpenAI Apps SDK: _meta['openai/outputTemplate'] = '...'
    // - Generic: _meta['ui/template'] = '...'

    // 1. Check if we have an attached component (preferred)
    if (this.component) {
      const resourceUri = this.component.getResourceUri();
      const componentMeta = this.component.getResourceMetadata() as Record<string, unknown> | undefined;

      // Always include generic format for internal NitroStack use
      mcpTool._meta['ui/template'] = resourceUri;

      if (isOpenAiMode()) {
        // OpenAI mode: openai/* keys
        mcpTool._meta['openai/outputTemplate'] = resourceUri;
        // Also set top-level outputTemplate for backward compatibility with some legacy hosts
        mcpTool.outputTemplate = resourceUri;
        
        if (componentMeta) {
          const widgetCsp = componentMeta['openai/widgetCSP'];
          if (widgetCsp !== undefined) {
            mcpTool._meta['openai/widgetCSP'] = widgetCsp as JsonValue;
          }
          const widgetDesc = componentMeta['openai/widgetDescription'];
          if (widgetDesc !== undefined) {
            mcpTool._meta['openai/widgetDescription'] = widgetDesc as JsonValue;
          }
          const widgetBorder = componentMeta['openai/widgetPrefersBorder'];
          if (widgetBorder !== undefined) {
            mcpTool._meta['openai/widgetPrefersBorder'] = widgetBorder as JsonValue;
          }
          const widgetDomain = componentMeta['openai/widgetDomain'];
          if (widgetDomain !== undefined) {
            mcpTool._meta['openai/widgetDomain'] = widgetDomain as JsonValue;
          }
        }
      } 
      
      if (isMcpAppMode()) {
        // MCP Apps spec: _meta.ui
        const uiMeta = mergeToolUiMeta(resourceUri, componentMeta) as Record<string, JsonValue>;

        // Add visibility (MCP Apps mode)
        if (this.visibility) {
          uiMeta['visibility'] = this.visibility as unknown as JsonValue;
        }

        mcpTool._meta['ui'] = uiMeta as JsonValue;
      }
    }
    // 2. Fallback to legacy widget/outputTemplate options
    else if (this.widget || this.outputTemplate) {
      // Prioritize widget.route over outputTemplate
      const widgetRoute = this.widget?.route || this.outputTemplate;
      if (widgetRoute) {
        mcpTool._meta['ui/template'] = widgetRoute;
        
        if (isMcpAppMode()) {
          const uiMeta: Record<string, JsonValue> = { resourceUri: widgetRoute };
          if (this.visibility) {
            uiMeta['visibility'] = this.visibility as unknown as JsonValue;
          }
          mcpTool._meta['ui'] = uiMeta as JsonValue;
        }

        if (isOpenAiMode()) {
          mcpTool._meta['openai/outputTemplate'] = widgetRoute;
        }
      }
    }

    // Add invocation status messages (OpenAI Apps SDK — only if OpenAI mode is active)
    if (this.invocation && isOpenAiMode()) {
      if (this.invocation.invoking) {
        mcpTool._meta['openai/toolInvocation/invoking'] = this.invocation.invoking;
      }
      if (this.invocation.invoked) {
        mcpTool._meta['openai/toolInvocation/invoked'] = this.invocation.invoked;
      }
    }

    return mcpTool;
  }
}
