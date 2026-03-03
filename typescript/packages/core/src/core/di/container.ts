import 'reflect-metadata';

/**
 * Token type for DI registration
 * Can be a class constructor, string, or symbol
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InjectionToken<T = unknown> = 
  | (new (...args: any[]) => T) 
  | string 
  | symbol;

/**
 * Provider type - a class constructor (using any[] for compatibility)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Provider<T = unknown> = new (...args: any[]) => T;

/**
 * Dependency Injection Container
 * 
 * Simple DI container for managing service instances and dependencies.
 * Supports constructor injection and singleton pattern.
 */
export class DIContainer {
  private static instance: DIContainer;
  private providers: Map<InjectionToken, Provider> = new Map();
  private instances: Map<InjectionToken, unknown> = new Map();

  private constructor() {}

  /**
   * Get the singleton container instance
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a provider (class)
   * @param token - The token to register (usually the class itself)
   * @param provider - Optional provider class (defaults to token if it's a class)
   */
  register<T>(token: InjectionToken<T>, provider?: Provider<T>): void {
    this.providers.set(token, (provider || token) as Provider);
  }

  /**
   * Register a value directly
   * @param token - The token to register
   * @param value - The value to associate with the token
   */
  registerValue<T>(token: InjectionToken<T>, value: T): void {
    this.instances.set(token, value);
  }

  /**
   * Resolve a dependency (get or create instance)
   * @param token - The token to resolve
   * @returns The resolved instance
   */
  resolve<T>(token: InjectionToken<T>): T {
    // Check if already instantiated
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    // Get the provider
    const provider = this.providers.get(token) || token;

    // If provider is not a constructor function, throw error
    if (typeof provider !== 'function') {
      throw new Error(`Cannot resolve token "${String(token)}". No value or provider registered.`);
    }

    // Get constructor dependencies
    const dependencies = this.getDependencies(provider as Provider);

    // Resolve dependencies recursively
    const resolvedDependencies = dependencies.map((dep) => this.resolve(dep));

    // Create instance
    const ProviderClass = provider as Provider<T>;
    const instance = new ProviderClass(...resolvedDependencies);

    // Cache instance
    this.instances.set(token, instance);

    return instance as T;
  }

  /**
   * Get constructor dependencies from metadata
   * 
   * Priority:
   * 1. Explicit deps in @Injectable({ deps: [...] }) - works in ESM
   * 2. @Inject() parameter decorators
   * 3. design:paramtypes from TypeScript (may not work in ESM)
   */
  private getDependencies(target: Provider): InjectionToken[] {
    // FIRST: Check for explicit deps in @Injectable({ deps: [...] })
    // This is the most reliable method for ESM compatibility
    const explicitDeps: InjectionToken[] | undefined = 
      Reflect.getMetadata('nitrostack:deps', target);
    
    if (explicitDeps && explicitDeps.length > 0) {
      return explicitDeps;
    }
    
    // SECOND: Get design:paramtypes metadata set by TypeScript
    // This may be empty in ESM if reflect-metadata wasn't loaded early enough
    const params: InjectionToken[] = Reflect.getMetadata('design:paramtypes', target) || [];
    
    // Check for @Inject tokens which override the types
    const injectTokens: InjectionToken[] = Reflect.getMetadata('nitrostack:inject', target) || [];
    
    // Merge: use inject tokens where specified, otherwise use the param type
    return params.map((param, index) => {
      return injectTokens[index] || param;
    });
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.providers.clear();
    this.instances.clear();
  }

  /**
   * Check if a token is registered
   * @param token - The token to check
   */
  has(token: InjectionToken): boolean {
    return this.providers.has(token) || this.instances.has(token);
  }
}

