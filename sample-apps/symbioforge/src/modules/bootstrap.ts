import { StateManager } from '../orchestrator/state-manager.js';
import { ClerkAgent } from '../agents/clerk.agent.js';
import { ScoutAgent } from '../agents/scout.agent.js';
import { ProfilerAgent } from '../agents/profiler.agent.js';
import { MatchmakerAgent } from '../agents/matchmaker.agent.js';
import { InventorAgent } from '../agents/inventor.agent.js';
import { AuditorAgent } from '../agents/auditor.agent.js';
import { ArchitectAgent } from '../agents/architect.agent.js';
import { SentinelAgent } from '../agents/sentinel.agent.js';
import { Scheduler } from '../orchestrator/scheduler.js';
import { EventBus } from '../orchestrator/event-bus.js';
import { WasteClassifier } from '../core/waste-classifier.js';
import { MatchingAlgorithm } from '../core/matching-algorithm.js';
import { ProductGenerator } from '../core/product-generator.js';
import { PathwayPlanner } from '../core/pathway-planner.js';

export const stateManager = StateManager.getInstance();
export const clerkAgent = new ClerkAgent();
export const _scout = new ScoutAgent();
export const _profiler = new ProfilerAgent();
export const _matchmaker = new MatchmakerAgent();
export const _inventor = new InventorAgent();
export const _auditor = new AuditorAgent();
export const _architect = new ArchitectAgent();
export const _sentinel = new SentinelAgent();
export const scheduler = Scheduler.getInstance();
export const eventBus = EventBus.getInstance();

(() => {
  const factories = stateManager.getFactories();
  stateManager.addLog('System', `Bootstrapping ${factories.length} initial factories...`, 'info');

  const classifier = new WasteClassifier();
  for (const f of factories) {
    if (!f.wasteStreams || f.wasteStreams.length === 0) {
      f.wasteStreams = f.declaredWastes.map(w => classifier.classifyWaste(f.id, f.name, w));
    }
  }
  stateManager.addLog('Profiler', `Classified waste streams for ${factories.length} factories.`, 'success');

  const matcher = new MatchingAlgorithm();
  const matches = matcher.findMatches(factories);
  stateManager.setMatches(matches);
  stateManager.addLog('Matchmaker', `Found ${matches.length} symbiotic matches across the cluster.`, 'success');

  const chains = matcher.findMultiHopChains(matches);
  stateManager.setChains(chains);
  if (chains.length > 0) {
    stateManager.addLog('Matchmaker', `Discovered ${chains.length} multi-hop circular chains (A→B→C).`, 'success');
  }

  const generator = new ProductGenerator();
  const products = generator.generateProducts(factories);
  stateManager.setProducts(products);
  stateManager.addLog('Inventor', `Generated ${products.length} novel product concepts.`, 'success');

  matches.forEach((m, i) => { if (i < 3) m.status = 'Blueprint Ready'; });
  products.forEach((p, i) => { if (i < 2) p.status = 'Blueprint Ready'; });
  stateManager.recalculateMetrics();

  const planner = new PathwayPlanner();
  for (const m of matches.filter(m => m.status === 'Blueprint Ready')) {
    stateManager.addBlueprint(planner.planMatchPathway(m));
  }
  for (const p of products.filter(p => p.status === 'Blueprint Ready')) {
    stateManager.addBlueprint(planner.planProductPathway(p));
  }

  const state = stateManager.getState();
  stateManager.addLog('System', `Bootstrap complete. Circular score: ${state.circularScore}%, CO2 avoided: ${state.totalCo2Avoided} tons/yr, Value: INR ${(state.totalFinancialValue / 100000).toFixed(1)}L/yr`, 'success');
})();

scheduler.start();
