import { StateManager } from '../orchestrator/state-manager.js';
import { EventBus } from '../orchestrator/event-bus.js';

export class SentinelAgent {
  private stateManager: StateManager;
  private eventBus: EventBus;
  private volumeBaseline: Map<string, number> = new Map();

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.setupListeners();
    this.captureBaseline();
  }

  private captureBaseline() {
    const factories = this.stateManager.getFactories();
    for (const f of factories) {
      if (f.wasteStreams) {
        const total = f.wasteStreams.reduce((sum, w) => sum + w.volume, 0);
        this.volumeBaseline.set(f.id, total);
      }
    }
  }

  private setupListeners() {
    this.eventBus.subscribe('SENTINEL_TRIGGERED', (event) => {
      if (event.type !== 'SENTINEL_TRIGGERED') return;
      this.handleDisruption(event.payload.reason);
    });

    this.eventBus.subscribe('ECOSYSTEM_STABLE', (event) => {
      if (event.type !== 'ECOSYSTEM_STABLE') return;
      this.runHealthChecks();
    });

    this.eventBus.subscribe('VOLUME_UPDATE', (event) => {
      if (event.type !== 'VOLUME_UPDATE') return;
      this.handleVolumeUpdate(event.payload.factoryId, event.payload.currentVolume);
    });
  }

  public handleVolumeUpdate(factoryId: string, currentVolume: number) {
    const factory = this.stateManager.getFactory(factoryId);
    if (!factory) return;

    const baseline = this.volumeBaseline.get(factoryId);
    const expectedVolume = baseline || (factory.wasteStreams?.reduce((sum, w) => sum + w.volume, 0) || 0);

    if (expectedVolume > 0) {
      const changePercent = Math.abs((currentVolume - expectedVolume) / expectedVolume);
      if (changePercent > 0.2) {
        this.stateManager.addLog(
          'Sentinel',
          `Volume anomaly detected in "${factory.name}": reported ${currentVolume} kg vs baseline ${expectedVolume} kg (${(changePercent * 100).toFixed(0)}% deviation).`,
          'error'
        );
        this.eventBus.publish({
          type: 'SENTINEL_TRIGGERED',
          payload: { reason: `volume_anomaly_${factory.id}` }
        });
      }
    }
    this.volumeBaseline.set(factoryId, currentVolume);
  }

  public checkComplianceDeadlines() {
    const factories = this.stateManager.getFactories();
    const now = new Date();
    let reminded = 0;

    for (const factory of factories) {
      if (factory.complianceStatus === 'overdue') {
        this.stateManager.addLog(
          'Sentinel',
          `COMPLIANCE ALERT: "${factory.name}" has overdue SPCB filing. Immediate action required.`,
          'error'
        );
        continue;
      }

      if (factory.lastFiledDate) {
        const lastFiled = new Date(factory.lastFiledDate);
        const diffTime = Math.abs(now.getTime() - lastFiled.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 330) {
          factory.complianceStatus = diffDays > 365 ? 'overdue' : 'pending';
          const label = diffDays > 365 ? `OVERDUE by ${diffDays - 365} days` : `due in ${365 - diffDays} days`;
          this.stateManager.addLog(
            'Sentinel',
            `Compliance filing reminder: "${factory.name}" — ${label}. Clerk notified.`,
            'warning'
          );
          this.eventBus.publish({
            type: 'COMPLIANCE_DUE',
            payload: { factoryId: factory.id, daysOverdue: diffDays - 365 }
          });
          reminded++;
        }
      }
    }

    if (reminded === 0) {
      this.stateManager.addLog('Sentinel', 'Compliance check complete. All factories are current on filings.', 'success');
    }
  }

  private handleDisruption(reason: string) {
    this.stateManager.addLog('Sentinel', `Disruption detected: ${reason}. Initiating self-healing protocol...`, 'warning');

    const scoreBefore = this.stateManager.getState().circularScore;

    // --- 1. Parse disrupted factory ID and remove affected chains ---
    const factoryIdMatch = reason.match(/halt_(.+)|volume_anomaly_(.+)|manual_halt_(.+)/);
    const disruptedId = factoryIdMatch
      ? (factoryIdMatch[1] || factoryIdMatch[2] || factoryIdMatch[3])
      : null;

    if (disruptedId) {
      const allMatches = this.stateManager.getMatches();
      const affectedMatches = allMatches.filter(
        m => m.sourceFactoryId === disruptedId || m.targetFactoryId === disruptedId
      );

      if (affectedMatches.length > 0) {
        // Downgrade to New so Architect won't re-use stale blueprints
        for (const m of affectedMatches) m.status = 'New';

        // Remove multi-hop chains routing through disrupted factory
        const survivingChains = this.stateManager.getChains().filter(
          c => !c.hops.some(h => h.sourceFactoryId === disruptedId || h.targetFactoryId === disruptedId)
        );
        this.stateManager.setChains(survivingChains);
        this.stateManager.recalculateMetrics();

        const scoreAfter = this.stateManager.getState().circularScore;
        this.stateManager.addLog(
          'Sentinel',
          `Impact assessment: ${affectedMatches.length} symbiotic chains disrupted. ` +
          `Cluster circular score: ${scoreBefore}% → ${scoreAfter}% (−${scoreBefore - scoreAfter}%).`,
          'warning'
        );
      }
    }

    // --- 2. Re-trigger the existing Matchmaker via event bus ---
    this.stateManager.addLog('Sentinel', 'Re-triggering Matchmaker to find replacement symbiotic connections...', 'info');

    setTimeout(() => {
      this.eventBus.publish({
        type: 'MATCHES_DISCOVERED',
        payload: { matchIds: [] }
      });

      setTimeout(() => {
        const recoveredScore = this.stateManager.getState().circularScore;
        if (recoveredScore >= scoreBefore - 10) {
          this.stateManager.addLog(
            'Sentinel',
            `Self-healing complete. Replacement connections found. Cluster score recovered: → ${recoveredScore}%. Ecosystem stable.`,
            'success'
          );
        } else {
          this.stateManager.addLog(
            'Sentinel',
            `Self-healing partial. Current cluster score: ${recoveredScore}%. Some chains remain unresolved. Monitoring continues.`,
            'warning'
          );
        }
        this.eventBus.publish({
          type: 'ECOSYSTEM_STABLE',
          payload: { timestamp: new Date().toISOString() }
        });
      }, 1500);
    }, 1000);
  }

  private runHealthChecks() {
    this.scanVolumeBaselines();
    this.trackPerformance();
    this.stateManager.addLog('Sentinel', 'Health checks complete. Ecosystem stable. Monitoring active.', 'success');
  }

  private scanVolumeBaselines() {
    const factories = this.stateManager.getFactories();
    for (const f of factories) {
      if (!f.wasteStreams) continue;
      const current = f.wasteStreams.reduce((sum, w) => sum + w.volume, 0);
      const baseline = this.volumeBaseline.get(f.id);
      if (baseline && baseline > 0) {
        const change = ((current - baseline) / baseline) * 100;
        if (Math.abs(change) > 25) {
          this.stateManager.addLog(
            'Sentinel',
            `Volume anomaly at "${f.name}": ${change > 0 ? '+' : ''}${change.toFixed(0)}% change from baseline.`,
            'warning'
          );
        }
      }
      this.volumeBaseline.set(f.id, current);
    }
  }

  private trackPerformance() {
    const state = this.stateManager.getState();
    const activeMatches = state.matches.filter(m => m.status === 'Blueprint Ready' || m.status === 'Active').length;
    const totalMatches = state.matches.length;
    const conversionRate = totalMatches > 0 ? Math.round((activeMatches / totalMatches) * 100) : 0;

    if (conversionRate < 10 && totalMatches > 5) {
      this.stateManager.addLog(
        'Sentinel',
        `Low conversion rate: only ${conversionRate}% of ${totalMatches} matches have advanced past "New". Consider reviewing match quality thresholds.`,
        'warning'
      );
    }
  }
}
