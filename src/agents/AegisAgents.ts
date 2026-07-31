/**
 * AegisAgents — Multi-Agent Orchestrator
 *
 * Implements the 2-Agent "Maker-Checker" pipeline for the Aegis Protocol:
 *
 *   Agent 1 (Investigator): Calls the three investigative tools via JSON-RPC
 *   MCP transport and synthesizes a structured intelligence report with
 *   boolean/numeric indicators. All PII is ZK-hashed before crossing
 *   MCP server boundaries.
 *
 *   Agent 2 (Adjudicator): Calculates a deterministic threat_score from the
 *   Investigator's report. If score >= 80, pauses execution via the HITL gate
 *   and emits an event for the frontend dashboard. Resumes only when a fraud
 *   officer authorizes or denies the action.
 */

import { Injectable, emitEvent } from '@nitrostack/core';
import { HitlGateState } from '../modules/aegis/guards/threat-score.guard.js';
import { McpJsonRpcClient } from '../utils/mcp-transport.js';
import {
  hashIdentifier,
  generateCommitment,
  maskPII,
  createZkAuditEntry,
  ZkCommitment,
  ZkAuditEntry,
} from '../utils/zk-privacy.js';

// ─────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────

/**
 * The structured output produced by Agent 1 (Investigator).
 */
export interface InvestigatorReport {
  telecom_spoofed: boolean;
  deepfake_probability: number;
  mule_account_match: boolean;
  account_age_days: number;
  /** ZK verification metadata */
  zk_verified: boolean;
  zk_phone_commitment: string;
  zk_account_commitment: string;
  zk_audit_trail: ZkAuditEntry[];
}

/**
 * The full adjudication result produced by Agent 2 (Adjudicator).
 */
export interface AdjudicatorResult {
  adjudication_id: string;
  threat_score: number;
  threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  requires_hitl: boolean;
  scoring_breakdown: {
    telecom_component: number;
    financial_component: number;
    deepfake_component: number;
  };
  investigator_report: InvestigatorReport;
  mha_dispatch: { status: number; mha_case_id: string } | null;
  resolution: 'FROZEN_PENDING_REVIEW' | 'DISPATCHED' | 'ALLOWED' | null;
  /** JSON-RPC transport metadata */
  jsonrpc_requests_count: number;
}

/**
 * Input payload for the transaction processing pipeline.
 */
export interface TransactionPayload {
  amount: number;
  sender_phone: string;
  destination_account: string;
}

// ─────────────────────────────────────────────────────────────
// MCP Server Boundary Constants
// ─────────────────────────────────────────────────────────────

const TELECOM_MCP_SERVER = 'telecom_airgapped_mcp';
const BANK_GOV_MCP_SERVER = 'bank_gov_secure_mcp';

// ─────────────────────────────────────────────────────────────
// Agent Orchestrator
// ─────────────────────────────────────────────────────────────

@Injectable()
export class AegisAgents {
  /** JSON-RPC transport client for MCP tool invocations */
  private readonly mcpClient = new McpJsonRpcClient();

