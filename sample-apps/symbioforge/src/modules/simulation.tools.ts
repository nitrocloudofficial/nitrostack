import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { stateManager, eventBus } from './bootstrap.js';
import { WasteClassifier } from '../core/waste-classifier.js';
import { MatchingAlgorithm } from '../core/matching-algorithm.js';
import { ProductGenerator } from '../core/product-generator.js';
import { PathwayPlanner } from '../core/pathway-planner.js';
import { Factory } from '../core/types.js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface SimSnapshot {
  month: number;
  label: string;
  event: 'factory_joined' | 'matches_found' | 'products_invented' | 'blueprints_created' | 'disruption' | 'self_healed' | 'milestone';
  factoriesCount: number;
  matchesCount: number;
  productsCount: number;
  blueprintsCount: number;
  circularScore: number;
  totalCo2Avoided: number;
  totalLandfillDiverted: number;
  totalWaterSaved: number;
  totalFinancialValue: number;
  newFactoryName?: string;
  disruptedFactory?: string;
  affectedChains?: number;
}

@Injectable()
export class SimulationTools {
  @Tool({
    name: 'run-simulation',
    description: 'Run SymbioSim Time Machine — replay 12 months of ecosystem evolution. Resets state, adds factories one by one, discovers matches, invents products, triggers a disruption, self-heals, and returns monthly snapshots showing the circular economy score climbing from 0% to ~78%.',
    inputSchema: z.object({
      months: z.number().min(6).max(24).default(12).optional().describe('Number of months to simulate (default 12)'),
      includeDisruption: z.boolean().default(true).optional().describe('Include a factory disruption event mid-simulation')
    })
  })
  @Widget('symbiosis-timeline')
  public async runSimulation(
    args: { months?: number; includeDisruption?: boolean },
    ctx: ExecutionContext
  ) {
    const totalMonths = args.months ?? 12;
    const includeDisruption = args.includeDisruption ?? true;
    const disruptionMonth = Math.floor(totalMonths * 0.65);

    ctx.logger.info(`[SymbioSim] Starting ${totalMonths}-month simulation...`);

    const allFactories = this.loadAllFactories();
    const classifier = new WasteClassifier();
    const matcher = new MatchingAlgorithm();
    const generator = new ProductGenerator();
    const planner = new PathwayPlanner();

    stateManager.resetState();
    // Clear factories loaded by resetState
    const state = stateManager.getState();
    state.factories = [];
    state.matches = [];
    state.chains = [];
    state.products = [];
    state.blueprints = [];
    state.activityLogs = [];
    state.circularScore = 0;
    state.totalCo2Avoided = 0;
    state.totalLandfillDiverted = 0;
    state.totalWaterSaved = 0;
    state.totalEnergySaved = 0;
    state.totalFinancialValue = 0;
    state.swarmActive = true;

    const snapshots: SimSnapshot[] = [];
    let factoryIndex = 0;

    // Distribute factories across months
    const factoriesPerMonth = this.distributeFactories(allFactories.length, totalMonths);

    for (let month = 1; month <= totalMonths; month++) {
      // --- DISRUPTION at ~65% mark ---
      if (includeDisruption && month === disruptionMonth) {
        const disruptResult = this.simulateDisruption(matcher, generator, planner);
        if (disruptResult) {
          snapshots.push({
            month,
            ...disruptResult,
            ...this.captureMetrics()
          });
          continue;
        }
      }

      // --- SELF-HEAL the month after disruption ---
      if (includeDisruption && month === disruptionMonth + 1) {
        this.simulateSelfHealing(classifier, matcher, generator, planner);
        snapshots.push({
          month,
          label: `Recovery — Matchmaker reroutes waste streams`,
          event: 'self_healed',
          ...this.captureMetrics()
        });
        continue;
      }

      // --- ADD FACTORIES ---
      const toAdd = factoriesPerMonth[month - 1];
      let lastFactory: Factory | undefined;
      for (let i = 0; i < toAdd && factoryIndex < allFactories.length; i++) {
        const f = allFactories[factoryIndex++];
        f.wasteStreams = f.declaredWastes.map(w => classifier.classifyWaste(f.id, f.name, w));
        f.complianceStatus = 'filed';
        f.lastFiledDate = `2026-${String(month).padStart(2, '0')}-15`;
        stateManager.addFactory(f);
        lastFactory = f;
      }

      // --- RUN AGENT CHAIN ---
      const factories = stateManager.getFactories();

      // Matchmaker
      const oldMatches = stateManager.getMatches();
      const oldMatchStatus = new Map(oldMatches.map(m => [m.id, m.status]));
      const matches = matcher.findMatches(factories);
      for (const m of matches) {
        const prev = oldMatchStatus.get(m.id);
        if (prev && prev !== 'New') m.status = prev;
      }
      stateManager.setMatches(matches);

      const chains = matcher.findMultiHopChains(matches);
      stateManager.setChains(chains);

      // Inventor
      const oldProducts = stateManager.getProducts();
      const oldProductStatus = new Map(oldProducts.map(p => [p.id, p.status]));
      const products = generator.generateProducts(factories);
      for (const p of products) {
        const prev = oldProductStatus.get(p.id);
        if (prev && prev !== 'New') p.status = prev;
      }
      stateManager.setProducts(products);

      // Auditor — promote top items progressively
      const newMatches = matches.filter(m => m.status === 'New');
      const promoteCount = Math.min(Math.ceil(month / 2), newMatches.length);
      newMatches.slice(0, promoteCount).forEach(m => { m.status = 'Blueprint Ready'; });

      const newProducts = products.filter(p => p.status === 'New');
      const promoteProductCount = Math.min(Math.ceil(month / 3), newProducts.length);
      newProducts.slice(0, promoteProductCount).forEach(p => { p.status = 'Blueprint Ready'; });

      // Activate some older Blueprint Ready items
      if (month >= 4) {
        const readyMatches = matches.filter(m => m.status === 'Blueprint Ready');
        const activateCount = Math.min(Math.floor(month / 4), readyMatches.length);
        readyMatches.slice(0, activateCount).forEach(m => { m.status = 'Active'; });

        const readyProducts = products.filter(p => p.status === 'Blueprint Ready');
        readyProducts.slice(0, Math.floor(activateCount / 2)).forEach(p => { p.status = 'Active'; });
      }

      stateManager.recalculateMetrics();

      // Architect — blueprints for ready items
      for (const m of matches.filter(m => m.status === 'Blueprint Ready' || m.status === 'Active')) {
        if (!stateManager.getBlueprints().find(b => b.opportunityId === m.id)) {
          stateManager.addBlueprint(planner.planMatchPathway(m));
        }
      }
      for (const p of products.filter(p => p.status === 'Blueprint Ready' || p.status === 'Active')) {
        if (!stateManager.getBlueprints().find(b => b.opportunityId === p.id)) {
          stateManager.addBlueprint(planner.planProductPathway(p));
        }
      }

      stateManager.recalculateMetrics();

      // --- BUILD SNAPSHOT ---
      const eventType = toAdd > 0 ? 'factory_joined' : 'matches_found';
      const label = this.getMonthLabel(month, toAdd, lastFactory, matches.length, products.length);

      snapshots.push({
        month,
        label,
        event: eventType,
        newFactoryName: lastFactory?.name,
        ...this.captureMetrics()
      });

      stateManager.addLog('System', `[SymbioSim Month ${month}] ${label}`, 'info');
    }

    // Add final activity logs
    const finalState = stateManager.getState();
    stateManager.addLog('System',
      `SymbioSim complete: ${totalMonths} months, ${finalState.factories.length} factories, ` +
      `${finalState.matches.length} symbioses, Score: ${finalState.circularScore}%`, 'success');

    return {
      success: true,
      simulation: {
        totalMonths,
        finalScore: finalState.circularScore,
        factoriesAdded: factoryIndex,
        totalMatches: finalState.matches.length,
        totalProducts: finalState.products.length,
        totalBlueprints: finalState.blueprints.length,
        disruption: includeDisruption
      },
      snapshots,
      activityLogs: finalState.activityLogs.slice(0, 30),
      widgetUri: 'ui://symbiosis-timeline'
    };
  }

