import { Injectable, OnModuleInit } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';

/**
 * MigrationService — runs numbered, idempotent DDL migrations on startup.
 *
 * Every migration is recorded in the `schema_migrations` table so it only
 * ever runs once, even across restarts. Migrations are applied in version order.
 *
 * To add a new migration: append an entry to the MIGRATIONS array.
 * Never mutate or re-number existing entries.
 */

interface Migration {
  version: number;
  description: string;
  up: string; // DDL to execute
}

const MIGRATIONS: Migration[] = [
  // ── v1: Core tables (existing purchase_orders already seeded) ─────────────
  {
    version: 1,
    description: 'Harden purchase_orders, add invoices + invoice_line_items',
    up: `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        po_number   TEXT PRIMARY KEY,
        vendor      TEXT NOT NULL,
        sku         TEXT NOT NULL,
        ordered_qty INTEGER NOT NULL,
        unit_price  REAL NOT NULL,
        hs_code     TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS invoices (
        invoice_number TEXT PRIMARY KEY,
        po_number      TEXT REFERENCES purchase_orders(po_number),
        vendor         TEXT NOT NULL,
        invoice_date   TEXT,
        total_amount   REAL,
        status         TEXT DEFAULT 'pending',
        workflow_id    TEXT,
        created_at     TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS invoice_line_items (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT REFERENCES invoices(invoice_number),
        sku            TEXT,
        description    TEXT,
        quantity       INTEGER,
        unit_price     REAL,
        total          REAL
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
    `,
  },

  // ── v2: Exceptions table (replaces exceptions.json file) ──────────────────
  {
    version: 2,
    description: 'Add exceptions table with lifecycle status',
    up: `
      CREATE TABLE IF NOT EXISTS exceptions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id    TEXT,
        invoice_number TEXT REFERENCES invoices(invoice_number),
        reason         TEXT NOT NULL,
        discrepancies  TEXT DEFAULT '[]',
        status         TEXT DEFAULT 'flagged'
                         CHECK(status IN ('flagged','under_review','resolved','dismissed')),
        created_at     TEXT DEFAULT (datetime('now')),
        resolved_at    TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_exceptions_workflow ON exceptions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_exceptions_status   ON exceptions(status);
    `,
  },

  // ── v3: Audit log (append-only — never UPDATE or DELETE rows) ─────────────
  {
    version: 3,
    description: 'Add append-only audit_log table',
    up: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id  TEXT,
        tool_name    TEXT NOT NULL,
        input_hash   TEXT,
        output_hash  TEXT,
        actor        TEXT DEFAULT 'system',
        status       TEXT DEFAULT 'success'
                       CHECK(status IN ('success','error')),
        error_msg    TEXT,
        duration_ms  INTEGER,
        created_at   TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_workflow ON audit_log(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_audit_tool     ON audit_log(tool_name);
      CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log(created_at);
    `,
  },

  // ── v4: Analytics summary table ───────────────────────────────────────────
  {
    version: 4,
    description: 'Add analytics_daily_summary table',
    up: `
      CREATE TABLE IF NOT EXISTS analytics_daily_summary (
        date                  TEXT PRIMARY KEY,
        invoice_count         INTEGER DEFAULT 0,
        exception_count       INTEGER DEFAULT 0,
        avg_cycle_time_seconds REAL    DEFAULT 0,
        stp_rate              REAL    DEFAULT 0,
        auto_approved_count   INTEGER DEFAULT 0,
        flagged_count         INTEGER DEFAULT 0,
        exception_status_count INTEGER DEFAULT 0,
        refreshed_at          TEXT
      );
    `,
  },

  // ── v5: HS code reference (FTS5 for keyword search) ───────────────────────
  {
    version: 5,
    description: 'Add hs_code_reference table and FTS5 virtual table',
    up: `
      CREATE TABLE IF NOT EXISTS hs_code_reference (
        hs_code     TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        keywords    TEXT DEFAULT ''
      );

      -- Seed common HS codes so recommend_hs_code has a real table to query
      INSERT OR IGNORE INTO hs_code_reference (hs_code, description, keywords) VALUES
        ('8471.30', 'Portable automatic data processing machines (laptops/notebooks)', 'laptop notebook computer portable computing'),
        ('8507.60', 'Lithium-ion accumulators (batteries)', 'battery batteries lithium ion accumulator'),
        ('8528.52', 'Monitors/displays (LCD, LED)', 'monitor display screen lcd led'),
        ('9401.30', 'Swivel seats with variable height adjustment (office chairs)', 'chair seat office swivel ergonomic'),
        ('8544.42', 'Electric conductors, voltage <= 80V (cables/wires)', 'cable wire conductor electrical'),
        ('8471.70', 'Storage units (SSD, HDD)', 'storage drive ssd hdd disk'),
        ('8471.60', 'Input/output units (keyboards, mice)', 'keyboard mouse input output peripheral'),
        ('9403.10', 'Metal furniture for offices (desks)', 'desk furniture office metal'),
        ('8518.30', 'Headphones and earphones', 'headphone earphone audio headset'),
        ('8525.80', 'Television cameras, webcams', 'camera webcam video capture'),
        ('8471.41', 'Data processing machines comprising CPU, input/output units', 'desktop computer workstation tower'),
        ('4820.10', 'Registers, account books, notebooks (paper stationery)', 'notebook paper stationery register'),
        ('3926.90', 'Other articles of plastics', 'plastic parts components'),
        ('8536.50', 'Switches for electrical circuits', 'switch circuit electrical breaker'),
        ('8523.51', 'Solid-state non-volatile storage devices (USB flash drives)', 'usb flash drive thumb pendrive');

      CREATE VIRTUAL TABLE IF NOT EXISTS hs_code_fts
        USING fts5(hs_code, description, keywords, content='hs_code_reference', content_rowid='rowid');

      INSERT OR IGNORE INTO hs_code_fts(hs_code_fts) VALUES('rebuild');
    `,
  },

  // ── v7: Compliance / Denied Parties table ──────────────────────────────────
  {
    version: 7,
    description: 'Add denied_parties table and seed data',
    up: `
      CREATE TABLE IF NOT EXISTS denied_parties (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT NOT NULL UNIQUE,
        country     TEXT,
        reason      TEXT
      );

      INSERT OR IGNORE INTO denied_parties (entity_name, country, reason) VALUES
        ('Global Blacklist Corp', 'NK', 'Sanctions violation'),
        ('Sanctioned Industries LLC', 'RU', 'Embargoed entity'),
        ('Denied Vendor Ltd', 'IR', 'Financial sanctions');
      
      CREATE INDEX IF NOT EXISTS idx_denied_parties_name ON denied_parties(entity_name);
    `,
  },

  // ── v6: AP Invoice Automation tables ─────────────────────────────────────
  {
    version: 6,
    description: 'Add goods_receipts, fx_rates, and approval_thresholds tables',
    up: `
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number     TEXT REFERENCES purchase_orders(po_number),
        sku           TEXT,
        received_qty  INTEGER,
        received_date TEXT
      );

      CREATE TABLE IF NOT EXISTS fx_rates (
        currency_pair TEXT PRIMARY KEY,
        rate          REAL,
        as_of_date    TEXT
      );

      CREATE TABLE IF NOT EXISTS approval_thresholds (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        min_amount            REAL NOT NULL,
        max_amount            REAL,
        required_approver_role TEXT NOT NULL
      );
    `,
  },

  // ── v8: Communication & Alerting — alerts_queue (durable send queue) ─────
  {
    version: 8,
    description: 'Add alerts_queue table for queue-backed email delivery with retry/dead-letter',
    up: `
      CREATE TABLE IF NOT EXISTS alerts_queue (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient        TEXT    NOT NULL,
        template         TEXT    NOT NULL,
        subject          TEXT,
        payload          TEXT    DEFAULT '{}',
        status           TEXT    DEFAULT 'queued'
                           CHECK(status IN ('queued','sending','sent','failed','dead_letter')),
        attempt_count    INTEGER DEFAULT 0,
        last_error       TEXT,
        created_at       TEXT    DEFAULT (datetime('now')),
        sent_at          TEXT,
        next_attempt_at  TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_queue_status ON alerts_queue(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_queue_next   ON alerts_queue(next_attempt_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_queue_created ON alerts_queue(created_at)
    `,
  },

  // ── v9: Communication & Alerting — alerts delivery log (immutable audit) ─
  {
    version: 9,
    description: 'Add immutable alerts delivery log table',
    up: `
      CREATE TABLE IF NOT EXISTS alerts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_id     INTEGER REFERENCES alerts_queue(id),
        recipient    TEXT,
        template     TEXT,
        status       TEXT,
        payload      TEXT,
        created_at   TEXT DEFAULT (datetime('now')),
        delivered_at TEXT
      );

      ALTER TABLE alerts ADD COLUMN queue_id INTEGER REFERENCES alerts_queue(id);

      CREATE INDEX IF NOT EXISTS idx_alerts_queue_id   ON alerts(queue_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at)
    `,
  },
];

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ deps: [DatabaseService] })
export class MigrationService implements OnModuleInit {
  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureMigrationsTable();
    await this.runPending();
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.database.sql(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     INTEGER PRIMARY KEY,
        description TEXT,
        applied_at  TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  private async runPending(): Promise<void> {
    const applied = (await this.database.sql(
      'SELECT version FROM schema_migrations ORDER BY version',
    )) as { version: number }[];
    const appliedVersions = new Set(applied.map((r) => r.version));

    let ran = 0;
    for (const migration of MIGRATIONS) {
      if (appliedVersions.has(migration.version)) continue;

      console.error(`[MigrationService] Running migration v${migration.version}: ${migration.description}`);

      // Split on semicolons and run each statement individually
      // (SQLite Cloud's sql() doesn't support multi-statement strings)
      const statements = migration.up
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        try {
          await this.database.sql(stmt);
        } catch (err: unknown) {
          const msg = String((err as { message?: string })?.message || err);
          if (
            msg.toLowerCase().includes('duplicate column') ||
            msg.toLowerCase().includes('already exists')
          ) {
            console.error(`[MigrationService] Ignored migration notice: ${msg}`);
          } else {
            throw err;
          }
        }
      }

      await this.database.sql(
        'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
        migration.version,
        migration.description,
      );

      console.error(`[MigrationService] ✓ Migration v${migration.version} applied`);
      ran++;
    }

    if (ran === 0) {
      console.error('[MigrationService] All migrations up to date ✓');
    } else {
      console.error(`[MigrationService] Applied ${ran} migration(s) ✓`);
    }
  }
}
