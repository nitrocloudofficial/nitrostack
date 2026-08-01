/**
 * seed-csv.ts
 *
 * Reads the two project CSV datasets and loads them into PostgreSQL.
 *
 * Tables created / populated:
 *   1. cybercrime_stats  — from Dataset_CyberCrime_Sean.csv
 *   2. transactions      — from MyTransaction.csv
 *   3. fraud_patterns    — derived rows from cybercrime_stats (one per city × crime-type combo with count > 0)
 *
 * Usage:
 *   npx tsx scripts/seed-csv.ts
 *
 * Requires DATABASE_URL in .env (already loaded via dotenv/config).
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db/pool.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

/** Parse a simple CSV line (handles commas inside values only if not quoted). */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Read a CSV file and return { headers, rows }. Skips fully empty rows. */
function readCSV(filePath: string): { headers: string[]; rows: string[][] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

function toFloat(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// 1. Cybercrime stats table
// ---------------------------------------------------------------------------

const CYBERCRIME_COLUMNS = [
  'personal_revenge',
  'anger',
  'fraud',
  'extortion',
  'causing_disrepute',
  'prank',
  'sexual_exploitation',
  'disrupt_public_service',
  'sale_purchase_illegal_drugs',
  'developing_own_business',
  'spreading_piracy',
  'psycho_or_pervert',
  'steal_information',
  'abetment_to_suicide',
  'others',
  'total',
] as const;

async function createCybercrimeStatsTable(): Promise<void> {
  const columnDefs = CYBERCRIME_COLUMNS.map((col) => `${col} NUMERIC(12,1) NOT NULL DEFAULT 0`).join(',\n    ');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cybercrime_stats (
      id    SERIAL PRIMARY KEY,
      city  TEXT NOT NULL,
      ${columnDefs}
    );
  `);

  console.log('  ✅ cybercrime_stats table ready');
}

async function seedCybercrimeStats(): Promise<number> {
  const csvPath = path.join(ROOT, 'Dataset_CyberCrime_Sean.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn(`  ⚠️  ${csvPath} not found — skipping cybercrime_stats`);
    return 0;
  }

  const { rows } = readCSV(csvPath);

  // Filter out summary / total rows and fully empty rows
  const SKIP_PREFIXES = ['total', ''];
  const dataRows = rows.filter((r) => {
    const city = r[0]?.trim().toLowerCase() ?? '';
    return city.length > 0 && !SKIP_PREFIXES.some((p) => p.length > 0 && city.startsWith(p));
  });

  // Truncate old data for idempotent re-runs
  await pool.query('TRUNCATE cybercrime_stats RESTART IDENTITY CASCADE');

  let inserted = 0;
  for (const row of dataRows) {
    const city = row[0]?.trim();
    if (!city) continue;

    const values = CYBERCRIME_COLUMNS.map((_, i) => toFloat(row[i + 1]));

    const placeholders = [city, ...values].map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(
      `INSERT INTO cybercrime_stats (city, ${CYBERCRIME_COLUMNS.join(', ')}) VALUES (${placeholders})`,
      [city, ...values],
    );
    inserted++;
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// 2. Transactions table
// ---------------------------------------------------------------------------

async function createTransactionsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          SERIAL PRIMARY KEY,
      txn_date    TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'Misc',
      ref_no      TEXT,
      value_date  TEXT,
      withdrawal  NUMERIC(12,2) NOT NULL DEFAULT 0,
      deposit     NUMERIC(12,2) NOT NULL DEFAULT 0,
      balance     NUMERIC(14,2) NOT NULL DEFAULT 0
    );
  `);

  console.log('  ✅ transactions table ready');
}

async function seedTransactions(): Promise<number> {
  const csvPath = path.join(ROOT, 'MyTransaction.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn(`  ⚠️  ${csvPath} not found — skipping transactions`);
    return 0;
  }

  const { rows } = readCSV(csvPath);

  // Truncate for idempotent re-runs
  await pool.query('TRUNCATE transactions RESTART IDENTITY CASCADE');

  let inserted = 0;
  for (const row of rows) {
    const txnDate = row[0]?.trim();
    if (!txnDate) continue;

    const category = row[1]?.trim() || 'Misc';
    const refNo = row[2]?.trim() || null;
    const valueDate = row[3]?.trim() || null;
    const withdrawal = toFloat(row[4]);
    const deposit = toFloat(row[5]);
    const balance = toFloat(row[6]);

    await pool.query(
      `INSERT INTO transactions (txn_date, category, ref_no, value_date, withdrawal, deposit, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [txnDate, category, refNo, valueDate, withdrawal, deposit, balance],
    );
    inserted++;
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// 3. Derive fraud_patterns rows from cybercrime stats
//    One row per city × fraud-relevant crime category with count > 0
// ---------------------------------------------------------------------------

/**
 * Maps CSV crime-motive columns to our pipeline fraud_type taxonomy.
 * Only crime types that map to actionable fraud types are included.
 */
const CRIME_TO_FRAUD_TYPE: Record<string, string> = {
  fraud: 'general_fraud',
  extortion: 'extortion',
  steal_information: 'phishing',
  personal_revenge: 'impersonation_scam',
  sexual_exploitation: 'sexual_exploitation',
  spreading_piracy: 'piracy',
};

async function deriveFraudPatterns(): Promise<number> {
  // Only derive if cybercrime_stats has been seeded
  const check = await pool.query('SELECT count(*)::int AS cnt FROM cybercrime_stats');
  if (check.rows[0].cnt === 0) return 0;

  // Don't wipe the existing hand-crafted fraud_patterns rows; append with a
  // distinct transaction_id prefix so we can tell them apart.
  const existing = await pool.query(
    `SELECT count(*)::int AS cnt FROM fraud_patterns WHERE transaction_id LIKE 'CSV-%'`,
  );
  if (existing.rows[0].cnt > 0) {
    // Already derived — delete old CSV-derived rows for idempotent re-run
    await pool.query(`DELETE FROM fraud_patterns WHERE transaction_id LIKE 'CSV-%'`);
  }

  const statsRows = await pool.query('SELECT * FROM cybercrime_stats ORDER BY id');

  let inserted = 0;
  for (const row of statsRows.rows) {
    const city: string = row.city;
    const location = `IN ${city}`;

    for (const [column, fraudType] of Object.entries(CRIME_TO_FRAUD_TYPE)) {
      const count = parseFloat(row[column]) || 0;
      if (count <= 0) continue;

      const txnId = `CSV-${city.replace(/\s+/g, '_').toUpperCase()}-${fraudType.toUpperCase()}-${count}`;

      await pool.query(
        `INSERT INTO fraud_patterns (transaction_id, location, fraud_type, description, amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          txnId,
          location,
          fraudType,
          `Aggregated cybercrime stat: ${count} reported ${fraudType.replace(/_/g, ' ')} cases in ${city}`,
          0, // aggregated stat, no individual amount
        ],
      );
      inserted++;
    }
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('🚀 Fraud Pipeline — CSV Seed Script');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ set' : '❌ MISSING'}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ Set DATABASE_URL in your .env file first.');
    process.exit(1);
  }

  try {
    // --- Cybercrime Stats ---
    console.log('📊 Seeding cybercrime_stats...');
    await createCybercrimeStatsTable();
    const ccRows = await seedCybercrimeStats();
    console.log(`   → ${ccRows} rows inserted\n`);

    // --- Transactions ---
    console.log('💳 Seeding transactions...');
    await createTransactionsTable();
    const txnRows = await seedTransactions();
    console.log(`   → ${txnRows} rows inserted\n`);

    // --- Derive fraud_patterns from cybercrime stats ---
    console.log('🔗 Deriving fraud_patterns from cybercrime stats...');
    const fpRows = await deriveFraudPatterns();
    console.log(`   → ${fpRows} rows inserted\n`);

    // --- Summary ---
    const stats = await Promise.all([
      pool.query('SELECT count(*)::int AS cnt FROM cybercrime_stats'),
      pool.query('SELECT count(*)::int AS cnt FROM transactions'),
      pool.query('SELECT count(*)::int AS cnt FROM fraud_patterns'),
      pool.query('SELECT count(*)::int AS cnt FROM legal_corpus'),
    ]);

    console.log('📋 Final table counts:');
    console.log(`   cybercrime_stats : ${stats[0].rows[0].cnt}`);
    console.log(`   transactions     : ${stats[1].rows[0].cnt}`);
    console.log(`   fraud_patterns   : ${stats[2].rows[0].cnt}`);
    console.log(`   legal_corpus     : ${stats[3].rows[0].cnt}`);
    console.log('\n✅ Seed complete!');
  } catch (error) {
    console.error('\n❌ Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