  private loadAllFactories(): Factory[] {
    const initialPath = join(process.cwd(), 'src/data/factories-initial.json');
    const feedPath = join(process.cwd(), 'src/data/factory-feed.json');
    const initial: Factory[] = JSON.parse(readFileSync(initialPath, 'utf-8'));
    const feed: Factory[] = JSON.parse(readFileSync(feedPath, 'utf-8'));
    return [...initial, ...feed];
  }

  private distributeFactories(total: number, months: number): number[] {
    const dist: number[] = new Array(months).fill(0);
    let remaining = total;
    // Ramp up: more factories early, taper off
    for (let i = 0; i < months && remaining > 0; i++) {
      if (i < 3) {
        dist[i] = Math.min(3, remaining); // 3 per month early
      } else if (i < 6) {
        dist[i] = Math.min(2, remaining);
      } else {
        dist[i] = Math.min(1, remaining);
      }
      remaining -= dist[i];
    }
    // Distribute leftovers
    for (let i = 0; remaining > 0 && i < months; i++) {
      if (dist[i] < 3) { dist[i]++; remaining--; }
    }
    return dist;
  }

  private captureMetrics() {
    const state = stateManager.getState();
    return {
      factoriesCount: state.factories.length,
      matchesCount: state.matches.length,
      productsCount: state.products.length,
      blueprintsCount: state.blueprints.length,
      circularScore: state.circularScore,
      totalCo2Avoided: state.totalCo2Avoided,
      totalLandfillDiverted: state.totalLandfillDiverted,
      totalWaterSaved: state.totalWaterSaved,
      totalFinancialValue: state.totalFinancialValue
    };
  }

