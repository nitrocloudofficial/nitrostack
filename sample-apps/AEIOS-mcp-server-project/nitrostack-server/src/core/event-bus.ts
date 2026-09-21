export type EventHandler = (data: unknown) => void | Promise<void>;

export interface EventRecord {
  event: string;
  data: unknown;
  timestamp: Date;
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private history: EventRecord[] = [];

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  async publish(event: string, data: unknown): Promise<void> {
    this.history.push({ event, data, timestamp: new Date() });
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        await handler(data);
      }
    }
  }

  getHistory(event?: string): EventRecord[] {
    if (event) {
      return this.history.filter((r) => r.event === event);
    }
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}
