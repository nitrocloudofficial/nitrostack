import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  Widget,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { AegisAgents, TransactionPayload } from './AegisAgents.js';
import { HitlGateState } from '../modules/aegis/guards/threat-score.guard.js';

@Controller('aegis_orchestrator')
export class AegisOrchestratorTools {
  constructor(private readonly aegisAgents: AegisAgents) {}

  /**
   * Aegis Run Threat Analysis
   *
   * Real MCP tool wrapping the 2-Agent pipeline in AegisAgents.ts:
   * 1. Agent 1 (Investigator): Executes telecom, deepfake, and mule graph tools via JSON-RPC + ZK hashing
   * 2. Agent 2 (Adjudicator): Calculates weighted threat score and enforces HITL gate if score >= 80
   */
  @Tool({
    name: 'aegis_run_threat_analysis',
    description:
      'Run the full Aegis 2-agent threat analysis pipeline (Investigator + Adjudicator) using ZK privacy and JSON-RPC transport.',
    inputSchema: z.object({
      sender_phone: z.string().optional().describe('Sender phone number.'),
      destination_account: z.string().optional().describe('Destination bank account.'),
      amount: z.number().optional().describe('Transaction amount in INR.'),
      case_id: z.string().optional().describe('Optional case tracking ID.'),
      priority: z.string().optional().describe('Priority level.'),
      scenario: z.string().optional().describe('Preset scenario: safe, medium, high/critical.'),
    }),
  })
  @Widget('aegis-dashboard')
  async runThreatAnalysis(
    input: {
      sender_phone?: string;
      destination_account?: string;
      amount?: number;
      case_id?: string;
      priority?: string;
      scenario?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('🛡️ [AegisOrchestratorTools] Executing aegis_run_threat_analysis tool...');

    let sender_phone = input.sender_phone;
    let destination_account = input.destination_account;
    let amount = input.amount;

    if (input.scenario === 'safe' || input.scenario === '_safe') {
      sender_phone = sender_phone || '+91-9871122334';
      destination_account = destination_account || 'ICICI-UNI-5544-1100';
      amount = amount ?? 250000;
    } else if (input.scenario === 'medium' || input.scenario === '_medium') {
      sender_phone = sender_phone || '+91-9821098765';
      destination_account = destination_account || 'PNB-MULE-8812-3301';
      amount = amount ?? 1500000;
    } else {
      sender_phone = sender_phone || '+91-9876543210';
      destination_account = destination_account || 'SBI-MULE-4482-9901';
      amount = amount ?? 5000000;
    }

    const payload: TransactionPayload = {
      sender_phone,
      destination_account,
      amount,
    };

    // 1. Run Agent 1 (Investigator)
    const investigatorReport = await this.aegisAgents.runInvestigator(payload);

    // 2. Run Agent 2 (Adjudicator)
    const adjudicationResult = await this.aegisAgents.runAdjudicator(investigatorReport);

    return {
      transaction_id: input.case_id || adjudicationResult.adjudication_id,
      case_id: input.case_id || adjudicationResult.adjudication_id,
      ...adjudicationResult,
    };
  }

  /**
   * Aegis Approve Freeze & Report
   *
   * Resolves the pending HITL gate in HitlGateState when officer clicks Freeze in dashboard.
   */
  @Tool({
    name: 'aegis_approve_freeze_report',
    description:
      'Approve or deny the account freeze action for the active HITL gate in AegisAgents.',
    inputSchema: z.object({
      approved: z.boolean().describe('Whether the fraud officer approves the freeze action.'),
      officer_id: z.string().optional().describe('ID of approving fraud officer.'),
      notes: z.string().optional().describe('Optional officer notes.'),
    }),
  })
  async approveFreezeReport(
    input: { approved: boolean; officer_id?: string; notes?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`🔐 [AegisOrchestratorTools] aegis_approve_freeze_report called: approved=${input.approved}`);
    const gate = HitlGateState.getInstance();
    const wasResolved = gate.resolveApproval(input.approved);

    return {
      status: input.approved ? 'APPROVED' : 'DENIED',
      was_resolved: wasResolved,
      officer_id: input.officer_id || 'AZ-99',
      notes: input.notes || '',
      timestamp: new Date().toISOString(),
    };
  }
}