  private simulateDisruption(matcher: MatchingAlgorithm, generator: ProductGenerator, planner: PathwayPlanner) {
    const factories = stateManager.getFactories();
    const activeFactories = factories.filter(f => f.complianceStatus === 'filed');
    if (activeFactories.length < 3) return null;

    // Pick a factory with the most active matches for dramatic effect
    const matches = stateManager.getMatches();
    let maxAffected = 0;
    let target = activeFactories[0];
    for (const f of activeFactories) {
      const affected = matches.filter(m =>
        (m.sourceFactoryId === f.id || m.targetFactoryId === f.id) &&
        (m.status === 'Active' || m.status === 'Blueprint Ready')
      ).length;
      if (affected > maxAffected) { maxAffected = affected; target = f; }
    }

    target.complianceStatus = 'pending';
    const affectedMatches = matches.filter(m =>
      m.sourceFactoryId === target.id || m.targetFactoryId === target.id
    );
    affectedMatches.forEach(m => { if (m.status === 'Active') m.status = 'Blueprint Ready'; });

    stateManager.recalculateMetrics();
    stateManager.addLog('Sentinel', `DISRUPTION: Factory "${target.name}" reported emergency shutdown!`, 'error');
    stateManager.addLog('Sentinel', `Impact: ${affectedMatches.length} symbiotic chains affected.`, 'warning');

    return {
      label: `DISRUPTION — ${target.name} emergency shutdown!`,
      event: 'disruption' as const,
      disruptedFactory: target.name,
      affectedChains: affectedMatches.length
    };
  }

  private simulateSelfHealing(classifier: WasteClassifier, matcher: MatchingAlgorithm, generator: ProductGenerator, planner: PathwayPlanner) {
    const factories = stateManager.getFactories();
    // Restore disrupted factory
    const pending = factories.find(f => f.complianceStatus === 'pending');
    if (pending) {
      pending.complianceStatus = 'filed';
    }

    // Re-run matching
    const oldMatches = stateManager.getMatches();
    const oldStatus = new Map(oldMatches.map(m => [m.id, m.status]));
    const newMatches = matcher.findMatches(factories);
    for (const m of newMatches) {
      const prev = oldStatus.get(m.id);
      if (prev && prev !== 'New') m.status = prev;
    }
    // Promote some recovered matches
    const recoveredNew = newMatches.filter(m => m.status === 'New');
    recoveredNew.slice(0, 3).forEach(m => { m.status = 'Blueprint Ready'; });

    stateManager.setMatches(newMatches);
    stateManager.recalculateMetrics();

    stateManager.addLog('Sentinel', `Self-healing complete. ${recoveredNew.length} new alternative routes discovered.`, 'success');
    stateManager.addLog('Matchmaker', `Rematched ${newMatches.length} symbioses after disruption recovery.`, 'success');
  }

  private getMonthLabel(month: number, added: number, lastFactory: Factory | undefined, matchCount: number, productCount: number): string {
    if (month === 1) return `Ecosystem initialized — ${added} factories onboarded`;
    if (added > 0 && lastFactory) return `${lastFactory.name} joins — ${matchCount} total symbioses`;
    if (month <= 4) return `${matchCount} symbioses discovered, ${productCount} products invented`;
    return `Ecosystem growing — Score climbing, ${matchCount} active symbioses`;
  }
}
