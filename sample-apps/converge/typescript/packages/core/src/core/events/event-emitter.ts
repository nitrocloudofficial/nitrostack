import 'reflect-metadata';

/**
 * Event handler type
 */
type EventHandler = (...args: unknown[]) => void | Promise<void>;

/**
 * Event Emitter
 * 
 * Simple event bus for decoupled communication between modules
 */
export class EventEmitter {
  private static instance: EventEmitter;
  private listeners: Map<string, EventHandler[]> = new Map();

  private constructor() {}

  static getInstance(): EventEmitter {
    if (!EventEmitter.instance) {
      EventEmitter.instance = new EventEmitter();
    }
    return EventEmitter.instance;
  }

  /**
   * Register an event listener
   */
  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Register a one-time event listener
   */
  once(event: string, handler: EventHandler): void {
    const wrappedHandler = async (...args: unknown[]) => {
      await handler(...args);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  /**
   * Remove an event listener
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event
   */
  async emit(event: string, ...args: unknown[]): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.length === 0) return;

    // Execute all handlers in parallel
    await Promise.all(handlers.map(handler => handler(...args)));
  }

  /**
   * Emit an event synchronously
   */
  emitSync(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.length === 0) return;

    handlers.forEach(handler => handler(...args));
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * Get all event names
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

