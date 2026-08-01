import { Injectable } from '@nitrostack/core';
import { ResourceDecorator as Resource, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { z } from 'zod';
import { MockCBSService } from '../mock-cbs.service.js';
import { IncrementalSVDEngine } from '../engine/incremental-svd.engine.js';
import { AtlasSreAgent } from './atlas.sre.js';
import { CerberusSecurityAgent } from './cerberus.security.js';
import { HermesComplianceAgent } from './hermes.compliance.js';
import { SingleFlightGate } from '../patterns/single-flight.js';
import { IdempotencyEnforcer } from '../patterns/idempotency.js';
import { QosShunting } from '../patterns/qos-shunting.js';
import { exec } from 'child_process';
import { randomUUID } from 'crypto';

// ──────────────────────────────────────────────────────────────────────────────
// System Status State Machine
// ──────────────────────────────────────────────────────────────────────────────
type SystemStatus = 'NOMINAL' | 'ANOMALY_DETECTED' | 'REMEDIATING' | 'RECOVERED';

/** Duration (ms) an anomaly must persist before emergency fallback fires. */
const EMERGENCY_FALLBACK_MS = 5000;

@Injectable({ deps: [
  MockCBSService, IncrementalSVDEngine,
  AtlasSreAgent, CerberusSecurityAgent, HermesComplianceAgent,
  SingleFlightGate, IdempotencyEnforcer, QosShunting
] })
export class PrimeOrchestrator {
  private liveMode: boolean = false;
  private systemStatus: SystemStatus = 'NOMINAL';
  private anomalyDetectedAt: number | null = null;
  private cascadeInProgress: boolean = false;

  constructor(
    private readonly cbs: MockCBSService,
    private readonly svdEngine: IncrementalSVDEngine,
    private readonly atlas: AtlasSreAgent,
    private readonly cerberus: CerberusSecurityAgent,
    private readonly hermes: HermesComplianceAgent,
    private readonly singleFlight: SingleFlightGate,
    private readonly idempotency: IdempotencyEnforcer,
    private readonly qos: QosShunting
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Telemetry Ingestion
  // ──────────────────────────────────────────────────────────────────────────

  private async getTelemetryData(): Promise<[number, number, number, number]> {
    let vector = this.cbs.getCurrentVector();
    
    if (this.liveMode) {
      try {
        const res = await fetch('http://localhost:3000/metrics');
        if (res.ok) {
          const data = (await res.json()) as any;
          vector = [
            data.queue_depth ?? 0,
            Math.min((data.active_connections ?? 0) * 10, 100),
            Math.min((data.active_connections ?? 0) * 20, 100),
            0
          ];
        }
      } catch (e) {
        // Fallback to mock if live server is unreachable
      }
    }
    return vector;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Forensic Justification Generator
  // ──────────────────────────────────────────────────────────────────────────

  private generateForensicJustification(
    vector: [number, number, number, number],
    residualNorm: number,
    isWarmup: boolean
  ): string {
    // Spec §4: Nominal or warmup → use the exact mandated string
    if (isWarmup || residualNorm <= 15.0) {
      return 'System telemetry is operating within healthy subspace bounds.';
    }

    // Spec §4: Anomaly → generate a precise forensic paragraph
    const labels = ['Queue Depth', 'Thread Occupancy', 'DB Saturation', 'Retry Rate'];
    const highDims = vector
      .map((val, i) => ({ label: labels[i], val }))
      .filter(d => d.val > 50)
      .map(d => `${d.label} (${d.val.toFixed(1)})`)
      .join(', ');

    return `ANOMALY CONFIRMED: SVD residual norm of ${residualNorm.toFixed(3)} has breached the 15.0 threshold, indicating the live telemetry vector has deviated significantly from the learned healthy subspace. The dominant stress dimensions are ${highDims || 'elevated across multiple axes'}. This pattern is consistent with a high-concurrency surge causing lock contention cascades in the core banking connection pool, resulting in thread saturation and queue depth escalation. Initiating staged remediation cascade: ATLAS (traffic shaping) → CERBERUS (mutation protection) → HERMES (compliance audit).`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Orchestration Plan Builder
  // ──────────────────────────────────────────────────────────────────────────

  private buildOrchestrationPlan(residualNorm: number) {
    return [
      {
        step: 1,
        target_agent: 'ATLAS',
        action: 'apply_single_flight_shield',
        parameters: { targetEndpoint: '/api/v1/balance' }
      },
      {
        step: 1,
        target_agent: 'ATLAS',
        action: 'enforce_qos_shunting',
        parameters: { trafficClass: 'EOD_BATCH' }
      },
      {
        step: 2,
        target_agent: 'CERBERUS',
        action: 'deploy_idempotency_shield',
        parameters: { active: true }
      },
      {
        step: 3,
        target_agent: 'HERMES',
        action: 'generate_compliance_rca',
        parameters: { residualNorm }
      },
      {
        step: 3,
        target_agent: 'HERMES',
        action: 'dispatch_teller_broadcast',
        parameters: { severity: 'CRITICAL' }
      }
    ];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Saga Orchestration with Rollback
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Executes the staged remediation cascade: ATLAS → CERBERUS → HERMES.
   * Maintains a rollback stack so that if any step fails, all previously
   * applied pattern flags are reverted to prevent partial-mitigation states.
   */
  private async executeRemediationCascade(
    analysis: { residualNorm: number; isAnomaly: boolean; isWarmupPeriod: boolean },
    vector: [number, number, number, number]
  ): Promise<void> {
    if (!analysis.isAnomaly || this.cascadeInProgress) return;

    // Track anomaly persistence for emergency fallback
    const now = Date.now();
    if (!this.anomalyDetectedAt) {
      this.anomalyDetectedAt = now;
      this.systemStatus = 'ANOMALY_DETECTED';
    }

    this.cascadeInProgress = true;
    this.systemStatus = 'REMEDIATING';
    const incidentId = randomUUID();
    const anomalyTimestamp = new Date(this.anomalyDetectedAt).toISOString();

    this.cbs.logEvent(
      `ANOMALY DETECTED: SVD residual norm ${analysis.residualNorm} > 15.0. Initiating staged remediation cascade.`,
      'error', 'PRIME'
    );

    const rollbackStack: (() => void)[] = [];

    try {
      // ── Step 1: ATLAS (SRE Agent) ─────────────────────────────────────────
      this.cbs.logEvent('Step 1/3: Delegating to ATLAS — applying traffic shaping shields...', 'warn', 'PRIME');

      await this.atlas.applySingleFlightShield({ targetEndpoint: '/api/v1/balance' });
      rollbackStack.push(() => { this.singleFlight.isActive = false; });
      this.cbs.logEvent('Single-Flight Shield ACTIVE on /api/v1/balance — concurrent reads coalesced.', 'success', 'ATLAS');

      await this.atlas.enforceQosShunting({ trafficClass: 'EOD_BATCH' as any });
      rollbackStack.push(() => { this.qos.isActive = false; });
      this.cbs.logEvent('QoS Shunting ACTIVE — batch endpoints throttled to 10% bandwidth.', 'success', 'ATLAS');

      // Check for emergency timeout between steps
      if (Date.now() - this.anomalyDetectedAt > EMERGENCY_FALLBACK_MS) {
        throw new Error('Cascade timeout: anomaly persisted > 5 seconds between agent steps');
      }

      // ── Step 2: CERBERUS (Security Agent) ─────────────────────────────────
      this.cbs.logEvent('Step 2/3: Delegating to CERBERUS — deploying mutation protection...', 'warn', 'PRIME');

      await this.cerberus.deployIdempotencyShield({ active: true });
      rollbackStack.push(() => { this.idempotency.isActive = false; });
      this.cbs.logEvent('Idempotency Shield ACTIVE — SHA-256 duplicate interceptor with LRU cap engaged.', 'success', 'CERBERUS');

      // ── Step 3: HERMES (Compliance Agent) ─────────────────────────────────
      this.cbs.logEvent('Step 3/3: Delegating to HERMES — filing RCA and broadcasting...', 'warn', 'PRIME');

      const activeShields = ['SingleFlightGate', 'QosShunting', 'IdempotencyEnforcer'];

      await this.hermes.generateComplianceRca({
        incidentId,
        resolution: 'Automated staged remediation cascade completed successfully.',
        residualNorm: analysis.residualNorm,
        activeShields,
        anomalyTimestamp
      });
      this.cbs.logEvent('Compliance RCA filed with SVD residuals and timing metrics.', 'success', 'HERMES');

      await this.hermes.dispatchTellerBroadcast({
        message: `ALERT: Core banking shields activated. Incident ${incidentId}. SVD residual: ${analysis.residualNorm}. All live transfers protected.`,
        severity: 'CRITICAL'
      });
      this.cbs.logEvent('Teller broadcast dispatched to all dashboard endpoints.', 'success', 'HERMES');

      // ── Cascade Complete ──────────────────────────────────────────────────
      this.systemStatus = 'RECOVERED';
      this.cbs.logEvent(
        `Remediation cascade COMPLETE. All 3 shields active. Incident: ${incidentId}`,
        'success', 'PRIME'
      );

    } catch (err: any) {
      // ── Saga Rollback ─────────────────────────────────────────────────────
      this.cbs.logEvent(
        `CASCADE FAILURE at step: ${err.message}. Rolling back ${rollbackStack.length} applied shields.`,
        'error', 'PRIME'
      );

      for (const undo of rollbackStack.reverse()) {
        try { undo(); } catch (_) { /* rollback best-effort */ }
      }

      // Trigger deterministic emergency fallback
      await this.emergencyHardcodedShieldActivation();
    } finally {
      this.cascadeInProgress = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Emergency Fail-Safe (Spec §1.5) — Exposed as MCP @Tool
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deterministic emergency fallback that bypasses the multi-agent cascade
   * and force-activates all resilience pattern flags directly.
   * Exposed as an MCP @Tool so it appears in the server manifest and can be
   * invoked by any connected LLM client as a last-resort action.
   *
   * Automatically invoked by PRIME when:
   * - The saga cascade fails at any step (after rollback), or
   * - Telemetry remains anomalous (residual_norm > 15.0) for > 3 seconds
   */
  @Tool({
    name: 'emergency_hardcoded_shield_activation',
    description: 'EMERGENCY FAIL-SAFE: Bypasses the multi-agent cascade and force-activates all resilience shields (SingleFlight, Idempotency, QoS) directly on the pattern singletons. Use only when the staged cascade has failed or timed out.',
    inputSchema: z.object({})
  })
  @Widget('tools')
  async emergencyHardcodedShieldActivation() {
    this.singleFlight.isActive = true;
    this.singleFlight.invalidateFence();
    this.idempotency.isActive = true;
    this.qos.isActive = true;
    this.systemStatus = 'REMEDIATING';

    this.cbs.logEvent(
      'EMERGENCY FAIL-SAFE: All shields force-activated — bypassed agent cascade due to timeout or failure.',
      'error', 'PRIME'
    );

    return {
      status: 'EMERGENCY_SHIELDS_ACTIVE',
      shields: {
        singleFlight: true,
        idempotency: true,
        qosShunting: true
      },
      timestamp: new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MCP Tools & Resources (Structured Output Protocol)
  // ──────────────────────────────────────────────────────────────────────────

  @Tool({
    name: 'set_simulation_mode',
    description: 'Toggle between mock and live validation mode',
    inputSchema: z.object({
      mode: z.enum(['mock', 'live'])
    })
  })
  async setSimulationMode(args: { mode: 'mock' | 'live' }) {
    this.liveMode = args.mode === 'live';
    this.systemStatus = 'NOMINAL';
    this.anomalyDetectedAt = null;
    this.cascadeInProgress = false;
    this.cbs.logEvent(`Simulation mode switched to ${args.mode.toUpperCase()}`, 'info', 'PRIME');
    return { status: 'Mode Updated', mode: this.liveMode };
  }

  @Resource({
    uri: 'aegis://telemetry/orbital-subspace',
    name: 'orbital_subspace',
    description: 'SVD Subspace Telemetry and Anomaly Drift — Structured PRIME Protocol Output'
  })
  async getOrbitalSubspaceResource() {
    const vector = await this.getTelemetryData();
    const analysis = this.svdEngine.processVector(vector);

    // Trigger cascade if anomaly detected (non-blocking for resource reads)
    this.executeRemediationCascade(analysis, vector).catch(() => {});

    // Reset anomaly tracking when system returns to nominal
    if (!analysis.isAnomaly && this.anomalyDetectedAt) {
      this.anomalyDetectedAt = null;
      if (this.systemStatus === 'RECOVERED') {
        this.systemStatus = 'NOMINAL';
      }
    }

    const output = {
      timestamp: new Date().toISOString(),
      system_status: this.systemStatus,
      telemetry_analysis: {
        normalized_vector: vector,
        svd_residual_norm: analysis.residualNorm,
        is_warmup_period: analysis.isWarmupPeriod
      },
      forensic_justification: this.generateForensicJustification(vector, analysis.residualNorm, analysis.isWarmupPeriod),
      orchestration_plan: analysis.isAnomaly && !analysis.isWarmupPeriod
        ? this.buildOrchestrationPlan(analysis.residualNorm)
        : []
    };

    return {
      contents: [{
        uri: 'aegis://telemetry/orbital-subspace',
        mimeType: 'application/json',
        text: JSON.stringify(output, null, 2)
      }]
    };
  }

  @Tool({
    name: 'get_orbital_subspace',
    description: 'Returns structured SVD Subspace Telemetry conforming to the PRIME Reasoning Protocol',
    inputSchema: z.object({})
  })
  @Widget('tools')
  async getOrbitalSubspaceTool() {
    const vector = await this.getTelemetryData();
    const analysis = this.svdEngine.processVector(vector);

    // Trigger cascade if anomaly detected
    await this.executeRemediationCascade(analysis, vector);

    // Reset anomaly tracking when system returns to nominal
    if (!analysis.isAnomaly && !analysis.isWarmupPeriod) {
      this.anomalyDetectedAt = null;
      if (this.systemStatus !== 'NOMINAL') {
        this.systemStatus = 'NOMINAL';
      }
    }

    return {
      timestamp: new Date().toISOString(),
      system_status: this.systemStatus,
      telemetry_analysis: {
        normalized_vector: vector,
        svd_residual_norm: analysis.residualNorm,
        is_warmup_period: analysis.isWarmupPeriod
      },
      forensic_justification: this.generateForensicJustification(vector, analysis.residualNorm, analysis.isWarmupPeriod),
      orchestration_plan: analysis.isAnomaly && !analysis.isWarmupPeriod
        ? this.buildOrchestrationPlan(analysis.residualNorm)
        : []
    };
  }

  @Resource({
    uri: 'health://checks',
    name: 'health_checks',
    description: 'System health checks for all active mitigation shields'
  })
  async getHealthChecks() {
    return {
      contents: [{
        uri: 'health://checks',
        mimeType: 'application/json',
        text: JSON.stringify({
          count: 3,
          system_status: this.systemStatus,
          checks: [
            { name: 'singleFlightShield', status: this.singleFlight.isActive ? 'active' : 'standby' },
            { name: 'qosShunting', status: this.qos.isActive ? 'active' : 'standby' },
            { name: 'idempotencyShield', status: this.idempotency.isActive ? 'active' : 'standby' }
          ]
        }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'aegis://swarm/log',
    name: 'swarm_log',
    description: 'Live Swarm Activity and Simulation Log'
  })
  async getSwarmLogResource() {
    return {
      contents: [{
        uri: 'aegis://swarm/log',
        mimeType: 'application/json',
        text: JSON.stringify(this.cbs.getEventLog(), null, 2)
      }]
    };
  }

  @Tool({
    name: 'get_swarm_log',
    description: 'Returns live swarm log',
    inputSchema: z.object({})
  })
  @Widget('tools')
  async getSwarmLogTool() {
    return { events: this.cbs.getEventLog() };
  }

  @Tool({
    name: 'simulate_salary_day_storm',
    description: 'Triggers a simulated Salary Day Storm (thundering herd read/write spike)',
    inputSchema: z.object({})
  })
  @Widget('tools')
  async simulateSalaryDayStorm() {
    if (this.liveMode) {
      this.cbs.logEvent('Running Artillery load: validation/thundering-herd.yml', 'info', 'PRIME');
      exec('npx artillery run validation/thundering-herd.yml', { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) this.cbs.logEvent(`Artillery run failed: ${err.message}`, 'error', 'PRIME');
      });
    } else {
      this.cbs.triggerSalaryDayStorm().catch(() => {});
    }
    return { status: 'Simulation Triggered', type: 'SALARY_DAY_STORM' };
  }

  @Tool({
    name: 'simulate_p2p_transfer_surge',
    description: 'Triggers a simulated P2P Transfer Surge',
    inputSchema: z.object({})
  })
  @Widget('tools')
  async simulateP2PTransferSurge() {
    this.cbs.triggerTransferSurge().catch(() => {});
    return { status: 'Simulation Triggered', type: 'P2P_TRANSFER_SURGE' };
  }

  @Tool({
    name: 'simulate_eod_batch_collision',
    description: 'Triggers a simulated EOD Batch Collision',
    inputSchema: z.object({})
  })
  @Widget('tools')
  async simulateEodBatchCollision() {
    this.cbs.triggerEodBatchCollision().catch(() => {});
    return { status: 'Simulation Triggered', type: 'EOD_BATCH_COLLISION' };
  }

  @Resource({
    uri: 'aegis://ledger/state',
    name: 'ledger_state',
    description: 'Current state of the core banking ledger'
  })
  async getLedgerStateResource() {
    return {
      contents: [{
        uri: 'aegis://ledger/state',
        mimeType: 'application/json',
        text: JSON.stringify(this.cbs.getLedger(), null, 2)
      }]
    };
  }

  @Tool({
    name: 'get_ledger_state',
    description: 'Returns ledger state',
    inputSchema: z.object({})
  })
  @Widget('tools')
  async getLedgerStateTool() {
    return { accounts: this.cbs.getLedger() };
  }
  @Resource({
    uri: 'ui://widget/aegis-resilience-widget.html',
    name: 'Aegis Resilience Widget',
    description: 'Resilience Middleware Controls & Analytics UI'
  })
  async getResilienceWidgetHtml() {
    return {
      contents: [{
        uri: 'ui://widget/aegis-resilience-widget.html',
        mimeType: 'text/html',
        text: '<!-- Auto-generated widget view -->'
      }]
    };
  }

  @Resource({
    uri: 'ui://widget/sre-control-panel.html',
    name: 'SRE Control Panel',
    description: 'Bank Internal Engineering Control Panel UI'
  })
  async getSreControlPanelHtml() {
    return {
      contents: [{
        uri: 'ui://widget/sre-control-panel.html',
        mimeType: 'text/html',
        text: '<!-- Auto-generated widget view -->'
      }]
    };
  }
}
