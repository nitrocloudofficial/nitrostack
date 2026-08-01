import 'reflect-metadata';
import { DIContainer, InjectionToken } from '../core/di/container.js';
import { ExecutionContext, Logger, LogMeta } from '../core/types.js';

// Class constructor type
type ClassConstructor<T = unknown> = new (...args: unknown[]) => T;

// Declare jest as global (optional, only available if using Jest)
// Removed to avoid conflict with @types/jest
// declare global {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   var jest: { fn: () => unknown; spyOn: (obj: object, method: string) => unknown } | undefined;
// }

/**
 * Testing utilities for NitroStack
 */

/**
 * Log entry for mock logger
 */
interface LogEntry {
  level: string;
  message: string;
  meta?: LogMeta;
}

/**
 * Mock logger for testing
 */
export class MockLogger implements Logger {
  logs: LogEntry[] = [];

  debug(message: string, meta?: LogMeta): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  info(message: string, meta?: LogMeta): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: LogMeta): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: LogMeta): void {
    this.logs.push({ level: 'error', message, meta });
  }

  clear(): void {
    this.logs = [];
  }

  hasLog(level: string, message: string): boolean {
    return this.logs.some(log => log.level === level && log.message.includes(message));
  }
}

/**
 * Create a mock execution context for testing
 */
export function createMockContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  const mockLogger = new MockLogger();

  return {
    requestId: 'test-request-id',
    logger: mockLogger,
    metadata: {},
    auth: undefined,
    ...overrides,
  };
}

/**
 * Testing module builder
 */
export class TestingModule {
  private container: DIContainer;
  private providers: Map<InjectionToken, ClassConstructor> = new Map();
  private mocks: Map<InjectionToken, unknown> = new Map();

  private constructor() {
    this.container = DIContainer.getInstance();
  }

  /**
   * Create a testing module
   */
  static create(): TestingModule {
    return new TestingModule();
  }

  /**
   * Add a provider to the module
   */
  addProvider<T>(token: InjectionToken<T>, provider?: ClassConstructor<T>): this {
    this.providers.set(token, (provider || token) as ClassConstructor);
    return this;
  }

  /**
   * Add a mock to the module
   */
  addMock<T>(token: InjectionToken<T>, mock: T): this {
    this.mocks.set(token, mock);
    return this;
  }

  /**
   * Compile the testing module
   */
  compile(): CompiledTestingModule {
    // Clear existing container
    this.container.clear();

    // Register mocks first (they take precedence)
    for (const [token, mock] of this.mocks.entries()) {
      this.container.registerValue(token, mock);
    }

    // Register providers
    for (const [token, provider] of this.providers.entries()) {
      if (!this.mocks.has(token)) {
        this.container.register(token, provider);
      }
    }

    return new CompiledTestingModule(this.container);
  }
}

/**
 * Compiled testing module
 */
export class CompiledTestingModule {
  constructor(private container: DIContainer) { }

  /**
   * Get an instance from the container
   */
  get<T>(token: InjectionToken<T>): T {
    return this.container.resolve<T>(token);
  }

  /**
   * Cleanup the module
   */
  cleanup(): void {
    this.container.clear();
  }
}

/**
 * Mock function interface
 */
interface MockFn<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  calls: TArgs[];
  mockReturnValue: TReturn | undefined;
  mockResolvedValue: (value: unknown) => MockFn<TArgs, Promise<unknown>>;
  mockRejectedValue: (error: unknown) => MockFn<TArgs, Promise<unknown>>;
}

/**
 * Create a mock function (compatible with Jest)
 */
export function createMockFn<TArgs extends unknown[] = unknown[], TReturn = unknown>(): MockFn<TArgs, TReturn> {
  // If jest is available, use it
  if (typeof jest !== 'undefined' && jest?.fn) {
    return jest.fn() as unknown as MockFn<TArgs, TReturn>;
  }

  // Otherwise, create a simple mock
  const fn = ((...args: TArgs) => {
    fn.calls.push(args);
    return fn.mockReturnValue as TReturn;
  }) as MockFn<TArgs, TReturn>;

  fn.calls = [];
  fn.mockReturnValue = undefined;
  fn.mockResolvedValue = (value: unknown) => {
    fn.mockReturnValue = Promise.resolve(value) as TReturn;
    return fn as MockFn<TArgs, Promise<unknown>>;
  };
  fn.mockRejectedValue = (error: unknown) => {
    fn.mockReturnValue = Promise.reject(error) as TReturn;
    return fn as MockFn<TArgs, Promise<unknown>>;
  };

  return fn;
}

/**
 * Wait for async operations to complete
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Spy interface
 */
interface Spy<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  calls: TArgs[];
  restore: () => void;
}

/**
 * Spy on a method
 */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K
): Spy {
  if (typeof jest !== 'undefined' && jest?.spyOn) {
    return jest.spyOn(obj as any, method as any) as unknown as Spy;
  }

  // Simple spy implementation
  const original = obj[method] as (...args: unknown[]) => unknown;
  const spy = ((...args: unknown[]) => {
    spy.calls.push(args);
    return original.apply(obj, args);
  }) as Spy;

  spy.calls = [];
  spy.restore = () => {
    (obj as Record<string, unknown>)[method as string] = original;
  };

  (obj as Record<string, unknown>)[method as string] = spy;
  return spy;
}
