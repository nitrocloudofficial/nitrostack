import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';
import { ImpactCalculator } from '../core/impact-calculator.js';

export class AuditorAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;
  private impactCalculator: ImpactCalculator;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.impactCalculator = new ImpactCalculator();
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.subscribe('IMPACT_AUDITED', (event) => {
      if (event.type !== 'IMPACT_AUDITED') return;
      this.auditImpact();
    });
  }

  public auditImpact() {
    this.stateManager.addLog('Auditor', 'Quantifying environmental and financial impact of all discoveries...', 'info');

    const matches = this.stateManager.getMatches();
    const products = this.stateManager.getProducts();
    const factories = this.stateManager.getFactories();

    // --- Rank all matches by composite score ---
    const rankedMatches = [...matches].sort((a, b) => {
      const scoreA = a.compatibilityScore * 0.5 + a.co2SavedTonsPerYear * 10 + a.savingsInrPerYear / 10000;
      const scoreB = b.compatibilityScore * 0.5 + b.co2SavedTonsPerYear * 10 + b.savingsInrPerYear / 10000;
      return scoreB - scoreA;
    });

    // Mark top 3 matches as Blueprint Ready (score ≥ 70 threshold from blueprint)
    let markedMatches = 0;
    for (const m of rankedMatches) {
      if (m.compatibilityScore >= 70 && markedMatches < 3) {
        m.status = 'Blueprint Ready';
        markedMatches++;
      } else if (m.status === 'New') {
        m.status = 'Evaluated';
      }
    }


    // --- Rank all products by feasibility × revenue potential ---
    const rankedProducts = [...products].sort((a, b) => {
      const scoreA = a.feasibilityScore * 0.6 + a.revenuePotentialInrPerYear / 50000 + a.co2SavedTonsPerYear * 5;
      const scoreB = b.feasibilityScore * 0.6 + b.revenuePotentialInrPerYear / 50000 + b.co2SavedTonsPerYear * 5;
      return scoreB - scoreA;
    });

    // Mark top 2 products as Blueprint Ready (feasibility ≥ 65 threshold from blueprint)
    let markedProducts = 0;
    for (const p of rankedProducts) {
      if (p.feasibilityScore >= 65 && markedProducts < 2) {
        p.status = 'Blueprint Ready';
        markedProducts++;
      } else if (p.status === 'New') {
        p.status = 'Evaluated';
      }
    }

    // --- Wire in ImpactCalculator for real metrics ---
    const metrics = this.impactCalculator.calculateClusterMetrics(factories, matches, products);

    // Log ranked top-5 opportunities
    const top5: string[] = [];
    const allOpps = [
      ...rankedMatches.slice(0, 3).map(m => ({
        label: `${m.wasteStreamName}: ${m.sourceFactoryName} → ${m.targetFactoryName}`,
        co2: m.co2SavedTonsPerYear,
        inr: m.savingsInrPerYear,
        score: m.compatibilityScore
      })),
      ...rankedProducts.slice(0, 2).map(p => ({
        label: `Product: "${p.name}"`,
        co2: p.co2SavedTonsPerYear,
        inr: p.revenuePotentialInrPerYear,
        score: p.feasibilityScore
      }))
    ].sort((a, b) => b.score - a.score);

    allOpps.forEach((opp, i) => {
      top5.push(`#${i + 1} ${opp.label} (CO2: ${opp.co2}T/yr, INR ${(opp.inr / 100000).toFixed(1)}L/yr)`);
    });

    this.stateManager.addLog(
      'Auditor',
      `Rankings: ${top5.join(' | ')}`,
      'info'
    );

    this.stateManager.addLog(
      'Auditor',
      `Impact audit complete: ${metrics.totalCo2Avoided.toFixed(1)} tons CO2/yr avoided, ` +
      `${metrics.totalLandfillDiverted.toFixed(1)} tons landfill diverted, ` +
      `INR ${(metrics.totalFinancialValue / 100000).toFixed(1)}L/yr total value. ` +
      `Cluster circular score: ${metrics.circularScore}%.`,
      'success'
    );

    // Trigger Architect for blueprint-ready items
    this.eventBus.publish({
      type: 'PATHWAYS_DESIGNED',
      payload: { blueprintIds: [] }
    });
  }
}
