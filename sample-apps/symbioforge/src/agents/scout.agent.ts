import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';

export class ScoutAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.subscribe('FACTORY_REGISTERED', (event) => {
      if (event.type !== 'FACTORY_REGISTERED') return;
      this.ingestFactory(event.payload.factoryId);
    });

    this.eventBus.subscribe('FACTORY_UPDATED', (event) => {
      if (event.type !== 'FACTORY_UPDATED') return;
      this.ingestFactory(event.payload.factoryId);
    });
  }

  private ingestFactory(factoryId: string) {
    const factory = this.stateManager.getFactory(factoryId);
    if (!factory) return;

    this.stateManager.addLog('Scout', `Ingested factory profile: "${factory.name}"`, 'info');

    // Trigger Profiler
    this.eventBus.publish({
      type: 'FACTORY_PROFILED',
      payload: { factoryId }
    });
  }
}
