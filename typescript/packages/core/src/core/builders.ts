import { Tool } from './tool.js';
import { Resource, createResource } from './resource.js';
import { Prompt, createPrompt } from './prompt.js';
import { createComponentFromNextRoute } from '../ui-next/index.js';
import { ExecutionContext, PromptArgumentValue, ResourceContent, ResourceDefinition, PromptDefinition, PromptMessage, ClassConstructor } from './types.js';
import {
  extractTools,
  extractResources,
  extractPrompts,
  getWidgetMetadata,
  getInitialToolMetadata,
  ToolOptions,
  ResourceOptions,
  PromptOptions,
  type WidgetRouteMetadata,
} from './decorators.js';
import { getGuardsMetadata } from './guards/use-guards.decorator.js';
import { getMiddlewareMetadata } from './middleware/middleware.decorator.js';
import { getInterceptorMetadata } from './interceptors/interceptor.decorator.js';
import { getPipeMetadata } from './pipes/pipe.decorator.js';
import { getExceptionFilterMetadata } from './filters/exception-filter.decorator.js';
import { DIContainer } from './di/container.js';
import { isInjectable } from './di/injectable.decorator.js';

/**
 * Controller instance type
 */
interface ControllerInstance {
  [key: string]: unknown;
}

/**
 * Controller class type (using ClassConstructor for compatibility)
 */
type ControllerClass = ClassConstructor<ControllerInstance>;

/**
 * Build a Tool instance from a decorated method
 */
export function buildTool(
  controllerInstance: ControllerInstance,
  methodName: string,
  options: ToolOptions,
  widgetMeta?: WidgetRouteMetadata,
  isInitial?: boolean,
): Tool {
  const widgetRoute = widgetMeta?.route;
  const prototype = Object.getPrototypeOf(controllerInstance) as object;

  // Get the original method
  const method = controllerInstance[methodName] as (input: unknown, context: ExecutionContext) => Promise<unknown>;
  const originalMethod = method.bind(controllerInstance);

  // Extract all decorator metadata
  const guards = getGuardsMetadata(prototype, methodName);
  const middlewares = getMiddlewareMetadata(prototype, methodName);
  const interceptors = getInterceptorMetadata(prototype, methodName);
  const pipes = getPipeMetadata(prototype, methodName);
  const filters = getExceptionFilterMetadata(prototype, methodName);

  // Create tool with all metadata
  const tool = new Tool({
    name: options.name,
    title: options.title,
    description: options.description,
    inputSchema: options.inputSchema,
    outputSchema: options.outputSchema,
    annotations: options.annotations,
    invocation: options.invocation,
    handler: originalMethod,
    guards,
    middlewares,
    interceptors,
    pipes,
    filters,
    examples: options.examples,
    widget: widgetRoute ? { route: widgetRoute } : undefined,
    outputTemplate: widgetRoute,
    isInitial,
    taskSupport: options.taskSupport,
  });

  // Create and attach component if widget route is specified
  if (widgetRoute) {
    const component = createComponentFromNextRoute(widgetRoute, {
      csp: widgetMeta?.csp,
      prefersBorder: widgetMeta?.prefersBorder,
      subdomain: widgetMeta?.domain,
    });
    tool.setComponent(component);
  }

  return tool;
}

/**
 * Build all tools from a controller
 */
export function buildTools(controllerInstance: ControllerInstance): Tool[] {
  const constructor = Object.getPrototypeOf(controllerInstance).constructor as ControllerClass;
  const toolMetadata = extractTools(constructor);

  return toolMetadata.map(({ methodName, options }) => {
    const prototype = Object.getPrototypeOf(controllerInstance) as object;
    // Check if this method has a widget
    const widgetMeta = getWidgetMetadata(prototype, methodName);

    // Check for initial tool decorator
    const isInitial = getInitialToolMetadata(prototype, methodName);

    return buildTool(controllerInstance, methodName, options, widgetMeta, isInitial);
  });
}

/**
 * Build a Resource instance from a decorated method
 */
export function buildResource(
  controllerInstance: ControllerInstance,
  methodName: string,
  options: ResourceOptions
): Resource {
  const method = controllerInstance[methodName] as (uri: string, context: ExecutionContext) => Promise<ResourceContent>;
  const originalMethod = method.bind(controllerInstance);

  const resourceDefinition: ResourceDefinition = {
    uri: options.uri,
    name: options.name,
    title: options.title,
    description: options.description,
    mimeType: options.mimeType,
    size: options.size,
    annotations: options.annotations,
    handler: async (uri: string, context: ExecutionContext): Promise<ResourceContent> => {
      const result = await originalMethod(uri, context);

      // If result is already in ResourceContent format, return it
      if (result && typeof result === 'object' && ('type' in result) && ('data' in result)) {
        return result as ResourceContent;
      }

      // Otherwise, infer type (default to JSON for objects/arrays, text for strings)
      if (typeof result === 'string') {
        return { type: 'text', data: result };
      } else if (Buffer.isBuffer(result)) {
        return { type: 'binary', data: result };
      } else {
        return { type: 'json', data: result as any };
      }
    },
    metadata: options.metadata,
  };

  return createResource(resourceDefinition);
}

/**
 * Build all resources from a controller
 */
export function buildResources(controllerInstance: ControllerInstance): Resource[] {
  const constructor = Object.getPrototypeOf(controllerInstance).constructor as ControllerClass;
  const resourceMetadata = extractResources(constructor);

  return resourceMetadata.map(({ methodName, options }) => {
    return buildResource(controllerInstance, methodName, options);
  });
}

/**
 * Build a Prompt instance from a decorated method
 */
export function buildPrompt(
  controllerInstance: ControllerInstance,
  methodName: string,
  options: PromptOptions
): Prompt {
  const method = controllerInstance[methodName] as (args: Record<string, PromptArgumentValue>, context: ExecutionContext) => Promise<PromptMessage[]>;
  const originalMethod = method.bind(controllerInstance);

  const promptDefinition: PromptDefinition = {
    name: options.name,
    title: options.title,
    description: options.description,
    arguments: options.arguments,
    handler: async (args: Record<string, PromptArgumentValue>, context: ExecutionContext): Promise<PromptMessage[]> => {
      return await originalMethod(args, context);
    },
  };

  return createPrompt(promptDefinition);
}

/**
 * Build all prompts from a controller
 */
export function buildPrompts(controllerInstance: ControllerInstance): Prompt[] {
  const constructor = Object.getPrototypeOf(controllerInstance).constructor as ControllerClass;
  const promptMetadata = extractPrompts(constructor);

  return promptMetadata.map(({ methodName, options }) => {
    return buildPrompt(controllerInstance, methodName, options);
  });
}

/**
 * Build all tools, resources, and prompts from a controller
 * Supports dependency injection
 */
export function buildController(controller: ControllerClass): {
  tools: Tool[];
  resources: Resource[];
  prompts: Prompt[];
} {
  const container = DIContainer.getInstance();

  // Create controller instance (with DI if available)
  let instance: ControllerInstance;
  if (isInjectable(controller) && container.has(controller)) {
    instance = container.resolve<ControllerInstance>(controller);
  } else {
    instance = new controller();
  }

  return {
    tools: buildTools(instance),
    resources: buildResources(instance),
    prompts: buildPrompts(instance),
  };
}

