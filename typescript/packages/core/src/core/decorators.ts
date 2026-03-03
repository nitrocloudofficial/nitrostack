import 'reflect-metadata';
import { z } from 'zod';
import type { JsonValue, ClassConstructor, ResourceAnnotations, ToolAnnotations } from './types.js';
import type { TaskSupportLevel } from './task.js';

/**
 * Metadata keys for decorators
 */
export const TOOL_METADATA = Symbol('tool:metadata');
export const WIDGET_METADATA = Symbol('widget:metadata');
export const RESOURCE_METADATA = Symbol('resource:metadata');
export const PROMPT_METADATA = Symbol('prompt:metadata');
export const GUARDS_METADATA = Symbol('guards:metadata');

/**
 * Example data for tools/resources
 */
export interface ExampleData {
  request?: JsonValue;
  response?: JsonValue;
}

/**
 * Tool invocation status messages (OpenAI Apps SDK)
 * Displayed to users during tool execution
 */
export interface ToolInvocationMessages {
  /** Message shown while tool is executing (e.g., "Adding todo...") */
  invoking?: string;
  /** Message shown after tool completes (e.g., "Added todo") */
  invoked?: string;
}

/**
 * Tool decorator options
 */
export interface ToolOptions {
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description: string;
  inputSchema: z.ZodSchema;
  /** Optional JSON Schema for validating tool output */
  outputSchema?: z.ZodSchema;
  /** Optional annotations describing tool behavior */
  annotations?: ToolAnnotations;
  /** Optional invocation status messages for UI feedback (OpenAI Apps SDK) */
  invocation?: ToolInvocationMessages;
  examples?: ExampleData;
  metadata?: {
    category?: string;
    tags?: string[];
    rateLimit?: {
      maxCalls: number;
      windowMs: number;
    };
  };
  /**
   * Task support level for this tool.
   * - 'forbidden' (default): Tool cannot be invoked as a task
   * - 'optional': Tool can be invoked normally or as a task
   * - 'required': Tool MUST be invoked as a task
   */
  taskSupport?: TaskSupportLevel;
}

/**
 * Resource decorator options
 */
export interface ResourceOptions {
  uri: string;
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description: string;
  mimeType?: string;
  /** Optional size in bytes */
  size?: number;
  /** Optional annotations for client hints */
  annotations?: ResourceAnnotations;
  examples?: {
    response?: JsonValue;
  };
  metadata?: {
    cacheable?: boolean;
    cacheMaxAge?: number;
  };
}

/**
 * Prompt decorator options
 */
