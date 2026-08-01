import pg from "pg";
import dns from "node:dns";
import type {
  DataProvider,
  TradeTransaction,
  CommodityBenchmark,
  EdpmsRealization,
} from "./domainSchemas.js";

dns.setDefaultResultOrder("ipv4first");

function sanitizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  let sanitized = url;
  if (sanitized.includes('db.qinybzqtfsqrjlljtmhm.supabase.co')) {
    sanitized = sanitized
      .replace('postgresql://postgres:', 'postgresql://postgres.qinybzqtfsqrjlljtmhm:')
      .replace('db.qinybzqtfsqrjlljtmhm.supabase.co:5432', 'aws-0-ap-northeast-1.pooler.supabase.com:6543')
      .replace('db.qinybzqtfsqrjlljtmhm.supabase.co', 'aws-0-ap-northeast-1.pooler.supabase.com:6543');
  }
  const atIndex = sanitized.indexOf('@');
  if (atIndex !== -1) {
    const userPassPart = sanitized.substring(0, atIndex);
    const hostPart = sanitized.substring(atIndex);
    const sanitizedUserPass = userPassPart.replace(/#/g, '%23');
    return sanitizedUserPass + hostPart;
  }
  return sanitized;
}

const { Pool } = pg;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DbDataProvider implements DataProvider {
  private pool: pg.Pool;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private CACHE_TTL_MS = 30000; // 30 seconds TTL for fast responses

  constructor() {
    const connStr = sanitizeDatabaseUrl(process.env.DATABASE_URL);
    this.pool = new Pool({
      connectionString: connStr,
      ssl: process.env.NODE_ENV === "production" || connStr?.includes("supabase")
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setToCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // Helper to parse database rows to match Zod Types
  private mapRowToTransaction(row: any): TradeTransaction {
    return {
      invoice_id: row.invoice_id,
      lc_number: row.lc_number,
      shipping_bill_no: row.shipping_bill_no,
      exporter_id: row.exporter_id,
      exporter_name: row.exporter_name,
      exporter_iec: row.exporter_iec,
      ad_bank_code: row.ad_bank_code,
      counterparty_id: row.counterparty_id,
      counterparty_name: row.counterparty_name,
      counterparty_country: row.counterparty_country,
      hs_code: row.hs_code,
      commodity_description: row.commodity_description,
      declared_value_usd: parseFloat(row.declared_value_usd),
      quantity: parseFloat(row.quantity),
      declared_unit_price_usd: parseFloat(row.declared_unit_price_usd),
      unit_of_measurement: row.unit_of_measurement,
      currency: row.currency,
      incoterms: row.incoterms as any,
      port_of_loading: row.port_of_loading,
      port_of_discharge: row.port_of_discharge,
      bill_of_lading_no: row.bill_of_lading_no || undefined,
      vessel_name: row.vessel_name || undefined,
      invoice_date: new Date(row.invoice_date).toISOString().split("T")[0],
      shipment_date: new Date(row.shipment_date).toISOString().split("T")[0],
      lc_opening_date: new Date(row.lc_opening_date).toISOString().split("T")[0],
    };
  }

  private mapRowToBenchmark(row: any): CommodityBenchmark {
    return {
      hs_code: row.hs_code,
      commodity_name: row.commodity_name,
      spot_price_usd: parseFloat(row.spot_price_usd),
      unit: row.unit,
      mean_price_90d: parseFloat(row.mean_price_90d),
      stddev_price_90d: parseFloat(row.stddev_price_90d),
      min_price_90d: parseFloat(row.min_price_90d),
      max_price_90d: parseFloat(row.max_price_90d),
      percentile_25: parseFloat(row.percentile_25),
      percentile_75: parseFloat(row.percentile_75),
      seasonal_adjustment_factor: parseFloat(row.seasonal_adjustment_factor),
      quality_grade: row.quality_grade,
      source: row.source,
      last_updated: new Date(row.last_updated).toISOString(),
      currency: row.currency,
    };
  }

  private mapRowToEdpms(row: any): EdpmsRealization {
    return {
      edpms_id: row.edpms_id,
      exporter_id: row.exporter_id,
      exporter_name: row.exporter_name,
      invoice_id: row.invoice_id,
      shipping_bill_no: row.shipping_bill_no,
      shipment_date: new Date(row.shipment_date).toISOString().split("T")[0],
      realization_deadline: new Date(row.realization_deadline).toISOString().split("T")[0],
      days_remaining: parseInt(row.days_remaining, 10),
      realization_window_months: parseInt(row.realization_window_months, 10),
      expected_realization_usd: parseFloat(row.expected_realization_usd),
      realized_amount_usd: parseFloat(row.realized_amount_usd),
      realization_percentage: parseFloat(row.realization_percentage),
      status: row.status as any,
      ad_bank_code: row.ad_bank_code,
      last_follow_up_date: row.last_follow_up_date
        ? new Date(row.last_follow_up_date).toISOString().split("T")[0]
        : undefined,
      extension_granted: !!row.extension_granted,
      feters_reported: !!row.feters_reported,
    };
  }

  // ── Trade Transactions ──
  async getAllTransactions(): Promise<TradeTransaction[]> {
    const cacheKey = "txn:all";
    const cached = this.getFromCache<TradeTransaction[]>(cacheKey);
    if (cached) return cached;

    const res = await this.pool.query("SELECT * FROM trade_transactions ORDER BY invoice_date DESC");
    const txns = res.rows.map((row) => this.mapRowToTransaction(row));
    this.setToCache(cacheKey, txns);
    return txns;
  }

  async getTransactionById(invoiceId: string): Promise<TradeTransaction | null> {
    const normalizedId = invoiceId.trim().toUpperCase();
    const cacheKey = `txn:id:${normalizedId}`;
    const cached = this.getFromCache<TradeTransaction | null>(cacheKey);
    if (cached !== null) return cached;

    const res = await this.pool.query(
      "SELECT * FROM trade_transactions WHERE UPPER(TRIM(invoice_id)) = UPPER(TRIM($1))",
      [invoiceId]
    );
    if (res.rows.length === 0) {
      this.setToCache(cacheKey, null);
      return null;
    }
    const txn = this.mapRowToTransaction(res.rows[0]);
    this.setToCache(cacheKey, txn);
    return txn;
  }

  async getTransactionsByExporter(exporterId: string): Promise<TradeTransaction[]> {
    const normalizedId = exporterId.trim().toUpperCase();
    const cacheKey = `txn:exp:${normalizedId}`;
    const cached = this.getFromCache<TradeTransaction[]>(cacheKey);
    if (cached) return cached;

    const res = await this.pool.query(
      "SELECT * FROM trade_transactions WHERE UPPER(TRIM(exporter_id)) = UPPER(TRIM($1))",
      [exporterId]
    );
    const txns = res.rows.map((row) => this.mapRowToTransaction(row));
    this.setToCache(cacheKey, txns);
    return txns;
  }

  async getTransactionsByCounterparty(counterpartyId: string): Promise<TradeTransaction[]> {
    const normalizedId = counterpartyId.trim().toUpperCase();
    const cacheKey = `txn:cp:${normalizedId}`;
    const cached = this.getFromCache<TradeTransaction[]>(cacheKey);
    if (cached) return cached;

    const res = await this.pool.query(
      "SELECT * FROM trade_transactions WHERE UPPER(TRIM(counterparty_id)) = UPPER(TRIM($1))",
      [counterpartyId]
    );
    const txns = res.rows.map((row) => this.mapRowToTransaction(row));
    this.setToCache(cacheKey, txns);
    return txns;
  }

  // ── Commodity Benchmarks ──
  async getAllBenchmarks(): Promise<CommodityBenchmark[]> {
    const cacheKey = "bm:all";
    const cached = this.getFromCache<CommodityBenchmark[]>(cacheKey);
    if (cached) return cached;

    const res = await this.pool.query("SELECT * FROM commodity_benchmarks");
    const bms = res.rows.map((row) => this.mapRowToBenchmark(row));
    this.setToCache(cacheKey, bms);
    return bms;
  }

  async getBenchmarkByHsCode(hsCode: string): Promise<CommodityBenchmark | null> {
    const normalizedHs = hsCode.trim();
    const cacheKey = `bm:hs:${normalizedHs}`;
    const cached = this.getFromCache<CommodityBenchmark | null>(cacheKey);
    if (cached !== null) return cached;

    const res = await this.pool.query("SELECT * FROM commodity_benchmarks WHERE hs_code = $1", [
      hsCode,
    ]);
    if (res.rows.length > 0) {
      const bm = this.mapRowToBenchmark(res.rows[0]);
      this.setToCache(cacheKey, bm);
      return bm;
    }

    // Benchmark not found in database, dynamically generate using transaction commodity description
    const txnRes = await this.pool.query(
      "SELECT commodity_description FROM trade_transactions WHERE hs_code = $1 LIMIT 1",
      [hsCode]
    );
    const description = txnRes.rows.length > 0
      ? txnRes.rows[0].commodity_description
      : `General Commodity HS-${hsCode}`;

    console.error(`[InvoiceX-Ray] Benchmark not found for HS Code ${hsCode}. Dynamically generating benchmark for: "${description}"`);
    const bm = await this.generateAndSaveDynamicBenchmark(hsCode, description);
    this.setToCache(cacheKey, bm);
    return bm;
  }

  public async generateAndSaveDynamicBenchmark(
    hsCode: string,
    commodityDescription: string
  ): Promise<CommodityBenchmark> {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const defaultBenchmark: CommodityBenchmark = {
      hs_code: hsCode,
      commodity_name: commodityDescription,
      spot_price_usd: 150.0,
      unit: "unit",
      mean_price_90d: 150.0,
      stddev_price_90d: 15.0,
      min_price_90d: 110.0,
      max_price_90d: 190.0,
      percentile_25: 140.0,
      percentile_75: 160.0,
      seasonal_adjustment_factor: 1.0,
      quality_grade: "STANDARD",
      source: "FALLBACK_OFFSIDE_ESTIMATE",
      last_updated: new Date().toISOString(),
      currency: "USD",
    };

    if (!apiKey) {
      console.error("[InvoiceX-Ray] GROQ_API_KEY not configured. Using offline benchmark fallback.");
      await this.saveBenchmark(defaultBenchmark);
      return defaultBenchmark;
    }

    const promptText = `You are a commodities trading analyst. Create a realistic, standard market benchmark statistical payload for the following trade commodity under the HS code:
HS Code: ${hsCode}
Commodity Description: ${commodityDescription}

Estimate a realistic current market spot price in USD per unit. Also estimate standard rolling 90-day distribution statistics (mean, standard deviation, min, max, 25th percentile, and 75th percentile) and unit of measurement (e.g. kg, MT, oz, barrel, unit, etc.) typical for this commodity. Ensure the statistical ranges are consistent: spot_price_usd should be positive, stddev_price_90d >= 0, min <= mean <= max, percentile_25 <= percentile_75.

Provide your response in raw JSON format matching this schema:
{
  "commodity_name": "<clean commodity name>",
  "spot_price_usd": <number, spot price per unit in USD>,
  "unit": "<unit of measurement, e.g. kg, MT, oz, unit>",
  "mean_price_90d": <number, mean price>,
  "stddev_price_90d": <number, standard deviation>,
  "min_price_90d": <number, min price>,
  "max_price_90d": <number, max price>,
  "percentile_25": <number, 25th percentile price>,
  "percentile_75": <number, 75th percentile price>,
  "seasonal_adjustment_factor": 1.0,
  "quality_grade": "STANDARD",
  "source": "<source name, e.g. LME, COMTRADE, ICE>",
  "currency": "USD"
}

Output ONLY the raw JSON. No markdown formatting, no backticks, no explanations.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: promptText }],
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error("HTTP error " + response.status);
      const dataRes: any = await response.json();
      const content = dataRes.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty completion");

      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const benchmark: CommodityBenchmark = {
        hs_code: hsCode,
        commodity_name: parsed.commodity_name || commodityDescription,
        spot_price_usd: parseFloat(parsed.spot_price_usd) || 150.0,
        unit: parsed.unit || "unit",
        mean_price_90d: parseFloat(parsed.mean_price_90d) || parseFloat(parsed.spot_price_usd) || 150.0,
        stddev_price_90d: parseFloat(parsed.stddev_price_90d) || 15.0,
        min_price_90d: parseFloat(parsed.min_price_90d) || (parseFloat(parsed.spot_price_usd) * 0.8) || 120.0,
        max_price_90d: parseFloat(parsed.max_price_90d) || (parseFloat(parsed.spot_price_usd) * 1.2) || 180.0,
        percentile_25: parseFloat(parsed.percentile_25) || (parseFloat(parsed.spot_price_usd) * 0.9) || 135.0,
        percentile_75: parseFloat(parsed.percentile_75) || (parseFloat(parsed.spot_price_usd) * 1.1) || 165.0,
        seasonal_adjustment_factor: parseFloat(parsed.seasonal_adjustment_factor) || 1.0,
        quality_grade: parsed.quality_grade || "STANDARD",
        source: parsed.source || "GROQ_DYNAMIC_API",
        last_updated: new Date().toISOString(),
        currency: parsed.currency || "USD",
      };

      await this.saveBenchmark(benchmark);
      return benchmark;
    } catch (err: any) {
      console.error(
        `[InvoiceX-Ray] Dynamic benchmark generation failed: ${err.message}. Falling back to default baseline.`
      );
      await this.saveBenchmark(defaultBenchmark);
      return defaultBenchmark;
    }
  }

  private async saveBenchmark(benchmark: CommodityBenchmark): Promise<void> {
    this.cache.delete(`bm:hs:${benchmark.hs_code.trim()}`);
    this.cache.delete("bm:all");
    await this.pool.query(
      `INSERT INTO commodity_benchmarks 
      (hs_code, commodity_name, spot_price_usd, unit, mean_price_90d, stddev_price_90d, min_price_90d, max_price_90d, percentile_25, percentile_75, seasonal_adjustment_factor, quality_grade, source, last_updated, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (hs_code) DO UPDATE SET
        commodity_name = EXCLUDED.commodity_name,
        spot_price_usd = EXCLUDED.spot_price_usd,
        unit = EXCLUDED.unit,
        mean_price_90d = EXCLUDED.mean_price_90d,
        stddev_price_90d = EXCLUDED.stddev_price_90d,
        min_price_90d = EXCLUDED.min_price_90d,
        max_price_90d = EXCLUDED.max_price_90d,
        percentile_25 = EXCLUDED.percentile_25,
        percentile_75 = EXCLUDED.percentile_75,
        seasonal_adjustment_factor = EXCLUDED.seasonal_adjustment_factor,
        quality_grade = EXCLUDED.quality_grade,
        source = EXCLUDED.source,
        last_updated = EXCLUDED.last_updated,
        currency = EXCLUDED.currency`,
      [
        benchmark.hs_code,
        benchmark.commodity_name,
        benchmark.spot_price_usd,
        benchmark.unit,
        benchmark.mean_price_90d,
        benchmark.stddev_price_90d,
        benchmark.min_price_90d,
        benchmark.max_price_90d,
        benchmark.percentile_25,
        benchmark.percentile_75,
        benchmark.seasonal_adjustment_factor,
        benchmark.quality_grade,
        benchmark.source,
        new Date(benchmark.last_updated),
        benchmark.currency,
      ]
    );
  }

  // ── EDPMS Realization ──
  async getAllEdpmsRecords(): Promise<EdpmsRealization[]> {
    const cacheKey = "edpms:all";
    const cached = this.getFromCache<EdpmsRealization[]>(cacheKey);
    if (cached) return cached;

    const res = await this.pool.query("SELECT * FROM edpms_realization");
    const records = res.rows.map((row) => this.mapRowToEdpms(row));
    this.setToCache(cacheKey, records);
    return records;
  }

  async getEdpmsRecordsByExporter(exporterId: string): Promise<EdpmsRealization[]> {
    const normalizedId = exporterId.trim().toUpperCase();
    const cacheKey = `edpms:exp:${normalizedId}`;
    const cached = this.getFromCache<EdpmsRealization[]>(cacheKey);
    if (cached) return cached;

    const res = await this.pool.query(
      "SELECT * FROM edpms_realization WHERE UPPER(TRIM(exporter_id)) = UPPER(TRIM($1))",
      [exporterId]
    );
    const records = res.rows.map((row) => this.mapRowToEdpms(row));
    this.setToCache(cacheKey, records);
    return records;
  }

  async getEdpmsRecordByInvoice(invoiceId: string): Promise<EdpmsRealization | null> {
    const normalizedId = invoiceId.trim().toUpperCase();
    const cacheKey = `edpms:inv:${normalizedId}`;
    const cached = this.getFromCache<EdpmsRealization | null>(cacheKey);
    if (cached !== null) return cached;

    const res = await this.pool.query(
      "SELECT * FROM edpms_realization WHERE UPPER(TRIM(invoice_id)) = UPPER(TRIM($1))",
      [invoiceId]
    );
    if (res.rows.length === 0) {
      this.setToCache(cacheKey, null);
      return null;
    }
    const record = this.mapRowToEdpms(res.rows[0]);
    this.setToCache(cacheKey, record);
    return record;
  }
}
