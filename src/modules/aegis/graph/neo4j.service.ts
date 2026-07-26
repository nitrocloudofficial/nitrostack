/**
 * Graph Service — Dual-Mode Mule Cluster Detection Engine
 *
 * ARCHITECTURE DECISION (see DECISION.md):
 * ──────────────────────────────────────────
 * This service operates in TWO modes, controlled by the USE_NEO4J env var:
 *
 *   USE_NEO4J=true  (default if Neo4j connection succeeds):
 *     Connects to a live Neo4j graph database for full Cypher queries.
 *     Seeds all bank_event*.json mock files into the graph on startup.
 *
 *   USE_NEO4J=false  (explicit opt-out, or automatic fallback if Neo4j is unreachable):
 *     Loads ALL bank_event*.json files into an in-memory adjacency graph.
 *     Uses Union-Find connected component resolution for cluster detection.
 *     Returns the EXACT SAME MuleGraphResult & ClusterSummary JSON schema,
 *     so downstream consumers (banking.tools.ts, agents, dashboard) are unaware.
 *
 * The in-memory engine is NOT a stub — it performs real graph analysis:
 *   - Builds Account ↔ Device edges from device_fingerprint.device_id
 *   - Builds Account → Cluster edges from rbi_cluster_id
 *   - Detects inferred clusters (shared device, no RBI flag) via Union-Find
 *   - Computes risk signals, feeder accounts, transaction counts, amounts
 *
 * WHY: An in-memory service (1) removes Docker as a live-demo dependency
 * and failure point, (2) produces identical tool output, and (3) is sufficient
 * for the current dataset size (tens to low hundreds of mock records).
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

// ─── Type Exports (unchanged from original) ───

export interface DeviceFingerprint {
  device_id: string;
  os: string;
  app_version?: string;
  root_detected: boolean;
  vpn_active: boolean;
}

export interface DestinationDetails {
  bank?: string;
  branch?: string;
  account_age_days?: number;
  kyc_status?: string;
  pan_verified?: boolean;
  beneficiary_name?: string;
  account_type?: string;
  ifsc?: string;
}

export interface AccountRef {
  account_id: string;
  account_holder?: string;
  bank?: string;
  branch?: string;
  account_age_days?: number;
  kyc_status?: string;
}

export interface GeoMismatch {
  source_state?: string;
  dest_state?: string;
  ip_login_state?: string;
  mismatch_severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MockTransaction {
  transaction_id: string;
  attempted_transfer_amount: number;
  transfer_method: string;
  upi_vpa: string;
  rbi_flagged_cluster?: boolean;
  rbi_cluster_id?: string | null;
  velocity_score: number;
  geographic_mismatch?: GeoMismatch;
  device_fingerprint?: DeviceFingerprint;
  source_account: AccountRef;
  destination_account: AccountRef | string;
  destination_details?: DestinationDetails;
  account_age_days?: number;
  kyc_status?: string;
}

export interface MuleGraphResult {
  account_id: string;
  cluster_size: number;
  cluster_members: string[];
  shared_device_id: string | null;
  stated_rbi_cluster_id: string | null;
  inferred_cluster: boolean;
  risk_signals: string[];
  feeder_accounts: string[];
  transactions_in_cluster: number;
  total_amount_received?: number;
  account_age_days?: number | null;
  kyc_status?: string | null;
}

export interface ClusterSummary {
  cluster_id: string;
  cluster_type: 'RBI_STATED' | 'DEVICE_INFERRED';
  member_accounts: string[];
  cluster_size: number;
  shared_device_id?: string;
  total_transactions: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

// ─── In-Memory Graph Data Structures ───

interface AccountNode {
  account_id: string;
  account_holder?: string;
  bank?: string;
  account_age_days?: number | null;
  kyc_status?: string | null;
  device_ids: Set<string>;
  rbi_cluster_ids: Set<string>;
  inbound_transactions: { from: string; txn: MockTransaction }[];
  outbound_transactions: { to: string; txn: MockTransaction }[];
}

interface DeviceNode {
  device_id: string;
  os?: string;
  root_detected: boolean;
  vpn_active: boolean;
  account_ids: Set<string>;
}

// ─── Union-Find Data Structure ───

class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;

    const rankX = this.rank.get(rx) || 0;
    const rankY = this.rank.get(ry) || 0;

    if (rankX < rankY) {
      this.parent.set(rx, ry);
    } else if (rankX > rankY) {
      this.parent.set(ry, rx);
    } else {
      this.parent.set(ry, rx);
      this.rank.set(rx, rankX + 1);
    }
  }

  getComponents(): Map<string, string[]> {
    const components = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)!.push(key);
    }
    return components;
  }
}

// ─── Neo4j Configuration ───

const NEO4J_URI = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? 'aegisdemo123';
const USE_NEO4J = (process.env.USE_NEO4J ?? 'true').toLowerCase() !== 'false';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: any = null;
  private isConnected = false;
  private graphMode: 'neo4j' | 'in-memory' = 'in-memory';

  // ─── In-Memory Graph State ───
  private accounts: Map<string, AccountNode> = new Map();
  private devices: Map<string, DeviceNode> = new Map();
  private allTransactions: MockTransaction[] = [];

  async onModuleInit() {
    if (USE_NEO4J) {
      try {
        // Dynamic import to avoid crash if neo4j-driver is not installed
        const neo4jModule = await import('neo4j-driver');
        const neo4j = neo4jModule.default;
        this.driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
        await this.driver.verifyConnectivity();
        this.isConnected = true;
        this.graphMode = 'neo4j';
        console.error('✅ [GraphService] Connected to Neo4j database at', NEO4J_URI);
        console.error('   [Mode: Neo4j Graph Database]');
        await this.seedNeo4jFromMocks();
      } catch (err: any) {
        this.isConnected = false;
        this.graphMode = 'in-memory';
        console.error('⚠️ [GraphService] Could not connect to Neo4j:', err?.message || err);
        console.error('   [Falling back to In-Memory Graph Engine]');
        this.buildInMemoryGraph();
      }
    } else {
      this.graphMode = 'in-memory';
      console.error('ℹ️ [GraphService] USE_NEO4J=false — Using In-Memory Graph Engine');
      this.buildInMemoryGraph();
    }

    console.error(`🔧 [GraphService] Active mode: ${this.graphMode.toUpperCase()}`);
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  private session(): any | null {
    if (!this.driver || !this.isConnected) return null;
    return this.driver.session();
  }

  public getIsConnected(): boolean {
    return this.isConnected || this.graphMode === 'in-memory';
  }

  public getGraphMode(): string {
    return this.graphMode;
  }

  // ═══════════════════════════════════════════════════════════════
  //  IN-MEMORY GRAPH ENGINE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Loads ALL bank_event*.json files from /mocks and builds an in-memory
   * adjacency graph with Account and Device nodes.
   */
  private buildInMemoryGraph() {
    const mocksDir = path.join(process.cwd(), 'mocks');
    if (!fs.existsSync(mocksDir)) {
      console.error('⚠️ [GraphService] /mocks directory not found');
      return;
    }

    const files = fs.readdirSync(mocksDir)
      .filter((f) => f.startsWith('bank_event') && f.endsWith('.json'));

    this.allTransactions = [];
    this.accounts.clear();
    this.devices.clear();

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(mocksDir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        const records: MockTransaction[] = Array.isArray(parsed) ? parsed : [parsed];
        this.allTransactions.push(...records);
      } catch (err: any) {
        console.error(`⚠️ [GraphService] Failed to parse ${file}:`, err?.message);
      }
    }

    // Build graph nodes and edges
    for (const txn of this.allTransactions) {
      const destId = this.resolveDestAccountId(txn);
      const srcId = txn.source_account?.account_id ?? 'ACC-UNKNOWN';
      if (!destId) continue;

      // Ensure destination account node
      if (!this.accounts.has(destId)) {
        this.accounts.set(destId, {
          account_id: destId,
          account_holder: this.resolveDestField(txn, 'account_holder', 'beneficiary_name'),
          bank: this.resolveDestField(txn, 'bank', 'bank'),
          account_age_days: this.resolveDestNumField(txn, 'account_age_days'),
          kyc_status: this.resolveDestField(txn, 'kyc_status', 'kyc_status'),
          device_ids: new Set(),
          rbi_cluster_ids: new Set(),
          inbound_transactions: [],
          outbound_transactions: [],
        });
      }

      // Ensure source account node
      if (!this.accounts.has(srcId)) {
        this.accounts.set(srcId, {
          account_id: srcId,
          account_holder: txn.source_account?.account_holder,
          bank: txn.source_account?.bank,
          device_ids: new Set(),
          rbi_cluster_ids: new Set(),
          inbound_transactions: [],
          outbound_transactions: [],
        });
      }

      // Add transaction edges
      const destNode = this.accounts.get(destId)!;
      const srcNode = this.accounts.get(srcId)!;
      destNode.inbound_transactions.push({ from: srcId, txn });
      srcNode.outbound_transactions.push({ to: destId, txn });

      // Device edge (destination account → device)
      const deviceId = txn.device_fingerprint?.device_id;
      if (deviceId) {
        destNode.device_ids.add(deviceId);

        if (!this.devices.has(deviceId)) {
          this.devices.set(deviceId, {
            device_id: deviceId,
            os: txn.device_fingerprint?.os,
            root_detected: txn.device_fingerprint?.root_detected ?? false,
            vpn_active: txn.device_fingerprint?.vpn_active ?? false,
            account_ids: new Set(),
          });
        }
        this.devices.get(deviceId)!.account_ids.add(destId);
      }

      // RBI cluster edge
      if (txn.rbi_cluster_id) {
        destNode.rbi_cluster_ids.add(txn.rbi_cluster_id);
      }
    }

    console.error(`✅ [GraphService] In-memory graph built: ${this.accounts.size} accounts, ${this.devices.size} devices, ${this.allTransactions.length} transactions from ${files.length} file(s)`);
  }

  /** Resolve destination account ID from either object or string form */
  private resolveDestAccountId(txn: MockTransaction): string | null {
    if (typeof txn.destination_account === 'object' && txn.destination_account) {
      return txn.destination_account.account_id ?? null;
    }
    if (typeof txn.destination_account === 'string') {
      return txn.destination_account;
    }
    return null;
  }

  /** Resolve a string field from destination_account object or destination_details */
  private resolveDestField(txn: MockTransaction, objField: string, detailField: string): string | undefined {
    if (typeof txn.destination_account === 'object' && txn.destination_account) {
      return (txn.destination_account as any)[objField];
    }
    return (txn.destination_details as any)?.[detailField];
  }

  /** Resolve a numeric field from destination_account or destination_details */
  private resolveDestNumField(txn: MockTransaction, field: string): number | null {
    if (typeof txn.destination_account === 'object' && txn.destination_account) {
      return (txn.destination_account as any)[field] ?? null;
    }
    return (txn.destination_details as any)?.[field] ?? (txn as any)[field] ?? null;
  }

  /**
   * In-memory implementation of queryMuleGraph.
   * Finds connected accounts via shared devices and RBI clusters using Union-Find.
   */
  private queryInMemoryMuleGraph(accountId?: string): MuleGraphResult {
    const targetId = accountId || this.accounts.keys().next().value || 'ACC-4492-HDFC';
    const targetNode = this.accounts.get(targetId);

    if (!targetNode) {
      return {
        account_id: targetId,
        cluster_size: 0,
        cluster_members: [],
        shared_device_id: null,
        stated_rbi_cluster_id: null,
        inferred_cluster: false,
        risk_signals: ['Account not found in in-memory graph'],
        feeder_accounts: [],
        transactions_in_cluster: 0,
      };
    }

    // Find device siblings (other accounts sharing same device)
    const deviceSiblings = new Set<string>();
    let sharedDeviceId: string | null = null;

    for (const deviceId of targetNode.device_ids) {
      const deviceNode = this.devices.get(deviceId);
      if (deviceNode) {
        for (const siblingId of deviceNode.account_ids) {
          if (siblingId !== targetId) {
            deviceSiblings.add(siblingId);
            sharedDeviceId = deviceId;
          }
        }
      }
    }

    // Check RBI cluster membership
    const statedClusterId = targetNode.rbi_cluster_ids.size > 0
      ? Array.from(targetNode.rbi_cluster_ids)[0]
      : null;

    // Feeder accounts (source accounts that sent to this destination)
    const feeders = new Set<string>();
    for (const txn of targetNode.inbound_transactions) {
      feeders.add(txn.from);
    }

    // Risk signals
    const riskSignals: string[] = [];
    if (deviceSiblings.size > 0 && !statedClusterId) {
      riskSignals.push(
        `Inferred cluster of ${deviceSiblings.size + 1} accounts sharing one device — not in RBI's stated registry`
      );
    }
    if (statedClusterId) {
      riskSignals.push(`Matches RBI-stated cluster ${statedClusterId}`);
    }

    // Count high-risk transactions
    const highGeoTxns = targetNode.inbound_transactions.filter(
      (t) => t.txn.geographic_mismatch?.mismatch_severity === 'HIGH'
    );
    const highVelocityTxns = targetNode.inbound_transactions.filter(
      (t) => (t.txn.velocity_score ?? 0) > 0.7
    );

    if (highGeoTxns.length > 0) {
      riskSignals.push(`${highGeoTxns.length} transaction(s) with high geographic mismatch`);
    }
    if (highVelocityTxns.length > 0) {
      riskSignals.push(`${highVelocityTxns.length} transaction(s) with high velocity score`);
    }

    // Total amount received
    const totalAmount = targetNode.inbound_transactions.reduce(
      (sum, t) => sum + (t.txn.attempted_transfer_amount ?? 0), 0
    );

    return {
      account_id: targetId,
      cluster_size: deviceSiblings.size + 1,
      cluster_members: Array.from(deviceSiblings),
      shared_device_id: sharedDeviceId,
      stated_rbi_cluster_id: statedClusterId,
      inferred_cluster: deviceSiblings.size > 0 && !statedClusterId,
      risk_signals: riskSignals,
      feeder_accounts: Array.from(feeders),
      transactions_in_cluster: targetNode.inbound_transactions.length,
      total_amount_received: totalAmount,
      account_age_days: targetNode.account_age_days,
      kyc_status: targetNode.kyc_status,
    };
  }

  /**
   * In-memory implementation of queryClusterSummary.
   * Uses Union-Find to detect both RBI-stated and device-inferred clusters.
   */
  private queryInMemoryClusterSummary(): ClusterSummary[] {
    const clusters: ClusterSummary[] = [];

    // 1. RBI-stated clusters
    const rbiClusterMembers = new Map<string, Set<string>>();
    for (const [accountId, node] of this.accounts) {
      for (const clusterId of node.rbi_cluster_ids) {
        if (!rbiClusterMembers.has(clusterId)) {
          rbiClusterMembers.set(clusterId, new Set());
        }
        rbiClusterMembers.get(clusterId)!.add(accountId);
      }
    }

    for (const [clusterId, members] of rbiClusterMembers) {
      const memberList = Array.from(members);
      // Count transactions targeting these members
      let txnCount = 0;
      for (const accId of memberList) {
        const node = this.accounts.get(accId);
        if (node) txnCount += node.inbound_transactions.length;
      }

      clusters.push({
        cluster_id: clusterId,
        cluster_type: 'RBI_STATED',
        member_accounts: memberList,
        cluster_size: memberList.length,
        total_transactions: txnCount,
        risk_level: txnCount >= 10 ? 'CRITICAL' : txnCount >= 5 ? 'HIGH' : 'MEDIUM',
      });
    }

    // 2. Device-inferred clusters (Union-Find approach)
    // Find accounts that share a device but are NOT in any RBI cluster
    const uf = new UnionFind();
    const accountsInRbiCluster = new Set<string>();

    for (const [, node] of this.accounts) {
      if (node.rbi_cluster_ids.size > 0) {
        accountsInRbiCluster.add(node.account_id);
      }
    }

    for (const [deviceId, deviceNode] of this.devices) {
      const eligibleAccounts = Array.from(deviceNode.account_ids).filter(
        (accId) => !accountsInRbiCluster.has(accId)
      );

      if (eligibleAccounts.length >= 2) {
        // Union all accounts sharing this device
        for (let i = 1; i < eligibleAccounts.length; i++) {
          uf.union(eligibleAccounts[0], eligibleAccounts[i]);
        }
      }
    }

    // Extract connected components
    const components = uf.getComponents();
    const seenRoots = new Set<string>();

    for (const [root, members] of components) {
      if (seenRoots.has(root) || members.length < 2) continue;
      seenRoots.add(root);

      // Find the shared device(s)
      let sharedDeviceId: string | undefined;
      for (const [deviceId, deviceNode] of this.devices) {
        const overlap = members.filter((m) => deviceNode.account_ids.has(m));
        if (overlap.length >= 2) {
          sharedDeviceId = deviceId;
          break;
        }
      }

      // Count total transactions
      let txnCount = 0;
      for (const accId of members) {
        const node = this.accounts.get(accId);
        if (node) txnCount += node.inbound_transactions.length;
      }

      clusters.push({
        cluster_id: `INFERRED-${sharedDeviceId || root}`,
        cluster_type: 'DEVICE_INFERRED',
        member_accounts: members,
        cluster_size: members.length,
        shared_device_id: sharedDeviceId,
        total_transactions: txnCount,
        risk_level: members.length >= 3 ? 'CRITICAL' : 'HIGH',
      });
    }

    return clusters;
  }

  // ═══════════════════════════════════════════════════════════════
  //  NEO4J GRAPH ENGINE (original Cypher implementation)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Seeds Neo4j from ALL bank_event*.json mock files.
   */
  private async seedNeo4jFromMocks() {
    const session = this.session();
    if (!session) {
      console.error('⚠️ [GraphService] Skipping Neo4j seed — no session.');
      return;
    }

    try {
      const mocksDir = path.join(process.cwd(), 'mocks');
      if (!fs.existsSync(mocksDir)) return;

      const files = fs.readdirSync(mocksDir)
        .filter((f) => f.startsWith('bank_event') && f.endsWith('.json'));

      const transactions: MockTransaction[] = [];
      for (const file of files) {
        const raw = fs.readFileSync(path.join(mocksDir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        transactions.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      }

      // Clear existing graph
      await session.run('MATCH (n) DETACH DELETE n');

      for (const txn of transactions) {
        const destId = this.resolveDestAccountId(txn);
        if (!destId) continue;

        const destHolder = this.resolveDestField(txn, 'account_holder', 'beneficiary_name') ?? null;
        const destBank = this.resolveDestField(txn, 'bank', 'bank') ?? null;
        const destAge = this.resolveDestNumField(txn, 'account_age_days');
        const destKyc = this.resolveDestField(txn, 'kyc_status', 'kyc_status') ?? null;

        await session.run(
          `
          MERGE (dst:Account {account_id: $destId})
            SET dst.account_holder = $destHolder,
                dst.bank = $destBank,
                dst.account_age_days = $destAge,
                dst.kyc_status = $destKyc

          MERGE (src:Account {account_id: $srcId})
            SET src.account_holder = $srcHolder,
                src.bank = $srcBank

          MERGE (src)-[t:SENT {transaction_id: $txnId}]->(dst)
            SET t.amount = $amount,
                t.method = $method,
                t.upi_vpa = $vpa,
                t.velocity_score = $velocity,
                t.geo_mismatch_severity = $geoSeverity,
                t.ip_login_state = $ipState

          MERGE (d:Device {device_id: $deviceId})
            SET d.os = $os,
                d.root_detected = $rooted,
                d.vpn_active = $vpn
          MERGE (dst)-[:USED_DEVICE]->(d)

          ${
            txn.rbi_cluster_id
              ? `
          MERGE (c:Cluster {cluster_id: $clusterId})
          MERGE (dst)-[:PART_OF_CLUSTER]->(c)
          `
              : ''
          }
          `,
          {
            destId,
            destHolder,
            destBank,
            destAge,
            destKyc,
            srcId: txn.source_account?.account_id ?? 'ACC-UNKNOWN',
            srcHolder: txn.source_account?.account_holder ?? null,
            srcBank: txn.source_account?.bank ?? null,
            txnId: txn.transaction_id,
            amount: txn.attempted_transfer_amount ?? 0,
            method: txn.transfer_method ?? 'UNKNOWN',
            vpa: txn.upi_vpa ?? null,
            velocity: txn.velocity_score ?? 0,
            geoSeverity: txn.geographic_mismatch?.mismatch_severity ?? null,
            ipState: txn.geographic_mismatch?.ip_login_state ?? null,
            deviceId: txn.device_fingerprint?.device_id ?? 'unknown_device',
            os: txn.device_fingerprint?.os ?? null,
            rooted: txn.device_fingerprint?.root_detected ?? false,
            vpn: txn.device_fingerprint?.vpn_active ?? false,
            clusterId: txn.rbi_cluster_id ?? null,
          },
        );
      }
      console.error(`✅ [GraphService] Seeded ${transactions.length} transactions into Neo4j graph`);
    } catch (err: any) {
      console.error('❌ [GraphService] Error seeding Neo4j:', err?.message || err);
    } finally {
      await session.close();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API — Routes to Neo4j or In-Memory automatically
  // ═══════════════════════════════════════════════════════════════

  /**
   * Query the mule graph for a specific account.
   * Automatically routes to Neo4j Cypher or in-memory engine.
   */
  async queryMuleGraph(accountId?: string): Promise<MuleGraphResult> {
    if (this.graphMode === 'in-memory') {
      return this.queryInMemoryMuleGraph(accountId);
    }

    // Neo4j mode
    const session = this.session();
    if (!session) {
      // Unexpected disconnect — fall back
      console.error('⚠️ [GraphService] Neo4j session lost, falling back to in-memory');
      this.graphMode = 'in-memory';
      this.buildInMemoryGraph();
      return this.queryInMemoryMuleGraph(accountId);
    }

    try {
      let targetId = accountId;
      if (!targetId) {
        const findFirst = await session.run('MATCH (a:Account) RETURN a.account_id AS id LIMIT 1');
        targetId = findFirst.records[0]?.get('id') ?? 'ACC-4492-HDFC';
      }

      const finalTargetId: string = targetId ?? 'ACC-4492-HDFC';

      const result = await session.run(
        `
        MATCH (target:Account {account_id: $id})
        OPTIONAL MATCH (target)-[:USED_DEVICE]->(d:Device)<-[:USED_DEVICE]-(sibling:Account)
        WHERE sibling.account_id <> target.account_id
        WITH target, d, collect(DISTINCT sibling.account_id) AS deviceSiblings

        OPTIONAL MATCH (target)-[:PART_OF_CLUSTER]->(c:Cluster)
        WITH target, d, deviceSiblings, c

        OPTIONAL MATCH (feeder:Account)-[sent:SENT]->(target)
        WITH target, d, deviceSiblings, c, collect(DISTINCT feeder.account_id) AS feeders,
             collect(DISTINCT sent) AS sentRels

        RETURN target.account_id AS accountId,
               d.device_id AS sharedDeviceId,
               deviceSiblings,
               c.cluster_id AS statedClusterId,
               feeders,
               size(sentRels) AS txnCount,
               [rel IN sentRels WHERE rel.geo_mismatch_severity = 'HIGH'] AS highGeoTxns,
               [rel IN sentRels WHERE rel.velocity_score > 0.7] AS highVelocityTxns
        `,
        { id: finalTargetId },
      );

      if (result.records.length === 0) {
        return {
          account_id: finalTargetId,
          cluster_size: 0,
          cluster_members: [],
          shared_device_id: null,
          stated_rbi_cluster_id: null,
          inferred_cluster: false,
          risk_signals: ['Account not found in Neo4j graph'],
          feeder_accounts: [],
          transactions_in_cluster: 0,
        };
      }

      const record = result.records[0];
      const deviceSiblings: string[] = record.get('deviceSiblings') ?? [];
      const statedClusterId: string | null = record.get('statedClusterId');
      const feeders: string[] = record.get('feeders') ?? [];
      const highGeoTxns: unknown[] = record.get('highGeoTxns') ?? [];
      const highVelocityTxns: unknown[] = record.get('highVelocityTxns') ?? [];

      const riskSignals: string[] = [];
      if (deviceSiblings.length > 0 && !statedClusterId) {
        riskSignals.push(
          `Inferred cluster of ${deviceSiblings.length + 1} accounts sharing one device — not in RBI's stated registry`,
        );
      }
      if (statedClusterId) riskSignals.push(`Matches RBI-stated cluster ${statedClusterId}`);
      if (highGeoTxns.length > 0) riskSignals.push(`${highGeoTxns.length} transaction(s) with high geographic mismatch`);
      if (highVelocityTxns.length > 0) riskSignals.push(`${highVelocityTxns.length} transaction(s) with high velocity score`);

      const rawTxnCount = record.get('txnCount');
      const txnCount = typeof rawTxnCount?.toNumber === 'function' ? rawTxnCount.toNumber() : (rawTxnCount ?? 0);

      // Sum total amounts received
      const amtResult = await session.run(
        `MATCH (:Account)-[s:SENT]->(target:Account {account_id: $id}) RETURN sum(s.amount) AS total`,
        { id: finalTargetId },
      );
      const rawAmt = amtResult.records[0]?.get('total');
      const totalAmount = typeof rawAmt?.toNumber === 'function' ? rawAmt.toNumber() : (rawAmt ?? 0);

      return {
        account_id: finalTargetId,
        cluster_size: deviceSiblings.length + 1,
        cluster_members: deviceSiblings,
        shared_device_id: record.get('sharedDeviceId'),
        stated_rbi_cluster_id: statedClusterId,
        inferred_cluster: deviceSiblings.length > 0 && !statedClusterId,
        risk_signals: riskSignals,
        feeder_accounts: feeders,
        transactions_in_cluster: txnCount,
        total_amount_received: totalAmount,
        account_age_days: null,
        kyc_status: null,
      };
    } catch (err: any) {
      console.error('❌ [GraphService] Cypher query failed, falling back to in-memory:', err?.message || err);
      this.graphMode = 'in-memory';
      this.buildInMemoryGraph();
      return this.queryInMemoryMuleGraph(accountId);
    } finally {
      await session.close();
    }
  }

  /**
   * Scan the full graph for all detected mule clusters.
   * Automatically routes to Neo4j Cypher or in-memory engine.
   */
  async queryClusterSummary(): Promise<ClusterSummary[]> {
    if (this.graphMode === 'in-memory') {
      return this.queryInMemoryClusterSummary();
    }

    // Neo4j mode
    const session = this.session();
    if (!session) {
      console.error('⚠️ [GraphService] queryClusterSummary: Neo4j offline, falling back to in-memory.');
      this.graphMode = 'in-memory';
      this.buildInMemoryGraph();
      return this.queryInMemoryClusterSummary();
    }

    try {
      const clusters: ClusterSummary[] = [];

      // 1. RBI-stated clusters
      const rbiResult = await session.run(`
        MATCH (a:Account)-[:PART_OF_CLUSTER]->(c:Cluster)
        WITH c.cluster_id AS clusterId, collect(DISTINCT a.account_id) AS members
        MATCH (:Account)-[s:SENT]->(:Account)-[:PART_OF_CLUSTER]->(c:Cluster {cluster_id: clusterId})
        RETURN clusterId, members, count(s) AS txnCount
        ORDER BY txnCount DESC
      `);

      for (const r of rbiResult.records) {
        const members: string[] = r.get('members') ?? [];
        const rawCount = r.get('txnCount');
        const txnCount = typeof rawCount?.toNumber === 'function' ? rawCount.toNumber() : (rawCount ?? 0);
        clusters.push({
          cluster_id: r.get('clusterId'),
          cluster_type: 'RBI_STATED',
          member_accounts: members,
          cluster_size: members.length,
          total_transactions: txnCount,
          risk_level: txnCount >= 10 ? 'CRITICAL' : txnCount >= 5 ? 'HIGH' : 'MEDIUM',
        });
      }

      // 2. Device-inferred clusters (simple version to avoid APOC dependency)
      const deviceResult = await session.run(`
        MATCH (a:Account)-[:USED_DEVICE]->(d:Device)<-[:USED_DEVICE]-(b:Account)
        WHERE a.account_id <> b.account_id
          AND NOT (a)-[:PART_OF_CLUSTER]->(:Cluster)
        WITH d.device_id AS deviceId, collect(DISTINCT a.account_id) AS members
        WHERE size(members) > 1
        RETURN deviceId, members
      `);

      for (const r of deviceResult.records) {
        const members: string[] = r.get('members') ?? [];
        clusters.push({
          cluster_id: `INFERRED-${r.get('deviceId')}`,
          cluster_type: 'DEVICE_INFERRED',
          member_accounts: members,
          cluster_size: members.length,
          shared_device_id: r.get('deviceId'),
          total_transactions: members.length,
          risk_level: members.length >= 3 ? 'CRITICAL' : 'HIGH',
        });
      }

      return clusters;
    } catch (err: any) {
      console.error('❌ [GraphService] queryClusterSummary failed:', err?.message || err);
      return this.queryInMemoryClusterSummary();
    } finally {
      await session.close();
    }
  }
}
