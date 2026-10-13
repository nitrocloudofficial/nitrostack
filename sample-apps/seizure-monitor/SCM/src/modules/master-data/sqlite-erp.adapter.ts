import { Injectable, OnModuleInit } from '@nitrostack/core';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseService } from '../../shared/database.service.js';
import type { PurchaseOrder, GoodsReceipt } from '../../shared/schemas.js';
import { ErpAdapter } from './erp.adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_JSON_PATH = join(__dirname, '..', '..', '..', 'data', 'master-data.json');

const FALLBACK_SEED_POS: PurchaseOrder[] = [
  { poNumber: 'PO-001', vendor: 'Acme Corp',          sku: 'LAP-001', orderedQty: 10,  unitPrice: 999.00,  hsCode: '8471.30' },
  { poNumber: 'PO-002', vendor: 'Tech Supplies Ltd',  sku: 'BAT-002', orderedQty: 50,  unitPrice: 49.99,   hsCode: '8507.60' },
  { poNumber: 'PO-003', vendor: 'Global Parts Co',    sku: 'MON-003', orderedQty: 5,   unitPrice: 450.00,  hsCode: '8528.52' },
  { poNumber: 'PO-004', vendor: 'Acme Corp',          sku: 'LAP-001', orderedQty: 10,  unitPrice: 10.00,   hsCode: '8471.30' },
  { poNumber: 'PO-005', vendor: 'Office Depot',       sku: 'CHR-005', orderedQty: 20,  unitPrice: 199.99,  hsCode: '9401.30' },
  { poNumber: 'PO-006', vendor: 'FastShip Logistics', sku: 'CAB-006', orderedQty: 200, unitPrice: 2.50,    hsCode: '8544.42' },
  { poNumber: 'PO-007', vendor: 'Tech Supplies Ltd',  sku: 'SSD-007', orderedQty: 30,  unitPrice: 89.99,   hsCode: '8471.70' },
  { poNumber: 'PO-008', vendor: 'Global Parts Co',    sku: 'KBD-008', orderedQty: 15,  unitPrice: 75.00,   hsCode: '8471.60' },
  { poNumber: 'PO-009', vendor: 'Acme Corp',          sku: 'MSE-009', orderedQty: 25,  unitPrice: 35.00,   hsCode: '8471.60' },
  { poNumber: 'PO-010', vendor: 'Office Depot',       sku: 'DSK-010', orderedQty: 8,   unitPrice: 299.99,  hsCode: '9403.10' },
];

function getSeedPOs(): PurchaseOrder[] {
  if (existsSync(MASTER_JSON_PATH)) {
    try {
      const content = readFileSync(MASTER_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.purchaseOrders) && parsed.purchaseOrders.length > 0) {
        return parsed.purchaseOrders as PurchaseOrder[];
      }
    } catch {
      console.warn('[SqliteErpAdapter] Could not parse master-data.json, using fallback seed POs.');
    }
  }
  return FALLBACK_SEED_POS;
}

function rowToPO(row: Record<string, unknown>): PurchaseOrder {
  return {
    poNumber:   row['po_number']   as string,
    vendor:     row['vendor']      as string,
    sku:        row['sku']         as string,
    orderedQty: row['ordered_qty'] as number,
    unitPrice:  row['unit_price']  as number,
    hsCode:     row['hs_code']     as string,
  };
}

@Injectable({ deps: [DatabaseService] })
export class SqliteErpAdapter extends ErpAdapter implements OnModuleInit {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const rows = (await this.database.sql(
      'SELECT COUNT(*) AS count FROM purchase_orders',
    )) as { count: number }[];
    if ((rows[0]?.count ?? 0) === 0) {
      await this.seedDatabase();
    }

    await this.seedFxRates();
    await this.seedApprovalThresholds();

