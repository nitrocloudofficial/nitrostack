#!/usr/bin/env node
/**
 * scripts/seed-sqlite-cloud.ts
 */

import "dotenv/config";
import { Database } from "@sqlitecloud/drivers";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_JSON_PATH = join(__dirname, "..", "data", "master-data.json");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
	version integer PRIMARY KEY,
	description text,
	applied_at text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS denied_parties (
	id integer PRIMARY KEY AUTOINCREMENT,
	entity_name text NOT NULL UNIQUE,
	country text,
	reason text
);
CREATE TABLE IF NOT EXISTS purchase_orders (
	po_number text PRIMARY KEY,
	vendor text NOT NULL,
	sku text NOT NULL,
	ordered_qty integer NOT NULL,
	unit_price real NOT NULL,
	hs_code text,
	created_at text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoices (
	invoice_number text PRIMARY KEY,
	po_number text,
	vendor text NOT NULL,
	invoice_date text,
	total_amount real,
	status text DEFAULT 'pending',
	created_at text DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_invoices_po_number_purchase_orders_po_number_fk FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number)
);
CREATE TABLE IF NOT EXISTS invoice_line_items (
	id integer PRIMARY KEY AUTOINCREMENT,
	invoice_number text,
	sku text,
	description text,
	quantity integer,
	unit_price real,
	total real,
	CONSTRAINT fk_invoice_line_items_invoice_number_invoices_invoice_number_fk FOREIGN KEY (invoice_number) REFERENCES invoices(invoice_number)
);
CREATE TABLE IF NOT EXISTS goods_receipts (
	id integer PRIMARY KEY AUTOINCREMENT,
	po_number text,
	sku text,
	received_qty integer,
	received_date text,
	CONSTRAINT fk_goods_receipts_po_number_purchase_orders_po_number_fk FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number)
);
CREATE TABLE IF NOT EXISTS exceptions (
	id integer PRIMARY KEY AUTOINCREMENT,
	workflow_id text,
	invoice_number text,
	reason text,
	discrepancies text,
	status text DEFAULT 'flagged',
	created_at text DEFAULT CURRENT_TIMESTAMP,
	resolved_at text,
	CONSTRAINT fk_exceptions_invoice_number_invoices_invoice_number_fk FOREIGN KEY (invoice_number) REFERENCES invoices(invoice_number)
);
CREATE TABLE IF NOT EXISTS audit_log (
	id integer PRIMARY KEY AUTOINCREMENT,
	workflow_id text,
	tool_name text,
	input_hash text,
	output_hash text,
	actor text,
	created_at text DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS hs_code_reference (
	hs_code text PRIMARY KEY,
	description text,
	keywords text
);
CREATE VIRTUAL TABLE IF NOT EXISTS hs_code_fts USING fts5(hs_code, description, keywords);
CREATE TABLE IF NOT EXISTS compliance_rules (
	id integer PRIMARY KEY AUTOINCREMENT,
	rule_type text,
	rule_definition text,
	version integer,
	effective_date text
);
CREATE TABLE IF NOT EXISTS alerts_queue (
	id integer PRIMARY KEY AUTOINCREMENT,
	recipient text NOT NULL,
	template text NOT NULL,
	subject text,
	payload text DEFAULT '{}',
	status text DEFAULT 'queued',
	attempt_count integer DEFAULT 0,
	last_error text,
	created_at text DEFAULT CURRENT_TIMESTAMP,
	sent_at text,
	next_attempt_at text
);
CREATE TABLE IF NOT EXISTS alerts (
	id integer PRIMARY KEY AUTOINCREMENT,
	recipient text,
	template text,
	status text,
	payload text,
	created_at text DEFAULT CURRENT_TIMESTAMP,
	delivered_at text,
	queue_id integer,
	CONSTRAINT fk_alerts_queue_id_alerts_queue_id_fk FOREIGN KEY (queue_id) REFERENCES alerts_queue(id)
);
CREATE TABLE IF NOT EXISTS fx_rates (
	currency_pair text PRIMARY KEY,
	rate real,
	as_of_date text
);
CREATE TABLE IF NOT EXISTS approval_thresholds (
	id integer PRIMARY KEY AUTOINCREMENT,
	min_amount real,
	max_amount real,
	required_approver_role text
);
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
	date text PRIMARY KEY,
	invoice_count integer,
	exception_count integer,
	avg_cycle_time_minutes real,
	stp_rate real,
	refreshed_at text
);

CREATE INDEX IF NOT EXISTS idx_denied_parties_name ON denied_parties (entity_name);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_id ON alerts (queue_id);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_created ON alerts_queue (created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_next ON alerts_queue (next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_status ON alerts_queue (status);
`;

const TABLES_TO_DROP = [
    "analytics_daily_summary",
    "approval_thresholds",
    "fx_rates",
    "alerts",
    "alerts_queue",
    "compliance_rules",
    "hs_code_reference",
    "audit_log",
    "exceptions",
    "goods_receipts",
    "invoice_line_items",
    "invoices",
    "purchase_orders",
    "denied_parties",
];

const TABLES_TO_SEED = [
    "denied_parties",
    "purchase_orders",
    "invoices",
    "invoice_line_items",
    "goods_receipts",
    "exceptions",
    "audit_log",
    "hs_code_reference",
    "compliance_rules",
    "alerts_queue",
    "alerts",
    "fx_rates",
    "approval_thresholds",
    "analytics_daily_summary",
];

async function main() {
    const url = process.env["SQLITECLOUD_URL"];
    if (!url) {
        console.error("❌  SQLITECLOUD_URL is not set. Check your .env file.");
        process.exit(1);
    }

    console.log("🔗  Connecting to SQLite Cloud…");
    const db = new Database(url);

    console.log("🏗   Dropping existing tables and recreating schema...");
    for (const table of TABLES_TO_DROP) {
        try {
            await db.sql(`DROP TABLE IF EXISTS ${table}`);
        } catch (e) {}
    }
    try {
        await db.sql(`DROP TABLE IF EXISTS hs_code_fts`);
    } catch (e) {}

    const statements = SCHEMA.split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    for (const statement of statements) {
        await db.sql(statement);
    }

    if (!existsSync(MASTER_JSON_PATH)) {
        console.error(`❌  ${MASTER_JSON_PATH} not found.`);
        process.exit(1);
    }

    console.log("📖  Reading master-data.json...");
    const data = JSON.parse(readFileSync(MASTER_JSON_PATH, "utf-8"));

    for (const table of TABLES_TO_SEED) {
        const rows = data[table];
        if (rows && rows.length > 0) {
            console.log(`🌱  Seeding ${rows.length} rows into ${table}...`);
            const keys = Object.keys(rows[0]);
            const columns = keys.join(", ");
            const placeholders = keys.map(() => "?").join(", ");

            for (const row of rows) {
                const values = keys.map((k) => row[k]);
                await db.sql(
                    `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
                    ...values,
                );
            }
        }
    }

    if (data["hs_code_reference"] && data["hs_code_reference"].length > 0) {
        console.log(
            `🌱  Seeding ${data["hs_code_reference"].length} rows into hs_code_fts...`,
        );
        for (const row of data["hs_code_reference"]) {
            await db.sql(
                `INSERT INTO hs_code_fts (hs_code, description, keywords) VALUES (?, ?, ?)`,
                row.hs_code,
                row.description,
                row.keywords,
            );
        }
    }

    console.log(`\n✅  Database Seeded in SQLite Cloud successfully!`);
    await db.close();
}

main().catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
});
