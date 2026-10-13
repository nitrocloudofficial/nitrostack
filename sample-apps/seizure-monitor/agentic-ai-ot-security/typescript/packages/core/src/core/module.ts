import 'reflect-metadata';
import type { ClassConstructor } from './types.js';

/**
 * Module metadata key
 */
export const MODULE_METADATA = Symbol('module:metadata');

/**
 * Provider definition for dependency injection
 */
export interface Provider {
  provide: string | symbol | ClassConstructor;
  useValue?: unknown;
  useClass?: ClassConstructor;
  useFactory?: (...args: unknown[]) => unknown;
}

/**
 * Dynamic module definition (for configurable modules)
 */
export interface DynamicModule {
  module?: ClassConstructor;
  providers?: (ClassConstructor | Provider)[];
  exports?: (ClassConstructor | string | symbol)[];
  controllers?: ClassConstructor[];
  imports?: ModuleImport[];
}

/**
 * Type for module imports - can be a class or a dynamic module configuration
 */
export type ModuleImport = ClassConstructor | DynamicModule;

/**
 * Module metadata interface
 */
export interface ModuleMetadata {
  /** Module name */
  name: string;
  
  /** Module description */
  description?: string;
  
  /** Controllers (classes with @Tool, @Resource, @Prompt decorators) */
  controllers?: ClassConstructor[];
  
  /** Services (dependency injection) */
  providers?: (ClassConstructor | Provider)[];
  
  /** Other modules to import */
  imports?: ModuleImport[];
  
  /** Items to export to other modules */
  exports?: (ClassConstructor | string | symbol)[];
}

/**
 * Module class (internal)
 */
class ModuleClass {
  constructor(public metadata: ModuleMetadata) {}

  /**
   * Get all controllers from this module
   */
  getControllers(): ClassConstructor[] {
    return this.metadata.controllers || [];
  }

  /**
   * Get module name
   */
  getName(): string {
    return this.metadata.name;
  }

  /**
   * Get module description
   */
  getDescription(): string | undefined {
    return this.metadata.description;
  }
}

/**
 * Module decorator - Defines a module with controllers, providers, imports
 * 
 * @example
 * ```typescript
 * @Module({
 *   name: 'auth',
 *   description: 'Authentication module',
 *   controllers: [AuthController],
 * })
 * export class AuthModule {}
 * ```
 */
export function ModuleDecorator(metadata: ModuleMetadata) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => object>(constructor: T): T {
    // Store metadata on the class
    Reflect.defineMetadata(MODULE_METADATA, metadata, constructor);
    
    // Return the constructor with static method
    const enhanced = constructor as T & {
      getMetadata(): ModuleMetadata;
    };
    
    // Add static method
    Object.defineProperty(enhanced, 'getMetadata', {
      value: () => Reflect.getMetadata(MODULE_METADATA, constructor) || metadata,
      writable: false,
      enumerable: false,
      configurable: false,
    });
    
    return enhanced;
  };
}

// Export as "Module" for decorator usage
export { ModuleDecorator as Module };

/**
 * Create a module instance from a class
 */
export function createModule(moduleClass: ClassConstructor): ModuleClass {
  const metadata = Reflect.getMetadata(MODULE_METADATA, moduleClass) as ModuleMetadata | undefined;
  if (!metadata) {
    throw new Error(`Class ${moduleClass.name} is not decorated with @Module`);
  }
  return new ModuleClass(metadata);
}

/**
 * Check if a class is a module
 */
export function isModule(target: ClassConstructor): boolean {
  return Reflect.hasMetadata(MODULE_METADATA, target);
}

/**
 * Get module metadata from a class
 */
export function getModuleMetadata(target: ClassConstructor): ModuleMetadata | undefined {
  return Reflect.getMetadata(MODULE_METADATA, target) as ModuleMetadata | undefined;
}

