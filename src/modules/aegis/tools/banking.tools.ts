import { ToolDecorator as Tool, ControllerDecorator as Controller, Cache, UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { ThreatScoreGuard } from '../guards/threat-score.guard.js';
import { Neo4jService, ClusterSummary } from '../graph/neo4j.service.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Banking Analysis Tools
 * 
 * Zero-Knowledge nodes for mule account graph analysis and MHA alert dispatch.
 * Queries live Neo4j graph database for mule network patterns, with fallback to local JSON.
 */
@Controller('banking')
export class BankingTools {
  constructor(private readonly neo4jService?: Neo4jService) {}

  /**
   * Query Mule Account Graph
   * 
   * Queries Neo4j Cypher graph for connected mule networks, shared device fingerprints,
   * RBI cluster IDs, and velocity anomalies. Fallbacks to mock JSON if offline.
   */
  @Tool({
    name: 'query_mule_graph',
    description: 'Query the financial mule account network graph for suspicious transaction patterns and device clusters. Returns account metadata, KYC status, transaction velocity, shared device fingerprints, and RBI cluster flags.',
    inputSchema: z.object({
      transaction_id: z.string().optional().describe('Optional transaction ID to investigate. Defaults to latest flagged event.'),
      target_account: z.string().optional().describe('Destination account ID to investigate in Neo4j graph.'),
    }),
  })
  @Cache({ ttl: 30 })
  async queryMuleGraph(
    input: { transaction_id?: string; target_account?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('🏦 [INVESTIGATOR] Querying mule account network graph...');

    if (this.neo4jService) {
      const graphResult = await this.neo4jService.queryMuleGraph(input.target_account);
      ctx.logger.info(`🚨 Neo4j Graph Query complete for account ${graphResult.account_id}: ${graphResult.risk_signals.length} risk signal(s)`);
      return {
        ...graphResult,
        analysis_timestamp: new Date().toISOString(),
      };
    }

    const mockPath = path.resolve(process.cwd(), 'mocks', 'bank_event.json');
    const raw = fs.readFileSync(mockPath, 'utf-8');
    const data = JSON.parse(raw);
    const bankEvent = Array.isArray(data) ? data[Math.floor(Math.random() * data.length)] : data;

    // Annotate with mule indicators
    const muleIndicators: string[] = [];
    if (bankEvent.account_age_days < 30) {
      muleIndicators.push('NEW_ACCOUNT_SUSPICIOUS');
    }
    if (bankEvent.kyc_status === 'MINIMUM_EKYC') {
      muleIndicators.push('MINIMAL_KYC_VERIFICATION');
    }
    if (bankEvent.velocity_last_24h?.inbound_transfers > 10) {
      muleIndicators.push('HIGH_INBOUND_VELOCITY');
    }
    if (bankEvent.velocity_last_24h?.outbound_transfers > 10) {
      muleIndicators.push('HIGH_OUTBOUND_VELOCITY');
    }
    if (bankEvent.velocity_last_24h?.current_balance === 0) {
      muleIndicators.push('ZERO_BALANCE_PASSTHROUGH');
    }
    if (bankEvent.attempted_transfer_amount > 100000) {
      muleIndicators.push('HIGH_VALUE_TRANSFER');
    }

    ctx.logger.info(`🚨 Detected ${muleIndicators.length} mule indicators (Mock Mode)`);

    return {
      ...bankEvent,
      analysis_timestamp: new Date().toISOString(),
      mule_indicators: muleIndicators,
      mule_indicator_count: muleIndicators.length,
      mule_probability: muleIndicators.length >= 4 ? 'CONFIRMED_MULE' : muleIndicators.length >= 2 ? 'PROBABLE_MULE' : 'LOW_RISK',
    };
  }

  /**
   * Query Full Cluster Map
   *
   * Returns a full graph-wide summary of all detected mule account clusters —
   * both RBI-stated clusters and device-inferred clusters — directly from Neo4j.
   * Use this to get a bird's-eye view of the mule network topology.
   */
  @Tool({
    name: 'query_cluster_map',
    description: 'Scan the entire Neo4j mule account graph and return all detected clusters — both RBI-stated clusters and device-fingerprint inferred clusters. Shows cluster sizes, member accounts, and risk levels. Use this for a network-wide threat map.',
    inputSchema: z.object({}),
  })
  @Cache({ ttl: 60 })
  async queryClusterMap(
    _input: Record<string, never>,
    ctx: ExecutionContext
  ): Promise<{ clusters: ClusterSummary[]; total_clusters: number; neo4j_active: boolean }> {
    ctx.logger.info('🕸️ [INVESTIGATOR] Scanning full mule cluster topology from Neo4j...');

    if (this.neo4jService) {
      const clusters = await this.neo4jService.queryClusterSummary();
      ctx.logger.info(`🚨 Found ${clusters.length} cluster(s) in the graph`);
      return {
        clusters,
        total_clusters: clusters.length,
        neo4j_active: this.neo4jService.getIsConnected(),
      };
    }

    ctx.logger.info('⚠️ Neo4j offline — cluster map unavailable in mock fallback mode');
    return {
      clusters: [
        {
          cluster_id: 'RBI-CLU-2026-4492',
          cluster_type: 'RBI_STATED',
          member_accounts: ['ACC-4492-HDFC'],
          cluster_size: 1,
          total_transactions: 30,
          risk_level: 'CRITICAL',
        },
        {
          cluster_id: 'INFERRED-DEV-SHARED-CLUSTER-X7',
          cluster_type: 'DEVICE_INFERRED',
          member_accounts: ['ACC-MULE-A-HDFC', 'ACC-MULE-B-YES', 'ACC-MULE-C-PNB'],
          cluster_size: 3,
          shared_device_id: 'DEV-SHARED-CLUSTER-X7',
          total_transactions: 3,
          risk_level: 'CRITICAL',
        },
      ],
      total_clusters: 2,
      neo4j_active: false,
    };
  }

  /**
   * Dispatch MHA Alert
   * 
   * Generates and dispatches an alert to the Ministry of Home Affairs (MHA)
   * Cybercrime Coordination Centre (I4C).
   */
  @Tool({
    name: 'dispatch_mha_alert',
    description: 'Dispatch an urgent alert to the Ministry of Home Affairs (MHA) Cybercrime Coordination Centre. Requires an approved Intelligence Report with a threat score. This action freezes the suspect account and files a formal report.',
    inputSchema: z.object({
      intelligence_report: z.any().describe('The full Intelligence Report JSON from the investigation pipeline.'),
      threat_score: z.number().min(0).max(100).describe('Calculated threat score (0-100).'),
      officer_id: z.string().optional().describe('ID of the approving fraud officer.'),
    }),
  })
  @UseGuards(ThreatScoreGuard)
  async dispatchMhaAlert(
    input: { intelligence_report: any; threat_score: number; officer_id?: string },
    ctx: ExecutionContext
  ) {
    const timestamp = new Date().toISOString();
    const alertId = `MHA-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    console.error('');
    console.error('╔══════════════════════════════════════════════════════════════╗');
    console.error('║        🚨 MHA CYBERCRIME ALERT DISPATCHED 🚨               ║');
    console.error('╠══════════════════════════════════════════════════════════════╣');
    console.error(`║  Alert ID:      ${alertId}`);
    console.error(`║  Timestamp:     ${timestamp}`);
    console.error(`║  Threat Score:  ${input.threat_score}/100`);
    console.error(`║  Officer ID:    ${input.officer_id || 'SYSTEM_AUTO'}`);
    console.error(`║  Status:        DISPATCHED_TO_I4C`);
    console.error('╠══════════════════════════════════════════════════════════════╣');
    console.error('║  Actions Taken:                                             ║');
    console.error('║  ✅ Suspect account FROZEN                                  ║');
    console.error('║  ✅ Intelligence Report filed with I4C                      ║');
    console.error('║  ✅ Telecom operator notified for caller blacklist           ║');
    console.error('║  ✅ Victim bank notified for transaction reversal            ║');
    console.error('╚══════════════════════════════════════════════════════════════╝');
    console.error('');

    ctx.logger.info(`✅ MHA Alert ${alertId} dispatched successfully`);

    return {
      alert_id: alertId,
      status: 'DISPATCHED',
      timestamp,
      threat_score: input.threat_score,
      officer_id: input.officer_id || 'SYSTEM_AUTO',
      actions_taken: [
        'ACCOUNT_FROZEN',
        'INTELLIGENCE_REPORT_FILED',
        'TELECOM_BLACKLIST_REQUESTED',
        'TRANSACTION_REVERSAL_INITIATED',
      ],
      destination: 'MHA_I4C_CYBERCRIME_COORDINATION_CENTRE',
      acknowledgement: 'Alert received and queued for immediate review',
    };
  }
}
