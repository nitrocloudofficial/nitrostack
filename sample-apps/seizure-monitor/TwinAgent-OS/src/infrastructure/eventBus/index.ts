import { EventEmitter } from 'events';
import { logger } from '../logger/index.js';

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public publish(event: string, payload: unknown): void {
    logger.info({ event, payload }, `[EventBus] Event Published: ${event}`);
    this.emit(event, payload);
    this.emit('*', { event, payload });
  }
}

export const eventBus = EventBus.getInstance();
