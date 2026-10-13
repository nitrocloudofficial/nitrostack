import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ExecutionContext,
  Widget,
  z,
} from '@nitrostack/core';
import { ValidationService } from './validation.service.js';
import { ExceptionService } from './exception.service.js';
import { WorkflowEngine, type StepHandler } from './workflow.engine.js';
import { WorkflowContextStore } from './workflow-context.store.js';
import { SopLoaderService } from './sop-loader.service.js';
import { InvoiceRepository } from './invoice.repository.js';
import { MasterDataService } from '../master-data/master-data.service.js';
import { MasterDataTools } from '../master-data/master-data.tools.js';
import { IngestionTools } from '../ingestion/ingestion.tools.js';
import { ComplianceTools } from '../compliance/compliance.tools.js';
import { AuditLogService } from '../../shared/audit-log.service.js';
import { AlertService }    from '../communication/alert.service.js';
import { ApInvoiceService } from '../ap-invoice/ap-invoice.service.js';
import {
  ExtractedInvoiceSchema,
  PurchaseOrderSchema,
  ValidationResultSchema,
  type ExtractedInvoice,
  type PurchaseOrder,
  type ValidationResult,
} from '../../shared/schemas.js';

// ─── helper: build a short plain-English summary from engine output ───────────

function buildSummary(
  status: string,
  data: Record<string, unknown>,
  exitStep?: string,
  exitReason?: string,
): string {
  // Compliance BLOCKED — surface the reason directly
  const compliance = data['complianceResult'] as { status?: string; matches?: Array<{ entity_name: string; reason: string }> } | undefined;
  if (compliance?.status === 'BLOCKED') {
    const match   = compliance.matches?.[0];
    const invoice = data['invoice'] as ExtractedInvoice | undefined;
    const vendor  = invoice?.vendor ?? match?.entity_name ?? 'Unknown vendor';
    return `Vendor "${vendor}" is on the denied parties list and has been BLOCKED. Reason: ${match?.reason ?? exitReason ?? 'compliance violation'}. Workflow halted — routed to legal_team.`;
  }

  if (status === 'failed') {
    return `Workflow failed at step "${exitStep}": ${exitReason}`;
  }

  const invoice = data['invoice'] as ExtractedInvoice | undefined;
  const vr      = data['validationResult'] as ValidationResult | undefined;

  if (vr?.status === 'mismatch') {
    return `Mismatch detected on invoice ${invoice?.invoiceNumber ?? ''}. Discrepancies: ${vr.discrepancies.join('; ')}`;
  }
  if (data['__po_missing']) {
    return `PO ${(data['poNumber'] as string) ?? ''} not found in master data. Routed to procurement_team.`;
  }
  if (invoice) {
    return `Invoice ${invoice.invoiceNumber} matched PO ${invoice.poNumber} successfully.`;
  }
  return 'Workflow completed.';
}

// ─── helper: resolve final workflow status label ──────────────────────────────

