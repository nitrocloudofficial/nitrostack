/**
 * Standalone Neo4j Seeder Script
 *
 * Run this script to clear and populate the Neo4j graph database directly
 * from local mock JSON files without booting the full NitroStack framework.
 *
 * Usage:
 *   npx tsx scripts/seed-neo4j.ts
 */
import neo4j from 'neo4j-driver';
import * as fs from 'fs';
import * as path from 'path';

const NEO4J_URI = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? 'aegisdemo123';

async function main() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j at', NEO4J_URI);
  } catch (err: any) {
    console.error('❌ Could not connect to Neo4j database at', NEO4J_URI);
    console.error('   Please ensure Docker container is running:');
    console.error('   docker run -d --name aegis-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/aegisdemo123 neo4j:5');
    process.exit(1);
  }

  const mocksDir = path.join(process.cwd(), 'mocks');
  const files = fs
    .readdirSync(mocksDir)
    .filter((f) => f.startsWith('bank_event') && f.endsWith('.json'));

  const transactions: any[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(mocksDir, file), 'utf-8');
    const parsed = JSON.parse(raw);
    transactions.push(...(Array.isArray(parsed) ? parsed : [parsed]));
  }
  console.log(`📂 Loaded ${transactions.length} mock transaction records across ${files.length} mock file(s)`);

  const session = driver.session();
  try {
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('🧹 Cleared existing Neo4j graph nodes & relationships');

    let seededCount = 0;
    for (const txn of transactions) {
      const destId = typeof txn.destination_account === 'object'
        ? txn.destination_account?.account_id
        : txn.destination_account;

      if (!destId) {
        console.warn(`⚠️ Skipping transaction ${txn.transaction_id ?? '(unknown)'} — invalid destination_account`);
        continue;
      }

      const destHolder = typeof txn.destination_account === 'object'
        ? txn.destination_account?.account_holder
        : txn.destination_details?.beneficiary_name ?? null;

      const destBank = typeof txn.destination_account === 'object'
        ? txn.destination_account?.bank
        : txn.destination_details?.bank ?? null;

      const destAge = typeof txn.destination_account === 'object'
        ? txn.destination_account?.account_age_days
        : txn.destination_details?.account_age_days ?? txn.account_age_days ?? null;

      const destKyc = typeof txn.destination_account === 'object'
        ? txn.destination_account?.kyc_status
        : txn.destination_details?.kyc_status ?? txn.kyc_status ?? null;

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
      seededCount++;
    }

    console.log(`✅ Successfully seeded ${seededCount} transactions into Neo4j`);

    // Live Sanity Check
    const sampleAccount = transactions.find((t) => {
      const id = typeof t.destination_account === 'object' ? t.destination_account?.account_id : t.destination_account;
      return Boolean(id);
    });

    if (sampleAccount) {
      const targetId = typeof sampleAccount.destination_account === 'object'
        ? sampleAccount.destination_account?.account_id
        : sampleAccount.destination_account;

      const check = await session.run(
        `
        MATCH (target:Account {account_id: $id})
        OPTIONAL MATCH (target)-[:USED_DEVICE]->(d:Device)<-[:USED_DEVICE]-(sib:Account)
        WHERE sib.account_id <> target.account_id
        OPTIONAL MATCH (target)-[:PART_OF_CLUSTER]->(c:Cluster)
        RETURN target.account_id AS target_account,
               d.device_id AS shared_device,
               collect(DISTINCT sib.account_id) AS device_siblings,
               c.cluster_id AS rbi_cluster
        `,
        { id: targetId },
      );

      console.log(`\n🔎 Live Graph Sanity Check for Target Account '${targetId}':`);
      console.log(check.records[0]?.toObject() || 'No record returned');
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error('❌ Seeding process failed:', err);
  process.exit(1);
});
