import pg from "pg";
import "dotenv/config";
import dns from "node:dns";
// Force IPv4-first resolution to bypass IPv6 ENOTUNREACH issues in restricted sandboxes
dns.setDefaultResultOrder("ipv4first");

const { Client } = pg;

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Error: DATABASE_URL is not set in environment variables.");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes("supabase") || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log("Connected to database. Setting up schema and seeding data...");

    // 1. Clean existing tables
    await client.query("DROP TABLE IF EXISTS edpms_realization CASCADE");
    await client.query("DROP TABLE IF EXISTS commodity_benchmarks CASCADE");
    await client.query("DROP TABLE IF EXISTS trade_transactions CASCADE");

    // 2. Create trade_transactions
    await client.query(`
      CREATE TABLE trade_transactions (
          invoice_id VARCHAR(50) PRIMARY KEY,
          lc_number VARCHAR(100) NOT NULL,
          shipping_bill_no VARCHAR(100) NOT NULL,
          exporter_id VARCHAR(50) NOT NULL,
          exporter_name VARCHAR(255) NOT NULL,
          exporter_iec VARCHAR(50) NOT NULL,
          ad_bank_code VARCHAR(50) NOT NULL,
          counterparty_id VARCHAR(50) NOT NULL,
          counterparty_name VARCHAR(255) NOT NULL,
          counterparty_country VARCHAR(3) NOT NULL,
          hs_code VARCHAR(10) NOT NULL,
          commodity_description TEXT NOT NULL,
          declared_value_usd NUMERIC(15, 2) NOT NULL CHECK (declared_value_usd > 0),
          quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
          declared_unit_price_usd NUMERIC(12, 4) NOT NULL CHECK (declared_unit_price_usd > 0),
          unit_of_measurement VARCHAR(20) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
          incoterms VARCHAR(3) NOT NULL CHECK (incoterms IN ('FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'FCA', 'DAP')),
          port_of_loading VARCHAR(10) NOT NULL,
          port_of_discharge VARCHAR(10) NOT NULL,
          bill_of_lading_no VARCHAR(100),
          vessel_name VARCHAR(100),
          invoice_date DATE NOT NULL,
          shipment_date DATE NOT NULL,
          lc_opening_date DATE NOT NULL
      )
    `);

    // Create indexes
    await client.query("CREATE INDEX idx_trade_transactions_exporter ON trade_transactions(exporter_id)");
    await client.query("CREATE INDEX idx_trade_transactions_counterparty ON trade_transactions(counterparty_id)");
    await client.query("CREATE INDEX idx_trade_transactions_hs_code ON trade_transactions(hs_code)");

    // 3. Create commodity_benchmarks
    await client.query(`
      CREATE TABLE commodity_benchmarks (
          hs_code VARCHAR(10) PRIMARY KEY,
          commodity_name VARCHAR(255) NOT NULL,
          spot_price_usd NUMERIC(12, 4) NOT NULL CHECK (spot_price_usd > 0),
          unit VARCHAR(20) NOT NULL,
          mean_price_90d NUMERIC(12, 4) NOT NULL CHECK (mean_price_90d > 0),
          stddev_price_90d NUMERIC(12, 4) NOT NULL CHECK (stddev_price_90d >= 0),
          min_price_90d NUMERIC(12, 4) NOT NULL CHECK (min_price_90d >= 0),
          max_price_90d NUMERIC(12, 4) NOT NULL CHECK (max_price_90d > 0),
          percentile_25 NUMERIC(12, 4) NOT NULL CHECK (percentile_25 > 0),
          percentile_75 NUMERIC(12, 4) NOT NULL CHECK (percentile_75 > 0),
          seasonal_adjustment_factor NUMERIC(5, 2) DEFAULT 1.00 NOT NULL,
          quality_grade VARCHAR(50) DEFAULT 'STANDARD' NOT NULL,
          source VARCHAR(100) NOT NULL,
          last_updated TIMESTAMPTZ NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD' NOT NULL
      )
    `);

    // 4. Create edpms_realization
    await client.query(`
      CREATE TABLE edpms_realization (
          edpms_id VARCHAR(50) PRIMARY KEY,
          exporter_id VARCHAR(50) NOT NULL,
          exporter_name VARCHAR(255) NOT NULL,
          invoice_id VARCHAR(50) NOT NULL REFERENCES trade_transactions(invoice_id) ON DELETE CASCADE,
          shipping_bill_no VARCHAR(100) NOT NULL,
          shipment_date DATE NOT NULL,
          realization_deadline DATE NOT NULL,
          days_remaining INTEGER NOT NULL,
          realization_window_months INTEGER DEFAULT 9 NOT NULL,
          expected_realization_usd NUMERIC(15, 2) NOT NULL CHECK (expected_realization_usd > 0),
          realized_amount_usd NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (realized_amount_usd >= 0),
          realization_percentage NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
          status VARCHAR(30) NOT NULL CHECK (status IN ('OPEN', 'PARTIALLY_REALIZED', 'FULLY_REALIZED', 'OVERDUE', 'WRITE_OFF_REQUESTED', 'CAUTION_LISTED')),
          ad_bank_code VARCHAR(50) NOT NULL,
          last_follow_up_date DATE,
          extension_granted BOOLEAN DEFAULT FALSE NOT NULL,
          feters_reported BOOLEAN DEFAULT FALSE NOT NULL
      )
    `);

    await client.query("CREATE INDEX idx_edpms_exporter ON edpms_realization(exporter_id)");
    await client.query("CREATE INDEX idx_edpms_invoice_id ON edpms_realization(invoice_id)");

    console.log("Tables created. Seeding commodity benchmarks...");

    // 5. Seed Commodity Benchmarks
    await client.query(`
      INSERT INTO commodity_benchmarks 
      (hs_code, commodity_name, spot_price_usd, unit, mean_price_90d, stddev_price_90d, min_price_90d, max_price_90d, percentile_25, percentile_75, source, last_updated)
      VALUES 
      ('710812', 'Gold Bullion', 2200.00, 'oz', 2180.00, 45.00, 2100.00, 2300.00, 2150.00, 2210.00, 'LME', NOW()),
      ('851713', 'Smartphones', 500.00, 'unit', 510.00, 15.00, 480.00, 540.00, 500.00, 520.00, 'COMTRADE', NOW()),
      ('520100', 'Raw Cotton', 2.10, 'kg', 2.05, 0.08, 1.90, 2.25, 2.01, 2.12, 'ICE', NOW())
    `);

    console.log("Seeding trade transactions (clean + planted)...");

    // 6. Seed Trade Transactions (including Clean & Planted Invoices)
    await client.query(`
      INSERT INTO trade_transactions 
      (invoice_id, lc_number, shipping_bill_no, exporter_id, exporter_name, exporter_iec, ad_bank_code, counterparty_id, counterparty_name, counterparty_country, hs_code, commodity_description, declared_value_usd, quantity, declared_unit_price_usd, unit_of_measurement, currency, incoterms, port_of_loading, port_of_discharge, invoice_date, shipment_date, lc_opening_date)
      VALUES 
      -- Clean Invoice 1
      ('INV-2026-CLEAN-01', 'LC-99201-XYZ', 'SB-TX-10029', 'EXP-SKYLINE-01', 'SKYLINE FABRICS PVT LTD', 'IEC100000000', 'ICIC0000102', 'IMP-GLOBAL-DUBAI', 'GLOBAL TRADING DIRECT LLC', 'ARE', '520100', 'Premium Grade Raw Cotton bales', 105000.00, 50000.00, 2.10, 'kg', 'USD', 'FOB', 'INMAA1', 'AEJEA', '2026-05-10', '2026-05-15', '2026-05-01'),

      -- Planted Invoice 1: Gold Bullion Over-Invoicing
      ('INV-2026-GOLD-99', 'LC-GLD-8821', 'SB-AU-22109', 'EXP-AURUM-01', 'AURUM AGRI & METALS PVT LTD', 'IEC123456789', 'HDFC0000213', 'IMP-SHINY-ZURICH', 'VALUABLE METALS GMBH', 'CHE', '710812', '99.9% Pure Gold Bullion bars', 1475000.00, 500.00, 2950.00, 'oz', 'USD', 'FOB', 'INBOM1', 'CHZRH', '2026-07-01', '2026-07-03', '2026-06-25'),

      -- Planted Invoice 2: EDPMS Timeline Risk (FEMA Overdue context)
      ('INV-2026-TEXTILE-404', 'LC-TX-33291', 'SB-TX-99881', 'EXP-SKYLINE-01', 'SKYLINE FABRICS PVT LTD', 'IEC100000000', 'ICIC0000102', 'IMP-GLOBAL-DUBAI', 'GLOBAL TRADING DIRECT LLC', 'ARE', '520100', 'Raw cotton shipments', 450000.00, 214285.71, 2.10, 'kg', 'USD', 'FOB', 'INMAA1', 'AEJEA', '2025-10-20', '2025-10-20', '2025-10-15'),

      -- Planted Invoices 3, 4, 5: Multiple Invoicing / Phantom Shipment pattern
      ('INV-2026-ELECT-101', 'LC-EL-88910', 'SB-EL-00921', 'EXP-TECH-01', 'NEO TECHNOLOGIES LTD', 'IEC998877665', 'BARC0INBOM', 'IMP-GLOBAL-DUBAI', 'GLOBAL TRADING DIRECT LLC', 'ARE', '851713', 'Gen-X Advanced Smartphones', 1950000.00, 3000.00, 650.00, 'unit', 'USD', 'FOB', 'INMAA1', 'AEJEA', '2026-06-01', '2026-06-02', '2026-05-28'),
      ('INV-2026-ELECT-102', 'LC-EL-88910', 'SB-EL-00922', 'EXP-TECH-01', 'NEO TECHNOLOGIES LTD', 'IEC998877665', 'BARC0INBOM', 'IMP-GLOBAL-DUBAI', 'GLOBAL TRADING DIRECT LLC', 'ARE', '851713', 'Gen-X Advanced Smartphones', 1950000.00, 3000.00, 650.00, 'unit', 'USD', 'FOB', 'INMAA1', 'AEJEA', '2026-06-04', '2026-06-05', '2026-05-28'),
      ('INV-2026-ELECT-103', 'LC-EL-88910', 'SB-EL-00923', 'EXP-TECH-01', 'NEO TECHNOLOGIES LTD', 'IEC998877665', 'BARC0INBOM', 'IMP-GLOBAL-DUBAI', 'GLOBAL TRADING DIRECT LLC', 'ARE', '851713', 'Gen-X Advanced Smartphones', 1950000.00, 3000.00, 650.00, 'unit', 'USD', 'FOB', 'INMAA1', 'AEJEA', '2026-06-07', '2026-06-08', '2026-05-28')
    `);

    console.log("Seeding EDPMS records...");

    // 7. Seed EDPMS records
    await client.query(`
      INSERT INTO edpms_realization 
      (edpms_id, exporter_id, exporter_name, invoice_id, shipping_bill_no, shipment_date, realization_deadline, days_remaining, expected_realization_usd, realized_amount_usd, realization_percentage, status, ad_bank_code)
      VALUES 
      -- Clean Invoice EDPMS (Fully Realized)
      ('EDPMS-001', 'EXP-SKYLINE-01', 'SKYLINE FABRICS PVT LTD', 'INV-2026-CLEAN-01', 'SB-TX-10029', '2026-05-15', '2027-02-15', 213, 105000.00, 105000.00, 100.00, 'FULLY_REALIZED', 'ICIC0000102'),

      -- Planted Gold Invoice (Awaiting realization, well within timeline)
      ('EDPMS-002', 'EXP-AURUM-01', 'AURUM AGRI & METALS PVT LTD', 'INV-2026-GOLD-99', 'SB-AU-22109', '2026-07-03', '2027-04-03', 260, 1475000.00, 0.00, 0.00, 'OPEN', 'HDFC0000213'),

      -- Planted EDPMS Risk Invoice (Only 3 days remaining until deadline, zero realized amount)
      ('EDPMS-003', 'EXP-SKYLINE-01', 'SKYLINE FABRICS PVT LTD', 'INV-2026-TEXTILE-404', 'SB-TX-99881', '2025-10-20', '2026-07-20', 3, 450000.00, 0.00, 0.00, 'OPEN', 'ICIC0000102'),

      -- Multiple-Invoicing EDPMS records (Open, awaiting proceeds)
      ('EDPMS-004', 'EXP-TECH-01', 'NEO TECHNOLOGIES LTD', 'INV-2026-ELECT-101', 'SB-EL-00921', '2026-06-02', '2027-03-02', 228, 1950000.00, 0.00, 0.00, 'OPEN', 'BARC0INBOM'),
      ('EDPMS-005', 'EXP-TECH-01', 'NEO TECHNOLOGIES LTD', 'INV-2026-ELECT-102', 'SB-EL-00922', '2026-06-05', '2027-03-05', 231, 1950000.00, 0.00, 0.00, 'OPEN', 'BARC0INBOM'),
      ('EDPMS-006', 'EXP-TECH-01', 'NEO TECHNOLOGIES LTD', 'INV-2026-ELECT-103', 'SB-EL-00923', '2026-06-08', '2027-03-08', 234, 1950000.00, 0.00, 0.00, 'OPEN', 'BARC0INBOM')
    `);

    console.log("Database seeded successfully.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    await client.end();
  }
}

seed();
