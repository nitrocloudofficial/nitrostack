import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────
// Persistence Configuration
// ─────────────────────────────────────────────────────────────

const STATE_DIR = path.resolve(process.cwd(), '.aegis-state');
const STATE_FILE = path.join(STATE_DIR, 'hitl_gate.json');

interface PersistedGateState {
  threat_score: number;
  has_pending: boolean;
  adjudication_id: string | null;
  timestamp: string;
}

/**
 * Shared state for the HITL approval flow.
 * 
 * Since GuardConstructor expects `new (...args: unknown[]) => Guard`,
 * we use a module-level singleton pattern to share state between
 * the Guard and the AegisService, avoiding DI constructor typing issues.
 * 
 * State is persisted to `.aegis-state/hitl_gate.json` so it survives
 * server restarts. In-flight Promise-based approval gates are
 * memory-only (cannot serialize Promises), but the threat score
 * and pending status are recoverable.
 */
export class HitlGateState {
  private static instance: HitlGateState;

  private pendingApproval: {
    resolve: (approved: boolean) => void;
    reject: (reason: any) => void;
  } | null = null;

  private currentThreatScore: number = 0;
  private currentAdjudicationId: string | null = null;

  private constructor() {
    // Load persisted state on initialization
    this.loadState();
  }

  static getInstance(): HitlGateState {
    if (!HitlGateState.instance) {
      HitlGateState.instance = new HitlGateState();
    }
    return HitlGateState.instance;
  }

  setThreatScore(score: number): void {
    this.currentThreatScore = score;
    this.persistState();
  }

  getThreatScore(): number {
    return this.currentThreatScore;
  }

  setAdjudicationId(id: string): void {
    this.currentAdjudicationId = id;
    this.persistState();
  }

  getAdjudicationId(): string | null {
    return this.currentAdjudicationId;
  }

  async waitForApproval(): Promise<boolean> {
    console.error('⏳ [GUARD] Awaiting human-in-the-loop approval...');

    return new Promise<boolean>((resolve, reject) => {
      this.pendingApproval = { resolve, reject };
      this.persistState();

      // Auto-timeout after 5 minutes for hackathon demo
      setTimeout(() => {
        if (this.pendingApproval) {
          console.error('⏰ [GUARD] HITL approval timed out after 5 minutes');
          this.pendingApproval = null;
          this.clearPersistedState();
          resolve(false);
        }
      }, 5 * 60 * 1000);
    });
  }

  resolveApproval(approved: boolean): boolean {
    if (this.pendingApproval) {
      console.error(`${approved ? '✅' : '❌'} [GUARD] HITL approval ${approved ? 'GRANTED' : 'DENIED'} by fraud officer`);
      this.pendingApproval.resolve(approved);
      this.pendingApproval = null;
      this.clearPersistedState();
      return true;
    }
    console.error('⚠️  [GUARD] No pending approval to resolve');
    return false;
  }

  hasPendingApproval(): boolean {
    return this.pendingApproval !== null;
  }

  // ─────────────────────────────────────────────────────────────
  // File-Based Persistence
  // ─────────────────────────────────────────────────────────────

  /**
   * Persist current gate state to disk.
   * Writes { threat_score, has_pending, adjudication_id, timestamp }
   * to `.aegis-state/hitl_gate.json`.
   */
  private persistState(): void {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }

      const state: PersistedGateState = {
        threat_score: this.currentThreatScore,
        has_pending: this.pendingApproval !== null,
        adjudication_id: this.currentAdjudicationId,
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`⚠️ [GUARD] Failed to persist state: ${message}`);
    }
  }

  /**
   * Load persisted gate state from disk on startup.
   * Recovers threat_score and adjudication_id.
   * Note: Promise-based approval gates cannot be deserialized,
   * so has_pending will be logged but not restored as a live gate.
   */
  private loadState(): void {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const state: PersistedGateState = JSON.parse(raw);

        this.currentThreatScore = state.threat_score;
        this.currentAdjudicationId = state.adjudication_id;

        console.error(`🔄 [GUARD] Loaded persisted state from ${STATE_FILE}`);
        console.error(`   Threat Score: ${state.threat_score}`);
        console.error(`   Had Pending: ${state.has_pending}`);
        console.error(`   Adjudication ID: ${state.adjudication_id || 'N/A'}`);
        console.error(`   Persisted At: ${state.timestamp}`);

        if (state.has_pending) {
          console.error('   ⚠️  Previous session had a pending approval (not restored — Promise cannot be serialized)');
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`⚠️ [GUARD] Failed to load persisted state: ${message}`);
    }
  }

  /**
   * Clear persisted state after resolution or timeout.
   */
  private clearPersistedState(): void {
    try {
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
        console.error('🗑️ [GUARD] Persisted state cleared');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`⚠️ [GUARD] Failed to clear persisted state: ${message}`);
    }
  }
}

/**
 * Threat Score Guard
 * 
 * Applied to the dispatch_mha_alert tool via @UseGuards.
 * Implements the HITL (Human-in-the-Loop) gate:
 * 
 * - If threat_score >= 80: Blocks execution and waits for human approval
 *   via the dashboard widget's "FREEZE & REPORT" button.
 * - If threat_score < 80: Allows execution to proceed automatically.
 * 
 * Uses HitlGateState singleton to read the threat score set by AegisService.
 */
@Injectable()
export class ThreatScoreGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gate = HitlGateState.getInstance();
    const threatScore = gate.getThreatScore();

    context.logger.info(`🛡️ [GUARD] Evaluating threat score: ${threatScore}/100`);

    if (threatScore >= 80) {
      context.logger.info('🚨 [GUARD] CRITICAL threat detected — HITL gate ACTIVATED');
      console.error('');
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  🛡️  THREAT SCORE GUARD — HITL GATE ACTIVATED               ║');
      console.error(`║  Threat Score: ${threatScore}/100 (threshold: 80)                     ║`);
      console.error('║  Status: AWAITING HUMAN APPROVAL                            ║');
      console.error('║  → Fraud Officer must click "FREEZE & REPORT" in dashboard  ║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error('');

      // Wait for human approval from the dashboard widget
      const approved = await gate.waitForApproval();

      if (approved) {
        context.logger.info('✅ [GUARD] Human approval GRANTED — proceeding with MHA dispatch');
        return true;
      } else {
        context.logger.info('❌ [GUARD] Human approval DENIED or TIMED OUT — blocking dispatch');
        return false;
      }
    }

    // Below threshold — allow automatic execution
    context.logger.info('✅ [GUARD] Threat score below threshold — auto-approving');
    return true;
  }
}
