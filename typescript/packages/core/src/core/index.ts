/**
 * NitroStack Core Exports
 */

// Import reflect-metadata for decorator support
import 'reflect-metadata';

// Server
export { createServer, NitroStackServer } from './server.js';

// Transports
export { HttpServerTransport } from './transports/http-server.js';
export type { HttpServerTransportOptions } from './transports/http-server.js';

// Tool
export { Tool } from './tool.js';

// Resource
export { createResource, Resource, ResourceTemplate, createResourceTemplate } from './resource.js';

// Prompt
export { createPrompt, Prompt } from './prompt.js';

// Component (UI/UX)
export { createComponent, Component } from './component.js';

// Logger
export { createLogger, defaultLogger } from './logger.js';

// Errors
export * from './errors.js';

// ========== MCP Tasks ==========
export {
  TaskManager,
  TaskContext,
  TaskNotFoundError,
  TaskAlreadyTerminalError,
  InvalidTaskTransitionError,
  TaskCancelledError,
  TaskAugmentationRequiredError,
  TaskExpiredError,
  isTerminalStatus,
  TERMINAL_STATUSES,
} from './task.js';

export type {
  TaskStatus,
  TaskData,
  TaskParams,
  CreateTaskResult,
  TaskSupportLevel,
} from './task.js';

// Types
export type {
  McpServerConfig,
  ToolDefinition,
  ToolAnnotations,
  ToolResultContent,
  ResourceLink,
  EmbeddedResource,
  ResourceDefinition,
  ResourceTemplateDefinition,
  ResourceAnnotations,
  PromptDefinition,
  ExecutionContext,
  Logger,
  AuthContext,
  JsonValue,
  JsonValueOrUndefined,
  JsonObject,
  JsonArray,
  JsonPrimitive,
  Constructor,
  ClassConstructor,
} from './types.js';

// ========== V3 Decorators ==========
export {
  Tool as ToolDecorator,
  Widget,
  Resource as ResourceDecorator,
  Prompt as PromptDecorator,
  extractTools,
  extractResources,
  extractPrompts,
  getWidgetMetadata,
  getGuardsMetadata,
  InitialTool,
} from './decorators.js';

export type {
  ToolOptions,
  ToolInvocationMessages,
  ResourceOptions,
  PromptOptions,
} from './decorators.js';

// ========== V3 Modules ==========
export {
  Module,
  createModule,
  isModule,
  getModuleMetadata,
} from './module.js';

export type {
  ModuleMetadata,
  ModuleImport,
  DynamicModule,
  Provider,
} from './module.js';

// ========== V3 Guards ==========
export type { Guard, GuardConstructor } from './guards/guard.interface.js';
export { UseGuards, getGuardsMetadata as getGuardsMetadataFromDecorator } from './guards/use-guards.decorator.js';
export type { JWTPayload } from './guards/jwt.guard.js';
export type { ApiKeyMetadata } from './guards/apikey.guard.js';
export type { OAuthTokenPayload } from './guards/oauth.guard.js';

// ========== V3 JWT Module ==========
export { JWTModule } from './jwt-module.js';
export type { JWTModuleConfig } from './jwt-module.js';

// ========== V3 API Key Module ==========
export { ApiKeyModule } from './apikey-module.js';
export type { ApiKeyModuleConfig } from './apikey-module.js';

// ========== V3 OAuth Module ==========
export { OAuthModule } from './oauth-module.js';
export type { OAuthModuleConfig, OAuthDiscoveryInfo } from './oauth-module.js';

// ========== V3 Builders ==========
export {
  buildTool,
  buildTools,
  buildResource,
  buildResources,
  buildPrompt,
  buildPrompts,
  buildController,
} from './builders.js';

// ========== V3 Middleware ==========
export type { MiddlewareInterface, MiddlewareConstructor } from './middleware/middleware.interface.js';
export { Middleware, UseMiddleware, getMiddlewareMetadata, isMiddleware } from './middleware/middleware.decorator.js';

// ========== V3 Interceptors ==========
export type { InterceptorInterface, InterceptorConstructor } from './interceptors/interceptor.interface.js';
export { Interceptor, UseInterceptors, getInterceptorMetadata, isInterceptor } from './interceptors/interceptor.decorator.js';

// ========== V3 Pipes ==========
export type { PipeInterface, PipeConstructor, ArgumentMetadata } from './pipes/pipe.interface.js';
export { Pipe, UsePipes, Body, Validated, getPipeMetadata, getParamPipesMetadata, isPipe } from './pipes/pipe.decorator.js';

// ========== V3 Exception Filters ==========
export type { ExceptionFilterInterface, ExceptionFilterConstructor } from './filters/exception-filter.interface.js';
export { ExceptionFilter, UseFilters, getExceptionFilterMetadata, isExceptionFilter } from './filters/exception-filter.decorator.js';

// ========== V3 Dependency Injection ==========
export { DIContainer } from './di/container.js';
export { Injectable, Inject, isInjectable, getInjectTokens } from './di/injectable.decorator.js';
export type { InjectableOptions } from './di/injectable.decorator.js';

// ========== V3 Utility Decorators ==========
export { Cache, clearCache, getCacheMetadata } from './decorators/cache.decorator.js';
export type { CacheOptions, CacheStorage } from './decorators/cache.decorator.js';
export { RateLimit, resetRateLimit, getRateLimitMetadata } from './decorators/rate-limit.decorator.js';
export type { RateLimitOptions, RateLimitStorage } from './decorators/rate-limit.decorator.js';
export {
  HealthCheck,
  registerHealthCheck,
  getAllHealthChecks,
  getHealthCheck,
  getOverallHealth,
  isHealthCheck,
  getHealthCheckMetadata
} from './decorators/health-check.decorator.js';
export type { HealthCheckOptions, HealthCheckResult, HealthCheckInterface } from './decorators/health-check.decorator.js';

// ========== V3 Event System ==========
export { EventEmitter } from './events/event-emitter.js';
export { OnEvent, getEventHandlers, registerEventHandlers, emitEvent } from './events/event.decorator.js';

// ========== V3 Configuration Module ==========
export { ConfigModule, ConfigService } from './config-module.js';
export type { ConfigModuleOptions } from './config-module.js';

// ========== V3 Application Bootstrap ==========
export { McpApp, McpApplicationFactory, getMcpAppMetadata } from './app-decorator.js';
export type { McpAppOptions } from './app-decorator.js';

// ========== MCP Apps / OpenAI Apps SDK Constants ==========
/**
 * MIME type for MCP Apps widgets
 * Compatible with both MCP Apps spec and OpenAI Apps SDK
 */
export const WIDGET_MIME_TYPE = 'text/html';

/**
 * MCP Apps specific MIME type (per ext-apps spec)
 * Use this for strict MCP Apps compliance
 */
export const MCP_APPS_MIME_TYPE = 'text/html';

/**
 * OpenAI Apps SDK specific MIME type
 * Use this for strict OpenAI ChatGPT compliance
 */
export const OPENAI_SKYBRIDGE_MIME_TYPE = 'text/html+skybridge';

// Zod re-export for convenience
export { z } from 'zod';

// Auth module
export * from '../auth/index.js';

// UI Next adapter (optional)
export { createComponentFromNext, createComponentFromNextRoute } from '../ui-next/index.js';
