import { EventBus, SwarmEvent } from './event-bus.js';
import { StateManager } from './state-manager.js';

/**
 * AgentChain is the LOGGING layer of the orchestrator.
 * 
 * It listens to every event on the bus and writes descriptive activity log entries
 * so the Agent Swarm Monitor widget shows the full chain narrative.
 * 
 * IMPORTANT: AgentChain does NOT re-publish events or call agents directly.
 * Each agent self-subscribes to its trigger event and executes its own logic.
 * This eliminates the previous double-trigger bug where both AgentChain and
 * individual agents were responding to the same events.
 * 
 * Flow (agents self-trigger, chain just logs):
 *   FACTORY_REGISTERED   → ClerkAgent (auto) + [logged here]
 *   FACTORY_PROFILED     → ProfilerAgent (auto) + [logged here]
 *   MATCHES_DISCOVERED   → MatchmakerAgent + InventorAgent (auto) + [logged here]
 *   PRODUCTS_INVENTED    → (feeds into IMPACT_AUDITED below)
 *   IMPACT_AUDITED       → AuditorAgent (auto) + [logged here]
 *   PATHWAYS_DESIGNED    → ArchitectAgent (auto) + [logged here]
 *   ECOSYSTEM_STABLE     → SentinelAgent (auto) + [logged here]
 */
export class AgentChain {
  private static instance: AgentChain;
  private eventBus: EventBus;
  private stateManager: StateManager;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.stateManager = StateManager.getInstance();
    this.setupListeners();
  }

  public static getInstance(): AgentChain {
    if (!AgentChain.instance) {
      AgentChain.instance = new AgentChain();
    }
    return AgentChain.instance;
  }

  private setupListeners() {
    // Each handler only logs — the actual agent already handles the event independently.

    this.eventBus.subscribe('FACTORY_REGISTERED', (event: SwarmEvent) => {
      if (event.type !== 'FACTORY_REGISTERED') return;
      const factory = this.stateManager.getFactory(event.payload.factoryId);
      if (factory) {
        this.stateManager.addLog('Scout', `Ingesting factory profile: "${factory.name}" (${factory.industryType})`, 'info');
      }
    });

    this.eventBus.subscribe('FACTORY_UPDATED', (event: SwarmEvent) => {
      if (event.type !== 'FACTORY_UPDATED') return;
      const factory = this.stateManager.getFactory(event.payload.factoryId);
      if (factory) {
        this.stateManager.addLog('Scout', `Factory profile updated: "${factory.name}" — re-triggering chain.`, 'info');
      }
    });

    this.eventBus.subscribe('FACTORY_PROFILED', (event: SwarmEvent) => {
      if (event.type !== 'FACTORY_PROFILED') return;
      const factory = this.stateManager.getFactory(event.payload.factoryId);
      if (factory) {
        this.stateManager.addLog(
          'Profiler',
          `Starting waste stream classification for "${factory.name}"...`,
          'info'
        );
      }
    });

    this.eventBus.subscribe('MATCHES_DISCOVERED', (event: SwarmEvent) => {
      if (event.type !== 'MATCHES_DISCOVERED') return;
      const factoryCount = this.stateManager.getFactories().length;
      this.stateManager.addLog(
        'Matchmaker',
        `Scanning ${factoryCount} factories for new symbiotic matches and multi-hop chains...`,
        'info'
      );
      this.stateManager.addLog(
        'Inventor',
        `Analyzing cluster waste portfolio for novel product concepts...`,
        'info'
      );
    });

    this.eventBus.subscribe('IMPACT_AUDITED', (event: SwarmEvent) => {
      if (event.type !== 'IMPACT_AUDITED') return;
      const matches = this.stateManager.getMatches().length;
      const products = this.stateManager.getProducts().length;
      this.stateManager.addLog(
        'Auditor',
        `Computing ESG and financial impact across ${matches} matches and ${products} product concepts...`,
        'info'
      );
    });

    this.eventBus.subscribe('PATHWAYS_DESIGNED', (event: SwarmEvent) => {
      if (event.type !== 'PATHWAYS_DESIGNED') return;
      const blueprintReady = this.stateManager.getMatches().filter(m => m.status === 'Blueprint Ready').length
        + this.stateManager.getProducts().filter(p => p.status === 'Blueprint Ready').length;
      this.stateManager.addLog(
        'Architect',
        `Generating manufacturing blueprints for ${blueprintReady} top-ranked opportunities...`,
        'info'
      );
    });

    this.eventBus.subscribe('ECOSYSTEM_STABLE', (event: SwarmEvent) => {
      if (event.type !== 'ECOSYSTEM_STABLE') return;
      const score = this.stateManager.getState().circularScore;
      this.stateManager.addLog(
        'Sentinel',
        `Chain cycle complete. Cluster circular economy score: ${score}%. Monitoring for changes.`,
        'success'
      );
    });

    this.eventBus.subscribe('SENTINEL_TRIGGERED', (event: SwarmEvent) => {
      if (event.type !== 'SENTINEL_TRIGGERED') return;
      this.stateManager.addLog(
        'Sentinel',
        `Disruption event received: ${event.payload.reason}. Self-healing protocol engaged.`,
        'warning'
      );
    });
  }
}
