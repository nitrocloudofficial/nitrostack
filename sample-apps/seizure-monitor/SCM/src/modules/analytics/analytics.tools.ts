import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { AnalyticsService } from './analytics.service.js';
import { AuditLogService } from '../../shared/audit-log.service.js';

// ─── Shared filter schema ─────────────────────────────────────────────────────

const FiltersSchema = z.object({
  dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD, inclusive)'),
  dateTo:   z.string().optional().describe('End date filter (YYYY-MM-DD, inclusive)'),
  vendor:   z.string().optional().describe('Filter by exact vendor name'),
});

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('analytics')
export class AnalyticsTools {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly auditLog:  AuditLogService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // get_invoice_analytics
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_invoice_analytics',
    description:
      'Retrieve real invoice processing analytics from the SQLite invoices table: ' +
      'total volume, auto-approved count, flagged count, exception count, ' +
      'straight-through-processing (STP) rate (%), average cycle time, ' +
      'and volume breakdown by date and vendor. Supports date range and vendor filters. ' +
      '\n\nIMPORTANT: This is the ONLY correct tool for retrieving the STP rate. ' +
      'Do NOT use system health checks, do NOT fabricate percentages. ' +
      'Always call this tool and read the "stpRate" field from the response. ' +
      'For today\'s data use filters: { dateFrom: "YYYY-MM-DD", dateTo: "YYYY-MM-DD" }.',
    inputSchema: z.object({
      filters: FiltersSchema.optional().describe('Optional filters to narrow the report'),
    }),
    outputSchema: z.object({
      totalInvoices:       z.number(),
      autoApproved:        z.number(),
      flagged:             z.number(),
      exception:           z.number(),
      stpRate:             z.number().describe('Straight-through-processing rate (%)'),
      avgCycleTimeSeconds: z.number(),
      volumeByDate:        z.array(z.object({ date: z.string(), count: z.number() })),
      volumeByVendor:      z.array(z.object({ vendor: z.string(), count: z.number() })),
      filters:             z.any(),
    }),
  })
  async getInvoiceAnalytics(
    input: { filters?: { dateFrom?: string; dateTo?: string; vendor?: string } },
    ctx: ExecutionContext,
  ) {
    const t0 = Date.now();
    ctx.logger?.info('[AnalyticsTools] get_invoice_analytics called');
    const result = await this.analytics.getInvoiceAnalytics(input.filters ?? {});
    await this.auditLog.log({
      toolName:    'get_invoice_analytics',
      input:       input.filters,
      output:      { totalInvoices: result.totalInvoices, stpRate: result.stpRate },
      durationMs:  Date.now() - t0,
    });
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // get_exception_breakdown
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_exception_breakdown',
    description:
      'Get a breakdown of workflow exceptions grouped by discrepancy type (price mismatch, ' +
      'quantity mismatch, missing PO, missing HS code), by resolution status, and by vendor. ' +
      'Use this to identify the root causes of processing failures.',
    inputSchema: z.object({
      filters: FiltersSchema.optional(),
    }),
    outputSchema: z.object({
      total:    z.number(),
      byType:   z.array(z.object({ reason: z.string(), count: z.number(), percentage: z.number() })),
      byStatus: z.array(z.object({ status: z.string(), count: z.number() })),
      byVendor: z.array(z.object({ vendor: z.string(), count: z.number() })),
    }),
  })
  async getExceptionBreakdown(
    input: { filters?: { dateFrom?: string; dateTo?: string; vendor?: string } },
    ctx: ExecutionContext,
  ) {
    const t0 = Date.now();
    ctx.logger?.info('[AnalyticsTools] get_exception_breakdown called');
    const result = await this.analytics.getExceptionBreakdown(input.filters ?? {});
    await this.auditLog.log({
      toolName:   'get_exception_breakdown',
      input:      input.filters,
      output:     { total: result.total },
      durationMs: Date.now() - t0,
    });
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // get_vendor_scorecard
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_vendor_scorecard',
    description:
      'Retrieve a performance scorecard for a specific vendor: total invoices processed, ' +
      'auto-approved vs flagged count, mismatch rate (%), open exceptions, and the 5 most ' +
      'recent invoice statuses.',
    inputSchema: z.object({
      vendor: z.string().describe('Exact vendor name to score (e.g. "Acme Corp")'),
    }),
    outputSchema: z.object({
      vendor:          z.string(),
      totalInvoices:   z.number(),
      autoApproved:    z.number(),
      flagged:         z.number(),
      mismatchRate:    z.number().describe('Flagged / total as a percentage'),
      avgCycleTimeSecs:z.number(),
      openExceptions:  z.number(),
      recentInvoices:  z.array(z.object({
        invoiceNumber: z.string(),
        status:        z.string(),
        createdAt:     z.string(),
      })),
    }),
  })
  async getVendorScorecard(input: { vendor: string }, ctx: ExecutionContext) {
    const t0 = Date.now();
    ctx.logger?.info(`[AnalyticsTools] get_vendor_scorecard: ${input.vendor}`);
    const result = await this.analytics.getVendorScorecard(input.vendor);
    await this.auditLog.log({
      toolName:   'get_vendor_scorecard',
      input:      input,
      output:     { mismatchRate: result.mismatchRate, totalInvoices: result.totalInvoices },
      durationMs: Date.now() - t0,
    });
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // audit_transaction
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'audit_transaction',
    description:
      'Retrieve the full audit trail for a workflow run: every tool call, its input/output ' +
      'hash, status, duration, and timestamp. Use this to trace what happened during a ' +
      'specific invoice processing run.',
    inputSchema: z.object({
      workflowRunId: z.string().describe('The workflowRunId returned by execute_workflow'),
    }),
    outputSchema: z.object({
      workflowRunId: z.string(),
      entries:       z.array(z.object({
        id:          z.number(),
        tool_name:   z.string(),
        input_hash:  z.string(),
        output_hash: z.string().nullable(),
        status:      z.string(),
        error_msg:   z.string().nullable(),
        duration_ms: z.number().nullable(),
        created_at:  z.string(),
      })),
      total: z.number(),
    }),
  })
  async auditTransaction(input: { workflowRunId: string }, ctx: ExecutionContext) {
    ctx.logger?.info(`[AnalyticsTools] audit_transaction: ${input.workflowRunId}`);
    const entries = await this.auditLog.getByWorkflow(input.workflowRunId);
    return {
      workflowRunId: input.workflowRunId,
      entries,
      total: entries.length,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // refresh_analytics_summary
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'refresh_analytics_summary',
    description:
      "Recalculate today's analytics_daily_summary row from raw invoice data. " +
      'Call this after a batch of invoices has been processed, or schedule it every 15 minutes. ' +
      'Returns the date and timestamp of the refresh.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      date:        z.string(),
      refreshedAt: z.string(),
    }),
  })
  async refreshAnalyticsSummary(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger?.info('[AnalyticsTools] refresh_analytics_summary called');
    return this.analytics.refreshDailySummary();
  }
}