    console.error('[SqliteErpAdapter] Ready ✓');
  }

  private async seedDatabase(): Promise<void> {
    const seedPOs = getSeedPOs();
    for (const po of seedPOs) {
      await this.database.sql(
        `INSERT OR IGNORE INTO purchase_orders
           (po_number, vendor, sku, ordered_qty, unit_price, hs_code)
         VALUES (?, ?, ?, ?, ?, ?)`,
        po.poNumber, po.vendor, po.sku, po.orderedQty, po.unitPrice, po.hsCode,
      );
    }
    console.error(`[SqliteErpAdapter] Seeded ${seedPOs.length} purchase orders ✓`);
  }

  private async seedFxRates(): Promise<void> {
    const defaults: Array<[string, number]> = [
      ['USD/USD', 1.0],
      ['EUR/USD', 1.09],
      ['GBP/USD', 1.27],
      ['JPY/USD', 0.0067],
      ['CAD/USD', 0.74],
      ['AUD/USD', 0.65],
      ['INR/USD', 0.012],
      ['CNY/USD', 0.14],
    ];
    for (const [pair, rate] of defaults) {
      await this.database.sql(
        `INSERT OR IGNORE INTO fx_rates (currency_pair, rate, as_of_date) VALUES (?, ?, ?)`,
        pair, rate, new Date().toISOString().slice(0, 10),
      );
    }
  }

  private async seedApprovalThresholds(): Promise<void> {
    const count = (await this.database.sql(
      'SELECT COUNT(*) AS cnt FROM approval_thresholds',
    )) as { cnt: number }[];
    if ((count[0]?.cnt ?? 0) > 0) return;

    const defaults: Array<[number, number | null, string]> = [
      [0,      5_000,   'auto'],
      [5_000,  50_000,  'finance_manager'],
      [50_000, null,    'cfo'],
    ];
    for (const [min, max, role] of defaults) {
      await this.database.sql(
        `INSERT INTO approval_thresholds (min_amount, max_amount, required_approver_role) VALUES (?, ?, ?)`,
        min, max, role,
      );
    }
  }

  async findPO(poNumber: string): Promise<PurchaseOrder | null> {
    const rows = (await this.database.sql(
      'SELECT * FROM purchase_orders WHERE po_number = ?',
      poNumber,
    )) as Record<string, unknown>[];
    return rows.length > 0 ? rowToPO(rows[0]!) : null;
  }

  async findBySku(sku: string): Promise<PurchaseOrder | null> {
    const rows = (await this.database.sql(
      'SELECT * FROM purchase_orders WHERE sku = ? LIMIT 1',
      sku,
    )) as Record<string, unknown>[];
    return rows.length > 0 ? rowToPO(rows[0]!) : null;
  }

  async getAllPOs(): Promise<PurchaseOrder[]> {
    const rows = (await this.database.sql(
      'SELECT * FROM purchase_orders ORDER BY po_number',
    )) as Record<string, unknown>[];
    return rows.map(rowToPO);
  }

  async findGoodsReceipt(poNumber: string, sku: string): Promise<GoodsReceipt | null> {
    const rows = (await this.database.sql(
      `SELECT * FROM goods_receipts WHERE po_number = ? AND sku = ?
       ORDER BY received_date DESC LIMIT 1`,
      poNumber, sku,
    )) as Record<string, unknown>[];
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      id: r['id'] as number,
      poNumber: r['po_number'] as string,
      sku: r['sku'] as string,
      receivedQty: r['received_qty'] as number,
      receivedDate: r['received_date'] as string,
    };
  }

  async findFxRate(currencyPair: string): Promise<number | null> {
    const rows = (await this.database.sql(
      'SELECT rate FROM fx_rates WHERE currency_pair = ?',
      currencyPair,
    )) as { rate: number }[];
    return rows[0]?.rate ?? null;
  }

  async getApprovalThresholds(): Promise<{ min_amount: number; max_amount: number | null; required_approver_role: string }[]> {
    const rows = (await this.database.sql(
      'SELECT min_amount, max_amount, required_approver_role FROM approval_thresholds ORDER BY min_amount ASC'
    )) as { min_amount: number; max_amount: number | null; required_approver_role: string }[];
    return rows;
  }

  async checkDeniedParty(entityName: string): Promise<Array<{ entity_name: string; reason: string }>> {
    const rows = (await this.database.sql(
      'SELECT entity_name, reason FROM denied_parties WHERE LOWER(entity_name) = LOWER(?)',
      entityName
    )) as Array<{ entity_name: string; reason: string }>;
    return rows;
  }

  async recommendHsCode(query: string): Promise<{ hs_code: string; description: string }[]> {
    const rows = (await this.database.sql(
      `SELECT hs_code, description FROM hs_code_reference_fts
       WHERE hs_code_reference_fts MATCH ?
       ORDER BY rank
       LIMIT 5`,
      query,
    )) as { hs_code: string; description: string }[];
    return rows;
  }
}