function resolveStatus(
  engineStatus: string,
  data: Record<string, unknown>,
): string {
  // Compliance BLOCKED aborts the engine with status 'failed' — normalise to
  // 'exception' so analytics SQL (which counts status = 'exception') stays consistent.
  if (engineStatus === 'failed') {
    const compliance = data['complianceResult'] as { status?: string } | undefined;
    return compliance?.status === 'BLOCKED' ? 'exception' : 'exception';
  }
  const vr = data['validationResult'] as ValidationResult | undefined;
  if (vr?.status === 'mismatch') return 'Flagged';
  if (data['__po_missing'])       return 'exception';
  const classification = data['classification'] as { docType: string } | undefined;
  if (classification?.docType !== 'invoice') return 'aborted';

  // Check AP result for final status
  const apResult = data['apResult'] as { status?: string } | undefined;
  if (apResult?.status === 'auto_approved')    return 'Auto-approved';
  if (apResult?.status === 'pending_approval') return 'Pending-approval';
  if (apResult?.status === 'duplicate')        return 'Duplicate';

  return 'Auto-approved';
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('orchestrator')
export class OrchestratorTools {
  constructor(
    private readonly validation:      ValidationService,
    private readonly exceptions:      ExceptionService,
    private readonly engine:          WorkflowEngine,
    private readonly store:           WorkflowContextStore,
    private readonly sop:             SopLoaderService,
    private readonly invoiceRepo:     InvoiceRepository,
    private readonly masterData:      MasterDataService,
    private readonly masterDataTools: MasterDataTools,
    private readonly ingestion:       IngestionTools,
    private readonly complianceTools: ComplianceTools,
    private readonly auditLog:        AuditLogService,
    private readonly apInvoice:       ApInvoiceService,
    private readonly alertService:    AlertService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // execute_workflow
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'execute_workflow',
    description:
      'Run the full invoice processing SOP pipeline (sop_rules.yaml): ' +
      'classify → extract → compliance_check → validate_po → hs_code → match → process_ap_invoice. ' +
      'ALWAYS invoke this tool via a real tool call — never simulate or summarise results without calling it. ' +
      'Pass the plain-text (or base64) invoice document content. ' +
      '\n\nPossible status values returned in the output: ' +
      '"Auto-approved" (PO matched, AP record created), ' +
      '"Pending-approval" (above auto-approval threshold), ' +
      '"Duplicate" (invoice already processed), ' +
      '"Flagged" (price/qty mismatch — routed to finance_team), ' +
      '"exception" (vendor BLOCKED by compliance OR missing PO — routed to legal_team / procurement_team). ' +
      '\nThe @Widget("invoice-result") React component handles ALL status variants including BLOCKED — ' +
      'do not generate alternative or speculative UI for any status. ' +
      'Output object includes: invoice, po, validationResult, hsCodeResult, complianceResult, apResult.',
    inputSchema: z.object({
      workflowId: z.literal('invoice_processing'),
      input: z.object({
        file_name:    z.string().describe('Document filename (e.g. invoice_001.txt)'),
        file_content: z.string().describe('Plain-text document content (or base64 for PDF)'),
        file_type:    z.string().default('text/plain').describe('MIME type'),
      }),
    }),
    outputSchema: z.object({
      workflowRunId: z.string(),
      status:        z.string(),
      summary:       z.string(),
      stepResults:   z.array(z.any()),
      output:        z.any(),
    }),
  })
  @Widget('invoice-result')
  async executeWorkflow(
    input: {
      workflowId: 'invoice_processing';
      input: { file_name: string; file_content: string; file_type: string };
    },
    ctx: ExecutionContext,
  ) {
    const t0 = Date.now();
    const { file_name, file_content, file_type } = input.input;

    // ── Register step handlers (name matches sop_rules.yaml step.name) ────────

    const handlers = new Map<string, StepHandler>([

      // ── Step: classify ────────────────────────────────────────────────────
      ['classify', async (_step: string, data: Record<string, unknown>, c: ExecutionContext) => {
        const classification = await this.ingestion.classifyDocument(
          { filename: file_name, content: file_content },
          c,
        );
        if (classification.docType !== 'invoice') {
          // Signal downstream steps that we aborted early
          throw new Error(
            `Document classified as "${classification.docType}" (confidence: ${classification.confidence}). ` +
            'Only invoice documents are processed.',
          );
        }
        return { classification };
      }],

      // ── Step: extract ─────────────────────────────────────────────────────
      ['extract', async (_step: string, data: Record<string, unknown>, c: ExecutionContext) => {
        const invoice = await this.ingestion.extractDocumentData(
          { content: file_content, mimeType: file_type },
          c,
        );
        return { invoice };
      }],

      // ── Step: compliance_check ─────────────────────────────────────────────
      ['compliance_check', async (_step: string, data: Record<string, unknown>, c: ExecutionContext) => {
        const invoice = data['invoice'] as ExtractedInvoice;
        if (!invoice?.vendor) return {};

        const result = await this.complianceTools.screenVendor({ vendorName: invoice.vendor }, c);
        
        if (result.status === 'BLOCKED') {
          const runId = data['__workflowRunId'] as string ?? 'unknown';
          const reason = `Vendor "${invoice.vendor}" is on the denied parties list (${result.matches[0]?.reason})`;
          await this.exceptions.flag(runId, reason, result);
          console.error(`[ROUTE_TASK → legal_team] Compliance violation: ${reason}`);
          
          throw new Error(reason); // Halts workflow due to "flag_and_abort" in SOP
        }
        return { complianceResult: result };
      }],

      // ── Step: validate_po ─────────────────────────────────────────────────
      ['validate_po', async (_step: string, data: Record<string, unknown>, c: ExecutionContext) => {
        const invoice = data['invoice'] as ExtractedInvoice;
        if (!invoice?.poNumber) {
          throw new Error('No poNumber found in extracted invoice data.');
        }

        const result = await this.masterDataTools.validateAgainstMasterData(
          { sku: invoice.lineItems[0]?.sku ?? '', poNumber: invoice.poNumber },
          c,
        );

        if (!result.exists || !result.poRecord) {
          // Flag missing PO — still want to run hs_code step, so we inject a sentinel
          await this.exceptions.flag(
            data['__workflowRunId'] as string ?? 'unknown',
            `PO ${invoice.poNumber} not found in master data`,
            { poNumber: invoice.poNumber },
          );
          console.error(
            `[ROUTE_TASK → procurement_team] Missing PO ${invoice.poNumber}`,
          );
          return { __po_missing: true, poNumber: invoice.poNumber, masterDataResult: result };
        }

        return { masterDataResult: result, po: result.poRecord };
      }],

      // ── Step: hs_code ─────────────────────────────────────────────────────
      ['hs_code', async (_step: string, data: Record<string, unknown>, c: ExecutionContext) => {
        const invoice = data['invoice'] as ExtractedInvoice | undefined;
        const description = invoice?.lineItems[0]?.description ?? '';
        if (!description) return { hsCodeResult: null };

        const hsCodeResult = await this.masterDataTools.recommendHsCode(
          { productDescription: description },
          c,
        );
        return { hsCodeResult };
      }],

      // ── Step: match ───────────────────────────────────────────────────────
      ['match', async (_step: string, data: Record<string, unknown>, c: ExecutionContext) => {
        if (data['__po_missing']) {
          // Can't match without a PO — skip gracefully
          return { validationResult: { status: 'exception', discrepancies: ['PO not found'] } };
        }

        const invoice = data['invoice'] as ExtractedInvoice;
        const po      = data['po'] as PurchaseOrder;

        const validationResult = await this.matchInvoiceToPO({ invoice, po }, c);

        if (validationResult.status === 'mismatch') {
          await this.exceptions.flag(
            data['__workflowRunId'] as string ?? 'unknown',
            'Invoice/PO mismatch detected',
            validationResult,
          );
          console.error(
            `[ROUTE_TASK → finance_team] Mismatch on invoice ${invoice.invoiceNumber}`,
          );
        }

        return { validationResult };
      }],

      // ── Step: process_ap_invoice ──────────────────────────────────────────
      ['process_ap_invoice', async (_step: string, data: Record<string, unknown>, c: ExecutionContext) => {
        if (data['__po_missing']) {
          // Can't process AP without a matched PO
          return { apResult: { status: 'exception', message: 'PO not found — AP invoice skipped' } };
        }

        const invoice       = data['invoice'] as ExtractedInvoice;
        const po            = data['po'] as PurchaseOrder;
        const workflowRunId = data['__workflowRunId'] as string ?? 'unknown';

        const apResult = await this.apInvoice.processApInvoice({
          invoice,
          po,
          workflowId: workflowRunId,
          idempotencyKey: workflowRunId,
        });

        c.logger?.info(
          `[process_ap_invoice] Invoice ${invoice.invoiceNumber}: ${apResult.status}`,
        );

        return { apResult };
      }],
    ]);

    // ── Run the engine ────────────────────────────────────────────────────────
    const result = await this.engine.run('invoice_processing', {}, handlers, ctx);

    // Inject workflowRunId into data so step handlers can reference it
    result.data['__workflowRunId'] = result.workflowId;

    const finalStatus  = resolveStatus(result.status, result.data);
    const finalSummary = buildSummary(result.status, result.data, result.exitStep, result.exitReason);

    // ── Persist invoice to SQLite for analytics ────────────────────────────
    const invoice = result.data['invoice'] as ExtractedInvoice | undefined;
    if (invoice) {
      try {
        await this.invoiceRepo.save(invoice, finalStatus, result.workflowId);
      } catch (err) {
        console.error('[OrchestratorTools] Failed to persist invoice:', err);
      }
    }

    // ── Write audit log entry ─────────────────────────────────────────────
    await this.auditLog.log({
      workflowId:  result.workflowId,
      toolName:    'execute_workflow',
      input:       { file_name, file_type },
      output:      { status: finalStatus, stepCount: result.stepResults.length },
      status:      result.status === 'completed' ? 'success' : 'error',
      errorMsg:    result.exitReason,
      durationMs:  Date.now() - t0,
    });

    return {
      workflowRunId: result.workflowId,
      status:        finalStatus,
      summary:       finalSummary,
      stepResults:   result.stepResults,
      output: {
        invoice:          result.data['invoice'],
        po:               result.data['po'],
        validationResult: result.data['validationResult'],
        hsCodeResult:     result.data['hsCodeResult'],
        complianceResult: result.data['complianceResult'],
        classification:   result.data['classification'],
        apResult:         result.data['apResult'],
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // get_workflow_status
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'get_workflow_status',
    description:
      'Retrieve the current status, step results, and output of a previously executed workflow run. ' +
      'Pass the workflowRunId returned by execute_workflow.',
    inputSchema: z.object({
      workflowRunId: z.string().describe('The workflowRunId returned by execute_workflow'),
    }),
    outputSchema: z.object({
      found:        z.boolean(),
      run:          z.any().optional(),
    }),
  })
  async getWorkflowStatus(input: { workflowRunId: string }, _ctx: ExecutionContext) {
    const run = this.store.get(input.workflowRunId);
    return { found: !!run, run: run ?? undefined };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // list_workflow_runs
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'list_workflow_runs',
    description: 'List all workflow runs executed in the current server session (most recent first).',
    inputSchema: z.object({}),
    outputSchema: z.object({
      runs: z.array(z.any()),
      total: z.number(),
    }),
  })
  async listWorkflowRuns(_input: Record<string, never>, _ctx: ExecutionContext) {
    const runs = this.store.listAll();
    return { runs, total: runs.length };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // match_invoice_to_po  (standalone — usable without full workflow)
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'match_invoice_to_po',
    description:
      'Compare an extracted invoice against a purchase order. ' +
      'Returns match/mismatch/exception status with discrepancy details. ' +
      'Qty or price difference >1% is treated as a mismatch.',
    inputSchema: z.object({
      invoice: ExtractedInvoiceSchema.describe('The extracted invoice data'),
      po:      PurchaseOrderSchema.describe('The purchase order to match against'),
    }),
    outputSchema: ValidationResultSchema,
  })
  async matchInvoiceToPO(
    input: { invoice: ExtractedInvoice; po: PurchaseOrder },
    _ctx?: ExecutionContext,
  ): Promise<ValidationResult> {
    return this.validation.matchInvoiceToPO(input.invoice, input.po);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // flag_exception  (standalone — usable without full workflow)
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'flag_exception',
    description: 'Log a workflow exception to the exceptions DB table.',
    inputSchema: z.object({
      workflowId: z.string().describe('Workflow run identifier'),
      reason:     z.string().describe('Human-readable reason for the exception'),
      data:       z.any().describe('Arbitrary payload'),
    }),
    outputSchema: z.object({
      exceptionId: z.string(),
      status:      z.literal('flagged'),
    }),
  })
  async flagException(
    input: { workflowId: string; reason: string; data: unknown },
    _ctx: ExecutionContext,
  ) {
    const record = await this.exceptions.flag(input.workflowId, input.reason, input.data);
    return { exceptionId: record.exceptionId, status: 'flagged' as const };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // route_task  (Phase 2 — real queue-backed email via CommunicationModule)
  // ══════════════════════════════════════════════════════════════════════════

  @Tool({
    name: 'route_task',
    description:
      'Route a task to a stakeholder via email alert. Enqueues an email notification ' +
      'through the Communication module (queue-backed, async delivery). ' +
      'Use stakeholder as the recipient email address. ' +
      'Returns immediately — track delivery with the communication.get_alert_status tool.',
    inputSchema: z.object({
      task:        z.string().describe('Task description'),
      stakeholder: z.string().describe('Recipient email address or stakeholder name (e.g. finance_team@ale.com)'),
      priority:    z.enum(['low', 'medium', 'high']).default('medium'),
    }),
    outputSchema: z.object({
      routed:      z.boolean(),
      alertQueueId:z.number().nullable(),
      message:     z.string(),
    }),
  })
  async routeTask(
    input: { task: string; stakeholder: string; priority: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger?.info(`[OrchestratorTools] route_task → ${input.stakeholder} | priority=${input.priority}`);

    try {
      const recipient = input.stakeholder.includes('@')
        ? input.stakeholder
        : `${input.stakeholder.replace(/[^a-z0-9]/gi, '.')}@ale-scm.internal`;

      const { queueId } = await this.alertService.enqueue({
        recipient,
        template: 'task_routed',
        payload: {
          task:       input.task,
          priority:   input.priority,
          assignedBy: 'workflow_engine',
        },
      });

      await this.auditLog.log({
        toolName: 'route_task',
        input:    { stakeholder: input.stakeholder, priority: input.priority },
        output:   { alertQueueId: queueId },
      });

      return {
        routed:       true,
        alertQueueId: queueId,
        message:      `Task enqueued for ${recipient} (alert #${queueId}, priority=${input.priority}).`,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[OrchestratorTools] route_task failed to enqueue: ${errMsg}`);
      return {
        routed:       false,
        alertQueueId: null,
        message:      `Failed to enqueue alert: ${errMsg}`,
      };
    }
  }
}
