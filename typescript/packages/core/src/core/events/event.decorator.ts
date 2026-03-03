import 'reflect-metadata';
import { EventEmitter } from './event-emitter.js';

const EVENT_HANDLER_KEY = 'nitrostack:event_handler';

/**
 * Event handler metadata
 */
interface EventHandlerMetadata {
  event: string;
  methodName: string;
}

/**
 * Marks a method as an event handler
 * 
 * @example
 * ```typescript
 * export class OrderTools {
 *   @Tool({ name: 'create_order', ... })
 *   async createOrder(input: Record<string, unknown>, ctx: ExecutionContext) {
 *     const order = await this.saveOrder(input);
 *     
 *     // Emit event
 *     ctx.emit('order.created', order);
 *     
 *     return order;
 *   }
 * }
 * 
 * export class NotificationService {
 *   @OnEvent('order.created')
 *   async handleOrderCreated(order: unknown) {
 *     await this.sendConfirmationEmail(order);
 *   }
 * }
 * ```
 */
export function OnEvent(event: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const targetWithConstructor = target as { constructor: object };
    const existingHandlers = Reflect.getMetadata(EVENT_HANDLER_KEY, targetWithConstructor.constructor) || [];
    existingHandlers.push({
      event,
      methodName: propertyKey,
    });
    Reflect.defineMetadata(EVENT_HANDLER_KEY, existingHandlers, targetWithConstructor.constructor);
  };
}

/**
 * Get event handlers from a class
 */
export function getEventHandlers(target: object): EventHandlerMetadata[] {
  return Reflect.getMetadata(EVENT_HANDLER_KEY, target) || [];
}

/**
 * Register all event handlers from a class instance
 */
export function registerEventHandlers(instance: object & Record<string, unknown>): void {
  const emitter = EventEmitter.getInstance();
  const handlers = getEventHandlers((instance as { constructor: object }).constructor);

  for (const { event, methodName } of handlers) {
    const method = instance[String(methodName)];
    if (typeof method === 'function') {
      const handler = method.bind(instance);
      emitter.on(event, handler);
    }
  }
}

/**
 * Emit an event from execution context
 */
export function emitEvent(event: string, ...args: unknown[]): void {
  const emitter = EventEmitter.getInstance();
  // Emit async in background (non-blocking)
  emitter.emit(event, ...args).catch(error => {
    console.error(`Error in event handler for ${event}:`, error);
  });
}

