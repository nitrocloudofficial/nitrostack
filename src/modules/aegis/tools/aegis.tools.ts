import { ToolDecorator as Tool, ControllerDecorator as Controller, Injectable, Inject, UseGuards, Widget, ExecutionContext, z } from '@nitrostack/core';
import { AegisService } from '../aegis.service.js';
import { ThreatScoreGuard } from '../guards/threat-score.guard.js';

/**
 * Aegis Orchestration Tools
 * 
 * High-level tools that drive the 2-Agent Maker-Checker pipeline:
 * 1. run_threat_analysis — Entry point that runs Agent 1 (Investigator) → Agent 2 (Adjudicator)
 * 2. approve_freeze_report — Called from the dashboard widget to resolve the HITL guard
 */
@Injectable({ deps: [AegisService] })
@Controller('aegis')
export class AegisTools {
  private readonly aegisService: AegisService;

  constructor(@Inject(AegisService) aegisService?: AegisService) {
    this.aegisService = aegisService || new AegisService();
  }

  /**
   * Run Threat Analysis Pipeline
   * 
   * Orchestration entry point. Executes:
   * 1. Agent 1 (Investigator): Synthesizes Intelligence Report from telecom, deepfake, and financial data
   * 2. Agent 2 (Adjudicator): Calculates threat score and determines if HITL is required
   * 
   * Returns the full adjudication result, rendered via the aegis-dashboard widget.
   */
  @Tool({
    name: 'run_threat_analysis',
    description: 'Run the full Aegis threat analysis pipeline. Executes the Investigator agent to synthesize an Intelligence Report, then the Adjudicator agent to score the threat. If threat_score >= 80, triggers the Human-in-the-Loop dashboard for fraud officer review. Use this as the main entry point for Digital Arrest scam detection.',
    inputSchema: z.object({
      case_id: z.string().optional().describe('Optional case identifier for tracking.'),
      priority: z.enum(['NORMAL', 'URGENT', 'CRITICAL']).default('URGENT').describe('Analysis priority level.'),
      scenario: z.string().optional().describe('Scenario risk tier: high, medium, safe or suffix (_safe, _medium).'),
    }),
  })
  @Widget('aegis-dashboard')
  async runThreatAnalysis(
    input: { case_id?: string; priority: string; scenario?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('🛡️ [AEGIS] Initiating threat analysis pipeline...');

    let scenarioSuffix = '';
    if (input.scenario === 'safe' || input.scenario === '_safe') scenarioSuffix = '_safe';
    else if (input.scenario === 'medium' || input.scenario === '_medium') scenarioSuffix = '_medium';

    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('  🛡️  AEGIS PROTOCOL — THREAT ANALYSIS INITIATED');
    console.error(`  Case: ${input.case_id || 'AUTO-GENERATED'}`);
    console.error(`  Priority: ${input.priority}`);
    console.error(`  Scenario: ${input.scenario || 'default (high)'}`);
    console.error('═══════════════════════════════════════════════════════');
    console.error('');

    // ─── PHASE 1: Agent 1 (Investigator) ───
    const intelligenceReport = await this.aegisService.runInvestigation(scenarioSuffix);

    // ─── PHASE 2: Agent 2 (Adjudicator) ───
    const adjudicationResult = this.aegisService.runAdjudication(intelligenceReport);

    return {
      case_id: input.case_id || adjudicationResult.adjudication_id,
      priority: input.priority,
      pipeline_status: 'COMPLETE',
      ...adjudicationResult,
    };
  }

  /**
   * Approve Freeze & Report
   * 
   * Called from the dashboard widget's "FREEZE & REPORT" button.
   * Resolves the pending HITL guard, allowing the dispatch_mha_alert tool to execute.
   */
  @Tool({
    name: 'approve_freeze_report',
    description: 'Approve the freeze and report action from the fraud officer dashboard. This resolves the HITL guard gate, allowing the MHA alert to be dispatched. Should only be called after reviewing the Intelligence Report in the dashboard.',
    inputSchema: z.object({
      approved: z.boolean().describe('Whether the fraud officer approves the freeze action.'),
      officer_id: z.string().optional().describe('ID of the approving fraud officer.'),
      notes: z.string().optional().describe('Optional officer notes.'),
    }),
  })
  async approveFreezeReport(
    input: { approved: boolean; officer_id?: string; notes?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`🔐 [AEGIS] Freeze approval received: ${input.approved}`);

    const wasResolved = this.aegisService.resolveApproval(input.approved);

    if (!wasResolved) {
      ctx.logger.info('⚠️ [AEGIS] No active HITL gate was pending. Proceeding to dispatch MHA alert directly.');
    }

    // If approved, also dispatch the MHA alert
    if (input.approved) {
      const lastAdj = this.aegisService.getLastAdjudication();
      if (lastAdj) {
        // Log the MHA dispatch
        const timestamp = new Date().toISOString();
        const alertId = `MHA-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        console.error('');
        console.error('╔══════════════════════════════════════════════════════════════╗');
        console.error('║        🚨 MHA CYBERCRIME ALERT DISPATCHED 🚨               ║');
        console.error('╠══════════════════════════════════════════════════════════════╣');
        console.error(`║  Alert ID:      ${alertId}`);
        console.error(`║  Timestamp:     ${timestamp}`);
        console.error(`║  Threat Score:  ${lastAdj.threat_score}/100`);
        console.error(`║  Officer:       ${input.officer_id || 'DASHBOARD_OFFICER'}`);
        console.error('╠══════════════════════════════════════════════════════════════╣');
        console.error('║  ✅ Suspect account FROZEN                                  ║');
        console.error('║  ✅ Intelligence Report filed with I4C                      ║');
        console.error('║  ✅ Telecom operator notified for caller blacklist           ║');
        console.error('║  ✅ Victim bank notified for transaction reversal            ║');
        console.error('╚══════════════════════════════════════════════════════════════╝');
        console.error('');

        return {
          status: 'APPROVED_AND_DISPATCHED',
          alert_id: alertId,
          timestamp,
          threat_score: lastAdj.threat_score,
          officer_id: input.officer_id || 'DASHBOARD_OFFICER',
          notes: input.notes || '',
          actions_taken: [
            'HITL_GUARD_RESOLVED',
            'ACCOUNT_FROZEN',
            'MHA_ALERT_DISPATCHED',
            'TELECOM_BLACKLIST_REQUESTED',
            'TRANSACTION_REVERSAL_INITIATED',
          ],
        };
      }
    }

    return {
      status: input.approved ? 'APPROVED' : 'DENIED',
      message: input.approved
        ? 'Freeze and report approved. MHA alert dispatching...'
        : 'Action denied by fraud officer. Case returned to monitoring.',
      officer_id: input.officer_id || 'ANONYMOUS',
      notes: input.notes || '',
      timestamp: new Date().toISOString(),
    };
  }
}
