import { Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../shared/database.service.js';

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface AnalyticsFilters {
  dateFrom?:  string; // ISO 8601 date 'YYYY-MM-DD'
  dateTo?:    string;
  vendor?:    string;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface InvoiceAnalytics {
  totalInvoices:        number;
  autoApproved:         number;
  flagged:              number;
  exception:            number;
  stpRate:              number; // straight-through-processing %
  avgCycleTimeSeconds:  number;
  volumeByDate:         { date: string; count: number }[];
  volumeByVendor:       { vendor: string; count: number }[];
  filters:              AnalyticsFilters;
}

export interface ExceptionBreakdown {
  total:   number;
  byType:  { reason: string; count: number; percentage: number }[];
  byStatus:{ status: string; count: number }[];
  byVendor:{ vendor: string; count: number }[];
}

export interface VendorScorecard {
  vendor:            string;
  totalInvoices:     number;
  autoApproved:      number;
  flagged:           number;
  mismatchRate:      number;
  avgCycleTimeSecs:  number;
  openExceptions:    number;
  recentInvoices:    { invoiceNumber: string; status: string; createdAt: string }[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ deps: [DatabaseService] })
export class AnalyticsService {
  constructor(private readonly database: DatabaseService) {}

  // ── Invoice Analytics ─────────────────────────────────────────────────────

  async getInvoiceAnalytics(filters: AnalyticsFilters): Promise<InvoiceAnalytics> {
    const { whereClause, params } = this.buildWhereClause(filters, 'i');

    // Aggregate totals
    const totals = ((await this.database.sql(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN i.status = 'Auto-approved' THEN 1 ELSE 0 END) AS auto_approved,
         SUM(CASE WHEN i.status = 'Flagged'       THEN 1 ELSE 0 END) AS flagged,
         SUM(CASE WHEN i.status = 'exception'     THEN 1 ELSE 0 END) AS exception_count,
         AVG(
           CASE WHEN i.status IN ('Auto-approved','Flagged','exception')
             THEN (julianday(i.created_at) - julianday(i.created_at)) * 86400.0
             ELSE NULL
           END
         ) AS avg_cycle_secs
       FROM invoices i ${whereClause}`,
      ...params,
    )) as Record<string, number>[])[0] ?? {};

    const total        = (totals['total']          as number) || 0;
    const autoApproved = (totals['auto_approved']  as number) || 0;
    const flagged      = (totals['flagged']        as number) || 0;
    const exCount      = (totals['exception_count'] as number) || 0;
    const stpRate      = total > 0 ? Math.round((autoApproved / total) * 1000) / 10 : 0;

    // Volume by date
    const volumeByDate = (await this.database.sql(
      `SELECT date(i.created_at) AS date, COUNT(*) AS count
       FROM invoices i ${whereClause}
       GROUP BY date(i.created_at)
       ORDER BY date DESC
       LIMIT 30`,
      ...params,
    )) as { date: string; count: number }[];

    // Volume by vendor
    const volumeByVendor = (await this.database.sql(
      `SELECT i.vendor, COUNT(*) AS count
       FROM invoices i ${whereClause}
       GROUP BY i.vendor
       ORDER BY count DESC
       LIMIT 20`,
      ...params,
    )) as { vendor: string; count: number }[];

    return {
      totalInvoices:       total,
      autoApproved,
      flagged,
      exception:           exCount,
      stpRate,
      avgCycleTimeSeconds: (totals['avg_cycle_secs'] as number) || 0,
      volumeByDate:        volumeByDate.map((r) => ({ date: r.date, count: Number(r.count) })),
      volumeByVendor:      volumeByVendor.map((r) => ({ vendor: r.vendor, count: Number(r.count) })),
      filters,
    };
  }

  // ── Exception Breakdown ───────────────────────────────────────────────────

  async getExceptionBreakdown(filters: AnalyticsFilters): Promise<ExceptionBreakdown> {
    // Build JOIN-based WHERE that allows filtering by vendor via invoices
    const dateWhere: string[] = [];
    const params: unknown[] = [];
    if (filters.dateFrom) { dateWhere.push('e.created_at >= ?'); params.push(filters.dateFrom); }
    if (filters.dateTo)   { dateWhere.push('e.created_at <= ?'); params.push(filters.dateTo + 'T23:59:59'); }
    if (filters.vendor)   { dateWhere.push('i.vendor = ?');      params.push(filters.vendor); }

    const joinClause  = filters.vendor ? 'LEFT JOIN invoices i ON e.invoice_number = i.invoice_number' : '';
    const whereClause = dateWhere.length ? `WHERE ${dateWhere.join(' AND ')}` : '';

    const totalRow = ((await this.database.sql(
      `SELECT COUNT(*) AS total FROM exceptions e ${joinClause} ${whereClause}`,
      ...params,
    )) as { total: number }[])[0];
    const total = totalRow?.total || 0;

    // Group by reason (first sentence / simple keyword match)
    const byType = (await this.database.sql(
      `SELECT
         CASE
           WHEN e.reason LIKE '%price%' OR e.reason LIKE '%unit%' THEN 'Price Mismatch'
           WHEN e.reason LIKE '%qty%'  OR e.reason LIKE '%quantity%' THEN 'Quantity Mismatch'
           WHEN e.reason LIKE '%PO%'  OR e.reason LIKE '%not found%' THEN 'Missing PO'
           WHEN e.reason LIKE '%HS%'  OR e.reason LIKE '%code%'      THEN 'Missing HS Code'
           ELSE 'Other'
         END AS reason,
         COUNT(*) AS count
       FROM exceptions e ${joinClause} ${whereClause}
       GROUP BY reason
       ORDER BY count DESC`,
      ...params,
    )) as { reason: string; count: number }[];

    const byStatus = (await this.database.sql(
      `SELECT e.status, COUNT(*) AS count
       FROM exceptions e ${joinClause} ${whereClause}
       GROUP BY e.status`,
      ...params,
    )) as { status: string; count: number }[];

    // By vendor requires the join always
    const vendorParams: unknown[] = [];
    const vendorDateWhere: string[] = [];
    if (filters.dateFrom) { vendorDateWhere.push('e.created_at >= ?'); vendorParams.push(filters.dateFrom); }
    if (filters.dateTo)   { vendorDateWhere.push('e.created_at <= ?'); vendorParams.push(filters.dateTo + 'T23:59:59'); }
    if (filters.vendor)   { vendorDateWhere.push('i.vendor = ?');      vendorParams.push(filters.vendor); }
    const vendorWhere = vendorDateWhere.length ? `WHERE ${vendorDateWhere.join(' AND ')}` : '';

    const byVendor = (await this.database.sql(
      `SELECT i.vendor, COUNT(*) AS count
       FROM exceptions e
       LEFT JOIN invoices i ON e.invoice_number = i.invoice_number
       ${vendorWhere}
       GROUP BY i.vendor
       ORDER BY count DESC
       LIMIT 10`,
      ...vendorParams,
    )) as { vendor: string; count: number }[];

    return {
      total,
      byType:   byType.map((r) => ({
        reason:     r.reason,
        count:      Number(r.count),
        percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
      })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      byVendor: byVendor.map((r) => ({ vendor: r.vendor ?? 'Unknown', count: Number(r.count) })),
    };
  }

  // ── Vendor Scorecard ──────────────────────────────────────────────────────

  async getVendorScorecard(vendor: string): Promise<VendorScorecard> {
    const totals = ((await this.database.sql(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Auto-approved' THEN 1 ELSE 0 END) AS auto_approved,
         SUM(CASE WHEN status = 'Flagged'       THEN 1 ELSE 0 END) AS flagged
       FROM invoices WHERE vendor = ?`,
      vendor,
    )) as Record<string, number>[])[0] ?? {};

    const total        = Number(totals['total'])        || 0;
    const autoApproved = Number(totals['auto_approved']) || 0;
    const flagged      = Number(totals['flagged'])       || 0;
    const mismatchRate = total > 0 ? Math.round((flagged / total) * 1000) / 10 : 0;

    const openExRow = ((await this.database.sql(
      `SELECT COUNT(*) AS count
       FROM exceptions e
       LEFT JOIN invoices i ON e.invoice_number = i.invoice_number
       WHERE i.vendor = ? AND e.status IN ('flagged','under_review')`,
      vendor,
    )) as { count: number }[])[0];
    const openExceptions = Number(openExRow?.count) || 0;

    const recentInvoices = (await this.database.sql(
      `SELECT invoice_number, status, created_at
       FROM invoices WHERE vendor = ?
       ORDER BY created_at DESC LIMIT 5`,
      vendor,
    )) as { invoice_number: string; status: string; created_at: string }[];

    return {
      vendor,
      totalInvoices:    total,
      autoApproved,
      flagged,
      mismatchRate,
      avgCycleTimeSecs: 0, // placeholder — full cycle time needs start/end timestamps on workflow
      openExceptions,
      recentInvoices:   recentInvoices.map((r) => ({
        invoiceNumber: r.invoice_number,
        status:        r.status,
        createdAt:     r.created_at,
      })),
    };
  }

  // ── Refresh daily summary ─────────────────────────────────────────────────

  async refreshDailySummary(): Promise<{ date: string; refreshedAt: string }> {
    const today = new Date().toISOString().slice(0, 10);

    const totals = ((await this.database.sql(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Auto-approved' THEN 1 ELSE 0 END) AS auto_approved,
         SUM(CASE WHEN status = 'Flagged'       THEN 1 ELSE 0 END) AS flagged,
         SUM(CASE WHEN status = 'exception'     THEN 1 ELSE 0 END) AS exception_count
       FROM invoices WHERE date(created_at) = ?`,
      today,
    )) as Record<string, number>[])[0] ?? {};

    const total        = Number(totals['total'])          || 0;
    const autoApproved = Number(totals['auto_approved'])  || 0;
    const exCount      = Number(totals['exception_count']) || 0;
    const flagged      = Number(totals['flagged'])         || 0;
    const stpRate      = total > 0 ? autoApproved / total : 0;

    const exTotals = ((await this.database.sql(
      `SELECT COUNT(*) AS total FROM exceptions WHERE date(created_at) = ?`,
      today,
    )) as { total: number }[])[0];

    const refreshedAt = new Date().toISOString();

    await this.database.sql(
      `INSERT INTO analytics_daily_summary
         (date, invoice_count, exception_count, avg_cycle_time_seconds,
          stp_rate, auto_approved_count, flagged_count, exception_status_count, refreshed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         invoice_count          = excluded.invoice_count,
         exception_count        = excluded.exception_count,
         avg_cycle_time_seconds = excluded.avg_cycle_time_seconds,
         stp_rate               = excluded.stp_rate,
         auto_approved_count    = excluded.auto_approved_count,
         flagged_count          = excluded.flagged_count,
         exception_status_count = excluded.exception_status_count,
         refreshed_at           = excluded.refreshed_at`,
      today, total, Number(exTotals?.total) || 0, 0,
      stpRate, autoApproved, flagged, exCount, refreshedAt,
    );

    return { date: today, refreshedAt };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildWhereClause(
    filters: AnalyticsFilters,
    alias: string,
  ): { whereClause: string; params: unknown[] } {
    const clauses: string[] = [];
    const params:  unknown[] = [];
    if (filters.dateFrom) { clauses.push(`${alias}.created_at >= ?`);             params.push(filters.dateFrom); }
    if (filters.dateTo)   { clauses.push(`${alias}.created_at <= ?`);             params.push(filters.dateTo + 'T23:59:59'); }
    if (filters.vendor)   { clauses.push(`${alias}.vendor = ?`);                  params.push(filters.vendor); }
    return {
      whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }
}
