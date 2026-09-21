import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';
import { MatchingAlgorithm } from '../core/matching-algorithm.js';
import { WasteClassifier } from '../core/waste-classifier.js';

export class MatchmakerAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;
  private matchingAlgorithm: MatchingAlgorithm;
  private wasteClassifier: WasteClassifier;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.matchingAlgorithm = new MatchingAlgorithm();
    this.wasteClassifier = new WasteClassifier();
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.subscribe('MATCHES_DISCOVERED', (event) => {
      if (event.type !== 'MATCHES_DISCOVERED') return;
      this.discoverMatches();
    });
  }

  public discoverMatches() {
    const factories = this.stateManager.getFactories();
    this.stateManager.addLog('Matchmaker', `Scanning ${factories.length} factories for new symbioses...`, 'info');

    for (const f of factories) {
      if (!f.wasteStreams && f.declaredWastes.length > 0) {
        f.wasteStreams = f.declaredWastes.map(w =>
          this.wasteClassifier.classifyWaste(f.id, f.name, w)
        );
      }
    }

    const oldMatches = this.stateManager.getMatches();
    const oldStatusMap = new Map(oldMatches.map(m => [m.id, m.status]));

    const matches = this.matchingAlgorithm.findMatches(factories);
    for (const m of matches) {
      const prev = oldStatusMap.get(m.id);
      if (prev && prev !== 'New') {
        m.status = prev;
      }
    }
    this.stateManager.setMatches(matches);

    this.stateManager.addLog(
      'Matchmaker',
      `Found ${matches.length} symbiotic matches. Top match: ${matches[0] ? `"${matches[0].sourceFactoryName}" → "${matches[0].targetFactoryName}" (${matches[0].compatibilityScore}%)` : 'None'}`,
      'success'
    );

    const chains = this.matchingAlgorithm.findMultiHopChains(matches);
    this.stateManager.setChains(chains);

    if (chains.length > 0) {
      this.stateManager.addLog(
        'Matchmaker',
        `Discovered ${chains.length} multi-hop circular chains (A→B→C).`,
        'success'
      );
    }

    this.eventBus.publish({
      type: 'PRODUCTS_INVENTED',
      payload: { productIds: [] }
    });
  }
}
