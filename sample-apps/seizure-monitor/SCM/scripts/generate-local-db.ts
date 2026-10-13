#!/usr/bin/env node
/**
 * scripts/generate-local-db.ts
 *
 * Generates a local `data/ale-scm.db` SQLite file containing the same
 * schema and seed data as the SQLite Cloud deployment.
 *
 * Useful for:
 *  - Offline development / testing without a cloud connection
 *  - Uploading the .db file to a new SQLite Cloud project via the dashboard
 *  - Local inspection with DB Browser for SQLite or sqlite3 CLI
 *
 * Usage:
 *   npx tsx scripts/generate-local-db.ts
 *
 * Output: data/ale-scm.db
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '..', 'data');
const DB_PATH   = join(DATA_DIR, 'ale-scm.db');
const MASTER_JSON_PATH = join(DATA_DIR, 'master-data.json');

const FALLBACK_SEED_POS = [
  { poNumber: 'PO-001', vendor: 'Acme Corp',          sku: 'LAP-001', orderedQty: 10,  unitPrice: 999.00,  hsCode: '8471.30' },
  { poNumber: 'PO-002', vendor: 'Tech Supplies Ltd',  sku: 'BAT-002', orderedQty: 50,  unitPrice: 49.99,   hsCode: '8507.60' },
  { poNumber: 'PO-003', vendor: 'Global Parts Co',    sku: 'MON-003', orderedQty: 5,   unitPrice: 450.00,  hsCode: '8528.52' },
  { poNumber: 'PO-004', vendor: 'Acme Corp',          sku: 'LAP-001', orderedQty: 10,  unitPrice: 10.00,   hsCode: '8471.30' }, // mismatch target
  { poNumber: 'PO-005', vendor: 'Office Depot',       sku: 'CHR-005', orderedQty: 20,  unitPrice: 199.99,  hsCode: '9401.30' },
  { poNumber: 'PO-006', vendor: 'FastShip Logistics', sku: 'CAB-006', orderedQty: 200, unitPrice: 2.50,    hsCode: '8544.42' },
  { poNumber: 'PO-007', vendor: 'Tech Supplies Ltd',  sku: 'SSD-007', orderedQty: 30,  unitPrice: 89.99,   hsCode: '8471.70' },
  { poNumber: 'PO-008', vendor: 'Global Parts Co',    sku: 'KBD-008', orderedQty: 15,  unitPrice: 75.00,   hsCode: '8471.60' },
  { poNumber: 'PO-009', vendor: 'Acme Corp',          sku: 'MSE-009', orderedQty: 25,  unitPrice: 35.00,   hsCode: '8471.60' },
  { poNumber: 'PO-010', vendor: 'Office Depot',       sku: 'DSK-010', orderedQty: 8,   unitPrice: 299.99,  hsCode: '9403.10' },
];

function getSeedPOs() {
  if (existsSync(MASTER_JSON_PATH)) {
    try {
      const content = readFileSync(MASTER_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.purchaseOrders) && parsed.purchaseOrders.length > 0) {
        return parsed.purchaseOrders;
      }
    } catch (err) {
      console.warn('⚠️ Could not parse master-data.json, using fallback seed POs.');
    }
  }
  return FALLBACK_SEED_POS;
}


function main() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  console.log(`📁  Writing to ${DB_PATH}`);
  const db = new DatabaseSync(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      po_number   TEXT PRIMARY KEY,
      vendor      TEXT NOT NULL,
      sku         TEXT NOT NULL,
      ordered_qty INTEGER NOT NULL,
      unit_price  REAL NOT NULL,
      hs_code     TEXT NOT NULL
    )
  `);

  const stmt = db.prepare(
    `INSERT OR REPLACE INTO purchase_orders
       (po_number, vendor, sku, ordered_qty, unit_price, hs_code)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const seedPOs = getSeedPOs();
  console.log(`🌱  Seeding ${seedPOs.length} purchase orders into SQLite DB…`);
  for (const po of seedPOs) {
    stmt.run(po.poNumber, po.vendor, po.sku, po.orderedQty, po.unitPrice, po.hsCode);
  }


  const count = (db.prepare('SELECT COUNT(*) AS c FROM purchase_orders').get() as { c: number }).c;
  db.close();

  console.log(`\n✅  ${DB_PATH} created with ${count} rows.`);
  console.log('');
  console.log('  ➜  To upload to SQLite Cloud:');
  console.log('     1. Open https://dashboard.sqlitecloud.io');
  console.log('     2. Select your project → Databases → Upload .db file');
  console.log('     3. Name the database  ale-scm.sqlite');
  console.log('     4. Copy the connection string into SQLITECLOUD_URL in your .env');
}

main();