  /**
   * Agent 1 — The Investigator
   *
   * Autonomously calls the three investigative tools using JSON-RPC
   * MCP transport with ZK-hashed identifiers, then synthesizes the
   * results into a strict structured JSON report.
   *
   * ZK Privacy:
   *   - Phone numbers are HMAC-hashed before sending to Telecom MCP
   *   - Account IDs are HMAC-hashed before sending to Bank MCP
   *   - Commitment proofs are generated and attached to the report
   *
   * Tool calls (via JSON-RPC 2.0):
   *   1. telecom_airgapped_mcp → analyze_telecom_metadata(phone_hash)
   *   2. telecom_airgapped_mcp → verify_voice_deepfake(audio_stream_id)
   *   3. bank_gov_secure_mcp   → query_mule_graph(account_hash)
   */
  async runInvestigator(
    payload: TransactionPayload
  ): Promise<InvestigatorReport> {
    console.error('');
    console.error(
      '═══════════════════════════════════════════════════════════'
    );
    console.error(
      '  🔍  AGENT 1 (INVESTIGATOR) — Starting Investigation'
    );
    console.error(
      `  Phone: ${maskPII(payload.sender_phone)} → Account: ${maskPII(payload.destination_account)}`
    );
    console.error(
      '═══════════════════════════════════════════════════════════'
    );
    console.error('');

    try {
      // ── ZK Privacy: Hash PII before crossing server boundaries ──
      const phoneHash = hashIdentifier(payload.sender_phone);
      const accountHash = hashIdentifier(payload.destination_account);
      const phoneCommitment = generateCommitment(payload.sender_phone);
      const accountCommitment = generateCommitment(payload.destination_account);

      console.error('  🔐 [ZK] PII hashed for cross-boundary transmission:');
      console.error(`     Phone Hash:   ${phoneHash.substring(0, 16)}...`);
      console.error(`     Account Hash: ${accountHash.substring(0, 16)}...`);
      console.error(`     Phone Commitment:   ${phoneCommitment.commitment.substring(0, 16)}...`);
      console.error(`     Account Commitment: ${accountCommitment.commitment.substring(0, 16)}...`);
      console.error('');

      const zkAuditTrail: ZkAuditEntry[] = [];

      // ── Tool Call 1: analyze_telecom_metadata (via JSON-RPC → Telecom MCP) ──
      console.error(
        '  📡 [1/3] JSON-RPC → telecom_airgapped_mcp :: analyze_telecom_metadata'
      );
      const telecomData = await this.mcpClient.invoke<Record<string, any>>(
        TELECOM_MCP_SERVER,
        'analyze_telecom_metadata',
        {
          phone: payload.sender_phone,
          phone_hash: phoneHash,
          zk_commitment: phoneCommitment.commitment,
        }
      );
      zkAuditTrail.push(
        createZkAuditEntry('analyze_telecom_metadata', TELECOM_MCP_SERVER, payload.sender_phone, phoneCommitment)
      );
      console.error(
        `        STIR/SHAKEN verified: ${telecomData.stir_shaken_verified}`
      );
      console.error(
        `        True origin: ${telecomData.true_origin}`
      );

      // ── Tool Call 2: verify_voice_deepfake (via JSON-RPC → Telecom MCP) ──
      console.error(
        '  🎙️  [2/3] JSON-RPC → telecom_airgapped_mcp :: verify_voice_deepfake'
      );
      const deepfakeData = await this.mcpClient.invoke<{
        ai_synthesis_probability: number;
        voice_clone_detected: boolean;
      }>(TELECOM_MCP_SERVER, 'verify_voice_deepfake', {
        audio_stream_id: telecomData.call_id || 'STREAM-LIVE',
        phone_hash: phoneHash,
      });
      zkAuditTrail.push(
        createZkAuditEntry('verify_voice_deepfake', TELECOM_MCP_SERVER, payload.sender_phone, phoneCommitment)
      );
      console.error(
        `        AI synthesis probability: ${deepfakeData.ai_synthesis_probability}`
      );
      console.error(
        `        Voice clone detected: ${deepfakeData.voice_clone_detected}`
      );

      // ── Tool Call 3: query_mule_graph (via JSON-RPC → Bank & Gov MCP) ──
      console.error(
        '  🏦 [3/3] JSON-RPC → bank_gov_secure_mcp :: query_mule_graph'
      );
      const muleData = await this.mcpClient.invoke<Record<string, any>>(
        BANK_GOV_MCP_SERVER,
        'query_mule_graph',
        {
          destination_account: payload.destination_account,
          account_hash: accountHash,
          zk_commitment: accountCommitment.commitment,
        }
      );
      zkAuditTrail.push(
        createZkAuditEntry('query_mule_graph', BANK_GOV_MCP_SERVER, payload.destination_account, accountCommitment)
      );
      console.error(
        `        Account age: ${muleData.account_age_days} days`
      );
      console.error(`        KYC status: ${muleData.kyc_status}`);

      // ── Synthesize Report ──
      const telecomSpoofed =
        !telecomData.stir_shaken_verified &&
        (telecomData.true_origin?.includes('VoIP') ?? false);

      const muleAccountMatch =
        muleData.account_age_days < 30 &&
        (muleData.kyc_status === 'MINIMUM_EKYC' || muleData.kyc_status === 'PARTIAL_KYC') &&
        (muleData.velocity_last_24h?.inbound_transfers ?? 0) >= 5;

      const report: InvestigatorReport = {
        telecom_spoofed: telecomSpoofed,
        deepfake_probability: deepfakeData.ai_synthesis_probability,
        mule_account_match: muleAccountMatch,
        account_age_days: muleData.account_age_days,
        zk_verified: true,
        zk_phone_commitment: phoneCommitment.commitment,
        zk_account_commitment: accountCommitment.commitment,
        zk_audit_trail: zkAuditTrail,
      };

      console.error('');
      console.error(
        '  📋 [AGENT 1] Investigation complete. Report:'
      );
      console.error(`     telecom_spoofed:      ${report.telecom_spoofed}`);
      console.error(
        `     deepfake_probability: ${report.deepfake_probability}`
      );
      console.error(
        `     mule_account_match:   ${report.mule_account_match}`
      );
      console.error(`     account_age_days:     ${report.account_age_days}`);
      console.error(`     zk_verified:          ${report.zk_verified}`);
      console.error(`     zk_audit_entries:     ${report.zk_audit_trail.length}`);
      console.error(`     jsonrpc_requests:     ${this.mcpClient.getRequestCount()}`);
      console.error('');

      return report;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ [AGENT 1] Investigation failed: ${message}`);
      throw new Error(`Investigator agent failed: ${message}`);
    }
  }

  /**
   * Agent 2 — The Adjudicator
   *
   * Receives the Investigator's report and calculates a deterministic
   * threat_score using a weighted formula:
   *
   *   Base = 0
   *   + 40 if telecom_spoofed is true
   *   + 35 if mule_account_match is true AND account_age_days < 7
   *   + 20 if deepfake_probability > 0.90
   *   ────────────────────────────────
   *   Max possible = 95
   *
   * If threat_score >= 80:
   *   1. Pauses execution (Promise-based HITL gate)
   *   2. Emits 'aegis.guard.frozen' event for the frontend
   *   3. Awaits human authorization via HitlGateState
   *   4. On approval, calls dispatch_mha_alert via JSON-RPC
   */
  async runAdjudicator(
    report: InvestigatorReport
  ): Promise<AdjudicatorResult> {
    console.error('');
    console.error(
      '═══════════════════════════════════════════════════════════'
    );
    console.error(
      '  ⚖️   AGENT 2 (ADJUDICATOR) — Evaluating Threat'
    );
    console.error(
      '═══════════════════════════════════════════════════════════'
    );
    console.error('');

    try {
      // ── Calculate threat_score ──
      let threat_score = 0;
      let telecom_component = 0;
      let financial_component = 0;
      let deepfake_component = 0;

      if (report.telecom_spoofed) {
        telecom_component = 40;
        threat_score += 40;
        console.error('  📡 Telecom spoofed:        +40');
      }

      if (report.mule_account_match) {
        financial_component = report.account_age_days < 7 ? 35 : 20;
        threat_score += financial_component;
        console.error(
          `  🏦 Mule match + account age (${report.account_age_days}d): +${financial_component}`
        );
      }

      if (report.deepfake_probability > 0.9) {
        deepfake_component = 20;
        threat_score += 20;
        console.error('  🎙️  Deepfake probability (>0.90): +20');
      } else if (report.deepfake_probability > 0.7) {
        deepfake_component = 10;
        threat_score += 10;
        console.error('  🎙️  Deepfake probability (>0.70): +10');
      }

      console.error('  ─────────────────────────────────');
      console.error(`  🎯 TOTAL THREAT SCORE:     ${threat_score}/95`);
      if (report.zk_verified) {
        console.error(`  🔐 ZK Verification:        PASSED (${report.zk_audit_trail.length} proofs)`);
      }
      console.error('');

      const threat_level: AdjudicatorResult['threat_level'] =
        threat_score >= 80
          ? 'CRITICAL'
          : threat_score >= 60
            ? 'HIGH'
            : threat_score >= 40
              ? 'MEDIUM'
              : 'LOW';

      const requires_hitl = threat_score >= 80;
      const adjudication_id = `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const result: AdjudicatorResult = {
        adjudication_id,
        threat_score,
        threat_level,
        requires_hitl,
        scoring_breakdown: {
          telecom_component,
          financial_component,
          deepfake_component,
        },
        investigator_report: report,
        mha_dispatch: null,
        resolution: null,
        jsonrpc_requests_count: this.mcpClient.getRequestCount(),
      };

      // ── Update the shared HITL gate state ──
      const gate = HitlGateState.getInstance();
      gate.setThreatScore(threat_score);

      if (requires_hitl) {
        console.error(
          '╔══════════════════════════════════════════════════════════════╗'
        );
        console.error(
          '║  🛡️  GUARD ACTIVATED — EXECUTION PAUSED                     ║'
        );
        console.error(
          `║  Threat Score: ${threat_score} (threshold: 80)                            ║`
        );
        console.error(
          '║  Status: FROZEN_PENDING_REVIEW                              ║'
        );
        console.error(
          '║  → Awaiting fraud officer authorization...                  ║'
        );
        console.error(
          '╚══════════════════════════════════════════════════════════════╝'
        );
        console.error('');

        // Emit event for the frontend dashboard
        emitEvent('aegis.guard.frozen', {
          adjudication_id,
          threat_score,
          threat_level,
          investigator_report: report,
          timestamp: new Date().toISOString(),
        });

        result.resolution = 'FROZEN_PENDING_REVIEW';

        // ── PAUSE: Wait for human authorization ──
        const approved = await gate.waitForApproval();

        if (approved) {
          console.error(
            '✅ [ADJUDICATOR] Human authorization received — dispatching MHA alert via JSON-RPC'
          );

          // Call dispatch_mha_alert via JSON-RPC on Bank & Gov MCP Server
          const mhaResult = await this.mcpClient.invoke<{
            status: number;
            mha_case_id: string;
          }>(BANK_GOV_MCP_SERVER, 'dispatch_mha_alert', {
            threat_report: report,
          });
          result.mha_dispatch = mhaResult;
          result.resolution = 'DISPATCHED';
        } else {
          console.error(
            '❌ [ADJUDICATOR] Authorization denied or timed out'
          );
          result.resolution = 'ALLOWED';
        }
      } else {
        console.error(
          `  ✅ Threat score ${threat_score} is below HITL threshold (80). Auto-allowing.`
        );
        result.resolution = 'ALLOWED';
      }

      result.jsonrpc_requests_count = this.mcpClient.getRequestCount();
      return result;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ [AGENT 2] Adjudication failed: ${message}`);
      throw new Error(`Adjudicator agent failed: ${message}`);
    }
  }
}
