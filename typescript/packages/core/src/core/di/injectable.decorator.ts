import 'reflect-metadata';
import { DIContainer, InjectionToken } from './container.js';
import type { ClassConstructor } from '../types.js';

const INJECTABLE_KEY = 'nitrostack:injectable';
const INJECT_KEY = 'nitrostack:inject';
const DEPS_KEY = 'nitrostack:deps';

/**
 * Options for @Injectable decorator
 */
export interface InjectableOptions {
  /**
   * Explicit dependencies for ESM compatibility.
   * 
   * In ESM environments, TypeScript's emitDecoratorMetadata may not work
   * reliably due to module loading order. Use this to explicitly declare
   * constructor dependencies.
   * 
   * @example
   * ```typescript
   * @Injectable({ deps: [DatabaseService, LoggerService] })
   * export class UserService {
   *   constructor(private db: DatabaseService, private logger: LoggerService) {}
   * }
   * ```
   */
  deps?: InjectionToken[];
}

/**
 * Marks a class as injectable (can be used with DI)
 * 
 * @example Basic usage (relies on TypeScript's emitDecoratorMetadata):
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private db: DatabaseService) {}
 * }
 * ```
 * 
 * @example With explicit deps (recommended for ESM compatibility):
 * ```typescript
 * @Injectable({ deps: [DatabaseService] })
 * export class UserService {
 *   constructor(private db: DatabaseService) {}
 * }
 * ```
 */
export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
    
    // Store explicit deps if provided (for ESM compatibility)
    if (options?.deps && options.deps.length > 0) {
      Reflect.defineMetadata(DEPS_KEY, options.deps, target);
    }
    
    // Auto-register in DI container
    const container = DIContainer.getInstance();
    if (!container.has(target as ClassConstructor)) {
      container.register(target as ClassConstructor);
    }
  };
}

/**
 * Inject a specific token (optional - for custom injection)
 * 
 * @example
 * ```typescript
 * constructor(@Inject('DATABASE_CONFIG') private config: DatabaseConfig) {}
 * ```
 */
export function Inject(token: InjectionToken): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingTokens: InjectionToken[] = Reflect.getMetadata(INJECT_KEY, target) || [];
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_KEY, existingTokens, target);
  };
}

/**
 * Check if a class is injectable
 */
export function isInjectable(target: ClassConstructor): boolean {
  return Reflect.getMetadata(INJECTABLE_KEY, target) === true;
}

/**
 * Get inject tokens for constructor parameters
 */
export function getInjectTokens(target: ClassConstructor): InjectionToken[] {
  return Reflect.getMetadata(INJECT_KEY, target) || [];
}