export interface PromptOptions {
  name: string;
  /** Optional human-readable title for display */
  title?: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

/**
 * Method decorator target type
 */
type MethodDecoratorTarget = object;

/**
 * Tool metadata stored on class
 */
interface ToolMetadataEntry {
  methodName: string;
  options: ToolOptions;
}

/**
 * Tool decorator - Marks a method as an MCP tool
 * 
 * @example
 * ```typescript
 * @Tool({
 *   name: 'login',
 *   description: 'Login with email and password',
 *   inputSchema: z.object({
 *     email: z.string().email(),
 *     password: z.string(),
 *   }),
 * })
 * async login(input: LoginInput, context: ExecutionContext) {
 *   // Implementation
 * }
 * ```
 */
export function Tool(options: ToolOptions): MethodDecorator {
  return function (target: MethodDecoratorTarget, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    // Get existing tools or create new array
    const existingTools: ToolMetadataEntry[] = Reflect.getMetadata(TOOL_METADATA, target.constructor) || [];

    // Add this tool
    existingTools.push({
      methodName: String(propertyKey),
      options,
    });

    // Store metadata on the class constructor
    Reflect.defineMetadata(TOOL_METADATA, existingTools, target.constructor);

    return descriptor;
  };
}

/**
 * Widget decorator - Links a tool to a Next.js widget route
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'login', ... })
 * @Widget('login-result')
 * async login(input: LoginInput, context: ExecutionContext) {
 *   // Implementation
 * }
 * ```
 */
export function Widget(routePath: string): MethodDecorator {
  return function (target: MethodDecoratorTarget, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    // Store widget metadata
    Reflect.defineMetadata(WIDGET_METADATA, routePath, target, String(propertyKey));
    return descriptor;
  };
}

/**
 * Resource metadata stored on class
 */
interface ResourceMetadataEntry {
  methodName: string;
  options: ResourceOptions;
}

/**
 * Resource decorator - Marks a method as an MCP resource
 * 
 * @example
 * ```typescript
 * @Resource({
 *   uri: 'db://users/schema',
 *   name: 'User Schema',
 *   description: 'Database schema for users',
 * })
 * async getUserSchema(context: ExecutionContext) {
 *   // Return schema
 * }
 * ```
 */
export function Resource(options: ResourceOptions): MethodDecorator {
  return function (target: MethodDecoratorTarget, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const existingResources: ResourceMetadataEntry[] = Reflect.getMetadata(RESOURCE_METADATA, target.constructor) || [];

    existingResources.push({
      methodName: String(propertyKey),
      options,
    });

    Reflect.defineMetadata(RESOURCE_METADATA, existingResources, target.constructor);

    return descriptor;
  };
}

/**
 * Prompt metadata stored on class
 */
interface PromptMetadataEntry {
  methodName: string;
  options: PromptOptions;
}

/**
 * Prompt decorator - Marks a method as an MCP prompt
 * 
 * @example
 * ```typescript
 * @Prompt({
 *   name: 'authentication-help',
 *   description: 'Help with authentication',
 * })
 * async authHelp(args: PromptArgs, context: ExecutionContext) {
 *   // Return prompt messages
 * }
 * ```
 */
export function Prompt(options: PromptOptions): MethodDecorator {
  return function (target: MethodDecoratorTarget, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const existingPrompts: PromptMetadataEntry[] = Reflect.getMetadata(PROMPT_METADATA, target.constructor) || [];

    existingPrompts.push({
      methodName: String(propertyKey),
      options,
    });

    Reflect.defineMetadata(PROMPT_METADATA, existingPrompts, target.constructor);

    return descriptor;
  };
}

/**
 * Extract tool definitions from a decorated class
 */
export function extractTools(target: ClassConstructor): ToolMetadataEntry[] {
  return Reflect.getMetadata(TOOL_METADATA, target) || [];
}

/**
 * Extract resource definitions from a decorated class
 */
export function extractResources(target: ClassConstructor): ResourceMetadataEntry[] {
  return Reflect.getMetadata(RESOURCE_METADATA, target) || [];
}

/**
 * Extract prompt definitions from a decorated class
 */
export function extractPrompts(target: ClassConstructor): PromptMetadataEntry[] {
  return Reflect.getMetadata(PROMPT_METADATA, target) || [];
}

/**
 * Get widget metadata for a specific method
 */
export function getWidgetMetadata(target: object, methodName: string): string | undefined {
  return Reflect.getMetadata(WIDGET_METADATA, target, methodName);
}

/**
 * Get guards metadata for a specific method
 */
export function getGuardsMetadata(target: object, methodName: string): ClassConstructor[] {
  return Reflect.getMetadata(GUARDS_METADATA, target, methodName) || [];
}


/**
 * Initial tool decorator metadata key
 */
export const INITIAL_TOOL_METADATA = Symbol('initial_tool:metadata');

/**
 * InitialTool decorator - Marks a tool to be automatically called when the client starts
 * 
 * @example
 * ```typescript
 * @Tool({ ... })
 * @InitialTool()
 * async init(input: InitInput, context: ExecutionContext) {
 *   // Implementation
 * }
 * ```
 */
export function InitialTool(): MethodDecorator {
  return function (target: MethodDecoratorTarget, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    Reflect.defineMetadata(INITIAL_TOOL_METADATA, true, target, String(propertyKey));
    return descriptor;
  };
}

/**
 * Get initial tool metadata for a specific method
 */
export function getInitialToolMetadata(target: object, methodName: string): boolean {
  return Reflect.getMetadata(INITIAL_TOOL_METADATA, target, methodName) === true;
}
