/**
 * InvoiceX-Ray — Domain Schemas & Data Provider Interface
 *
 * Defines the complete data contracts for TBML detection in
 * Indian AD-bank trade finance under FEMA 2026.
 *
 * These are NOT generic invoice schemas. They model:
 *   - LC/Export trade transactions with shipping documentation
 *   - Independent commodity-price benchmarks with statistical bands
 *   - RBI EDPMS/IDPMS realization tracking per FEMA 2026 timelines
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────
// § 1. TRADE TRANSACTION SCHEMA
// ─────────────────────────────────────────────────────────

export const TradeTransactionSchema = z.object({
  invoice_id: z.string().describe("Unique invoice identifier"),
  lc_number: z.string().describe("Letter of Credit number issued by AD bank"),
  shipping_bill_no: z.string().describe("Customs shipping bill number"),
  exporter_id: z.string().describe("Exporter entity identifier"),
  exporter_name: z.string().describe("Exporter registered name"),
  exporter_iec: z.string().describe("Importer-Exporter Code (DGFT)"),
  ad_bank_code: z.string().describe("Authorized Dealer bank IFSC/code"),
  counterparty_id: z.string().describe("Counterparty entity identifier"),
  counterparty_name: z.string().describe("Counterparty registered name"),
  counterparty_country: z.string().describe("Counterparty jurisdiction (ISO 3166)"),
  hs_code: z.string().describe("Harmonized System code (6-digit minimum)"),
  commodity_description: z.string().describe("Detailed commodity description per LC"),
  declared_value_usd: z.number().positive().describe("Total declared FOB value in USD"),
  quantity: z.number().positive().describe("Quantity of goods"),
  declared_unit_price_usd: z.number().positive().describe("Declared price per unit in USD"),
  unit_of_measurement: z.string().describe("Unit (MT, barrel, unit, kg, etc.)"),
  currency: z.string().default("USD").describe("Invoice currency"),
  incoterms: z.enum(["FOB", "CIF", "CFR", "EXW", "DDP", "FCA", "DAP"]).describe("Incoterms 2020"),
  port_of_loading: z.string().describe("Port of loading (UN/LOCODE)"),
  port_of_discharge: z.string().describe("Port of discharge (UN/LOCODE)"),
  bill_of_lading_no: z.string().optional().describe("Bill of Lading number"),
  vessel_name: z.string().optional().describe("Vessel / carrier name"),
  invoice_date: z.string().describe("Invoice date (ISO 8601)"),
  shipment_date: z.string().describe("Actual/expected shipment date (ISO 8601)"),
  lc_opening_date: z.string().describe("LC issuance date (ISO 8601)"),
});

export type TradeTransaction = z.infer<typeof TradeTransactionSchema>;

// ─────────────────────────────────────────────────────────
// § 2. COMMODITY BENCHMARK SCHEMA
// ─────────────────────────────────────────────────────────

export const CommodityBenchmarkSchema = z.object({
  hs_code: z.string().describe("Harmonized System code"),
  commodity_name: z.string().describe("Standard commodity name"),
  spot_price_usd: z.number().positive().describe("Current spot price per unit (USD)"),
  unit: z.string().describe("Unit of measurement matching trade transactions"),
  mean_price_90d: z.number().positive().describe("90-day rolling mean price (USD)"),
  stddev_price_90d: z.number().nonnegative().describe("90-day rolling standard deviation"),
  min_price_90d: z.number().nonnegative().describe("90-day observed minimum"),
  max_price_90d: z.number().positive().describe("90-day observed maximum"),
  percentile_25: z.number().positive().describe("25th percentile price (90d)"),
  percentile_75: z.number().positive().describe("75th percentile price (90d)"),
  seasonal_adjustment_factor: z.number().default(1.0).describe("Seasonal multiplier (1.0 = no adjustment)"),
  quality_grade: z.string().default("STANDARD").describe("Benchmark quality grade"),
  source: z.string().describe("Benchmark data source (e.g., ICE, LME, OPEC)"),
  last_updated: z.string().describe("Last price update (ISO 8601)"),
  currency: z.string().default("USD"),
});

export type CommodityBenchmark = z.infer<typeof CommodityBenchmarkSchema>;

// ─────────────────────────────────────────────────────────
// § 3. EDPMS/IDPMS REALIZATION STATUS SCHEMA
// ─────────────────────────────────────────────────────────

export const EdpmsRealizationSchema = z.object({
  edpms_id: z.string().describe("EDPMS system record ID"),
  exporter_id: z.string().describe("Exporter entity identifier"),
  exporter_name: z.string().describe("Exporter registered name"),
  invoice_id: z.string().describe("Linked trade invoice ID"),
  shipping_bill_no: z.string().describe("Linked shipping bill number"),
  shipment_date: z.string().describe("Date goods were shipped (ISO 8601)"),
  realization_deadline: z.string().describe("FEMA 2026 realization deadline (ISO 8601)"),
  days_remaining: z.number().describe("Calendar days until realization deadline"),
  realization_window_months: z.number().default(9).describe("Prescribed realization window in months"),
  expected_realization_usd: z.number().positive().describe("Expected proceeds (USD)"),
  realized_amount_usd: z.number().nonnegative().describe("Proceeds received to date (USD)"),
  realization_percentage: z.number().nonnegative().describe("Percentage realized (0–100)"),
  status: z.enum([
    "OPEN",
    "PARTIALLY_REALIZED",
    "FULLY_REALIZED",
    "OVERDUE",
    "WRITE_OFF_REQUESTED",
    "CAUTION_LISTED",
  ]).describe("Current EDPMS status"),
  ad_bank_code: z.string().describe("Reporting AD bank IFSC"),
  last_follow_up_date: z.string().optional().describe("Last follow-up action date"),
  extension_granted: z.boolean().default(false).describe("Whether RBI extension was granted"),
  feters_reported: z.boolean().default(false).describe("Whether reported in FETERS"),
});

export type EdpmsRealization = z.infer<typeof EdpmsRealizationSchema>;

// ─────────────────────────────────────────────────────────
// § 4. ANALYSIS OUTPUT SCHEMAS
// ─────────────────────────────────────────────────────────

export const PriceDeviationResultSchema = z.object({
  status: z.enum(["RED_FLAG", "AMBER", "CLEAR", "ERROR"]),
  invoice_id: z.string(),
  hs_code: z.string(),
  commodity: z.string(),
  declared_unit_price: z.number(),
  benchmark_spot_price: z.number(),
  benchmark_90d_mean: z.number(),
  unit: z.string(),
  deviation_percent: z.number(),
  z_score: z.number(),
  is_within_iqr: z.boolean(),
  confidence_level: z.enum(["HIGH", "MEDIUM", "LOW"]),
  counterfactual: z.object({
    declared_total_value: z.number(),
    benchmark_total_value: z.number(),
    manipulation_gap_usd: z.number(),
    manipulation_gap_percent: z.number(),
    direction: z.enum(["OVER_INVOICED", "UNDER_INVOICED", "WITHIN_RANGE"]),
    narrative: z.string(),
  }),
  detail: z.string(),
});

export type PriceDeviationResult = z.infer<typeof PriceDeviationResultSchema>;

export const TimelineRiskResultSchema = z.object({
  status: z.enum(["RED_FLAG", "AMBER", "CLEAR", "ERROR"]),
  exporter_id: z.string(),
  exporter_name: z.string(),
  fema_penalty_exposure_usd: z.number(),
  total_unrealized_usd: z.number(),
  records_checked: z.number(),
  flagged_count: z.number(),
  flagged_records: z.array(z.object({
    invoice_id: z.string(),
    shipping_bill_no: z.string(),
    days_remaining: z.number(),
    realization_percentage: z.number(),
    unrealized_amount_usd: z.number(),
    penalty_exposure_usd: z.number(),
    risk_detail: z.string(),
  })).optional(),
  summary: z.string(),
});

export type TimelineRiskResult = z.infer<typeof TimelineRiskResultSchema>;

export const CounterpartyPatternResultSchema = z.object({
  status: z.enum(["RED_FLAG", "AMBER", "CLEAR", "ERROR"]),
  entity_id: z.string(),
  total_invoices_scanned: z.number(),
  patterns_detected: z.array(z.object({
    pattern_type: z.enum([
      "IDENTICAL_VALUE_REPEAT",
      "ROUND_TRIP_INDICATOR",
      "RAPID_SUCCESSION",
      "VALUE_CLUSTERING",
    ]),
    severity: z.enum(["CRITICAL", "HIGH", "MEDIUM"]),
    invoice_ids: z.array(z.string()),
    total_exposure_usd: z.number(),
    detail: z.string(),
  })).optional(),
  summary: z.string(),
});

export type CounterpartyPatternResult = z.infer<typeof CounterpartyPatternResultSchema>;

export const AccumulatedFlagSchema = z.object({
  flag_type: z.enum([
    "PRICE_DEVIATION_OVER",
    "PRICE_DEVIATION_UNDER",
    "TIMELINE_PRESSURE",
    "MULTIPLE_INVOICING",
    "RAPID_SUCCESSION",
    "VALUE_CLUSTERING",
    "ROUND_TRIP_INDICATOR",
  ]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM"]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  detail: z.string(),
  supporting_data: z.record(z.unknown()).optional(),
});

export type AccumulatedFlag = z.infer<typeof AccumulatedFlagSchema>;

// ─────────────────────────────────────────────────────────
// § 5. DATA PROVIDER INTERFACE
// ─────────────────────────────────────────────────────────

export interface DataProvider {
  getAllTransactions(): Promise<TradeTransaction[]>;
  getTransactionById(invoiceId: string): Promise<TradeTransaction | null>;
  getTransactionsByExporter(exporterId: string): Promise<TradeTransaction[]>;
  getTransactionsByCounterparty(counterpartyId: string): Promise<TradeTransaction[]>;
  getAllBenchmarks(): Promise<CommodityBenchmark[]>;
  getBenchmarkByHsCode(hsCode: string): Promise<CommodityBenchmark | null>;
  getAllEdpmsRecords(): Promise<EdpmsRealization[]>;
  getEdpmsRecordsByExporter(exporterId: string): Promise<EdpmsRealization[]>;
  getEdpmsRecordByInvoice(invoiceId: string): Promise<EdpmsRealization | null>;
}
