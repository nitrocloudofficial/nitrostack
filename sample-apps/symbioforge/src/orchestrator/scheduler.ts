import { readFileSync } from 'fs';
import { join } from 'path';
import { StateManager } from './state-manager.js';
import { EventBus } from './event-bus.js';
import { Factory } from '../core/types.js';

export class Scheduler {
  private static instance: Scheduler;
  private stateManager: StateManager;
  private eventBus: EventBus;
  private feedFactories: Factory[] = [];
  private feedIndex = 0;
  private dripInterval: NodeJS.Timeout | null = null;
  private sentinelInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.loadFeed();
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  private loadFeed() {
    try {
      const feedPath = join(process.cwd(), 'src/data/factory-feed.json');
      this.feedFactories = JSON.parse(readFileSync(feedPath, 'utf-8'));
    } catch (e) {
      this.feedFactories = [];
    }
  }

  public start() {
    if (this.dripInterval || this.sentinelInterval) return;

    this.stateManager.addLog('System', 'Scheduler started. Swarm heartbeat active.', 'info');

    // Drip a new factory every 60 seconds for the demo
    this.dripInterval = setInterval(() => {
      if (!this.stateManager.getState().swarmActive) return;
      this.dripNextFactory();
    }, 60000);

    // Sentinel monitoring loop every 30 seconds
    this.sentinelInterval = setInterval(() => {
      if (!this.stateManager.getState().swarmActive) return;
      this.runSentinelCheck();
    }, 30000);
  }

  public stop() {
    if (this.dripInterval) {
      clearInterval(this.dripInterval);
      this.dripInterval = null;
    }
    if (this.sentinelInterval) {
      clearInterval(this.sentinelInterval);
      this.sentinelInterval = null;
    }
    this.stateManager.addLog('System', 'Scheduler stopped. Swarm heartbeat paused.', 'warning');
  }

  private dripNextFactory() {
    if (this.feedIndex >= this.feedFactories.length) {
      this.stateManager.addLog('System', 'All feed factories have been dripped.', 'info');
      return;
    }

    const factory = this.feedFactories[this.feedIndex++];
    this.stateManager.addLog('System', `[Drip Feed] New factory detected: "${factory.name}"`, 'info');

    // Register via Clerk
    this.stateManager.addFactory(factory);
    this.eventBus.publish({
      type: 'FACTORY_REGISTERED',
      payload: { factoryId: factory.id }
    });
  }

  private runSentinelCheck() {
    this.stateManager.addLog('Sentinel', 'Running ecosystem health check...', 'info');

    // Randomly simulate a factory shutdown or volume change to showcase self-healing
    const rand = Math.random();
    if (rand < 0.15) {
      // Simulate a factory shutdown
      const factories = this.stateManager.getFactories();
      const activeFactories = factories.filter(f => f.complianceStatus === 'filed');
      if (activeFactories.length > 5) {
        const target = activeFactories[Math.floor(Math.random() * activeFactories.length)];
        this.stateManager.addLog('Sentinel', `ALERT: Factory "${target.name}" reported temporary production halt!`, 'warning');

        // Break matches involving this factory
        const matches = this.stateManager.getMatches();
        const affectedMatches = matches.filter(m => m.sourceFactoryId === target.id || m.targetFactoryId === target.id);

        if (affectedMatches.length > 0) {
          this.stateManager.addLog('Sentinel', `Impact: ${affectedMatches.length} symbiotic chains affected. Re-triggering Matchmaker...`, 'warning');

          // Temporarily set target status to pending
          target.complianceStatus = 'pending';
          this.stateManager.recalculateMetrics();

          this.eventBus.publish({
            type: 'SENTINEL_TRIGGERED',
            payload: { reason: `halt_${target.id}` }
          });
        }
      }
    } else {
      this.stateManager.addLog('Sentinel', 'Ecosystem health: 100%. All active chains operating within parameters.', 'success');
    }
  }

  public reset() {
    this.feedIndex = 0;
    this.stop();
    this.start();
  }
}
