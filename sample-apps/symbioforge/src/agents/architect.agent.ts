import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';
import { PathwayPlanner } from '../core/pathway-planner.js';

export class ArchitectAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;
  private pathwayPlanner: PathwayPlanner;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.pathwayPlanner = new PathwayPlanner();
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.subscribe('PATHWAYS_DESIGNED', (event) => {
      if (event.type !== 'PATHWAYS_DESIGNED') return;
      this.designPathways();
    });
  }

  public designPathways() {
    this.stateManager.addLog('Architect', 'Designing complete manufacturing pathways and blueprints...', 'info');

    const matches = this.stateManager.getMatches().filter(m => m.status === 'Blueprint Ready');
    const products = this.stateManager.getProducts().filter(p => p.status === 'Blueprint Ready');

    for (const m of matches) {
      const bp = this.pathwayPlanner.planMatchPathway(m);
      this.stateManager.addBlueprint(bp);
    }

    for (const p of products) {
      const bp = this.pathwayPlanner.planProductPathway(p);
      this.stateManager.addBlueprint(bp);
    }

    this.stateManager.addLog(
      'Architect',
      `Blueprints generated for ${matches.length} matches and ${products.length} product concepts.`,
      'success'
    );

    // Trigger Sentinel
    this.eventBus.publish({
      type: 'ECOSYSTEM_STABLE',
      payload: { timestamp: new Date().toISOString() }
    });
  }
}
