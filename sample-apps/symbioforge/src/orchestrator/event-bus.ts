export type SwarmEvent =
  | { type: 'FACTORY_REGISTERED'; payload: { factoryId: string } }
  | { type: 'FACTORY_UPDATED'; payload: { factoryId: string } }
  | { type: 'FACTORY_PROFILED'; payload: { factoryId: string } }
  | { type: 'MATCHES_DISCOVERED'; payload: { matchIds: string[] } }
  | { type: 'PRODUCTS_INVENTED'; payload: { productIds: string[] } }
  | { type: 'IMPACT_AUDITED'; payload: { opportunityIds: string[] } }
  | { type: 'PATHWAYS_DESIGNED'; payload: { blueprintIds: string[] } }
  | { type: 'ECOSYSTEM_STABLE'; payload: { timestamp: string } }
  | { type: 'SENTINEL_TRIGGERED'; payload: { reason: string } }
  | { type: 'VOLUME_UPDATE'; payload: { factoryId: string, currentVolume: number } }
  | { type: 'COMPLIANCE_DUE'; payload: { factoryId: string, daysOverdue: number } };

export type SwarmEventHandler = (event: SwarmEvent) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<SwarmEventHandler>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe(type: SwarmEvent['type'], handler: SwarmEventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(handler);
      }
    };
  }

  public publish(event: SwarmEvent): void {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const handler of set) {
        try {
          handler(event);
        } catch (e) {
          // Avoid console.error in server code!
        }
      }
    }
  }
}
