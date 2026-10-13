import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { InboundService } from './services/inbound.service.js';
import { SupplierService } from './services/supplier.service.js';
import { McpClientsService } from '../../services/mcp-clients.service.js';

/**
 * Supply Chain Agent — Inbound Tools
 *
 * Handles: UC1 (Damaged Freight Dispute) and UC4 (QC Failure & Supplier Penalization)
 * Agent: Supply Chain Agent
 * Stage: Stage 1 — Inbound & Receiving
 */
@Controller('supply_chain')
export class SupplyChainInboundTools {
  private readonly inboundService = new InboundService();
  private readonly supplierService = new SupplierService();
  private readonly mcpClients = new McpClientsService();

  // ══════════════════════════════════════════════════════════
  // USE CASE 1: Damaged Freight Dispute & Emergency Sourcing
  // ══════════════════════════════════════════════════════════

  /**
   * TOOL 1 — read_delivery_receipt_ocr
   * Reads a damaged freight photo and extracts PO ID + damaged item count.
   * Accepts a base64-encoded image upload from the warehouse worker.
   */
  @Tool({
    name: 'read_delivery_receipt_ocr',
    description:
      'Analyzes a photo of a damaged freight delivery (uploaded by a warehouse worker) using OCR. ' +
      'Extracts the Purchase Order ID, item SKU, total delivered quantity, and the count of damaged/unusable units. ' +
      'Always call this first when a worker reports physical damage to an inbound shipment. ' +
      'Returns structured damage metadata needed for downstream ATP and sourcing checks.',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded delivery photo (e.g. "dock_damage_photo.jpg")'),
      file_type: z.string().describe('MIME type of the uploaded file (e.g. "image/jpeg")'),
      file_content: z.string().describe('Base64-encoded photo of the damaged freight. Injected by the client.'),
      forced_damaged_qty: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Override: manually specify the damaged unit count if OCR confidence is low.'),
    }),
  })
  @Widget('shipment-incident-card')
  async readDeliveryReceiptOcr(input: {
    file_name: string;
    file_type: string;
    file_content: string;
    forced_damaged_qty?: number;
  }, ctx: ExecutionContext) {
    ctx.logger.info('Processing delivery receipt OCR', {
      fileName: input.file_name,
      fileType: input.file_type,
    });

    const result = this.inboundService.extractOcrData(
      input.file_content,
      input.forced_damaged_qty
    );

    ctx.logger.info('OCR extraction complete', { poId: result.poId, damagedQty: result.damagedQty });
    return result;
  }

  /**
   * TOOL 2 — check_order_impact
   * Runs Available-to-Promise (ATP) math to determine if the damage causes an SLA breach.
   * Must be called after read_delivery_receipt_ocr with the extracted PO ID.
   */
  @Tool({
    name: 'check_order_impact',
    description:
      'Calculates the Available-to-Promise (ATP) impact of damaged goods on a customer order. ' +
      'Performs deterministic math: survivingQty = orderedQty - damagedQty; shortfall = requiredQty - survivingQty. ' +
      'Determines SLA breach risk (RED/AMBER/GREEN) and financial exposure in USD. ' +
      'Call this after read_delivery_receipt_ocr to quantify the business impact before deciding on sourcing.',
    inputSchema: z.object({
      po_id: z.string().describe('Purchase Order ID extracted from the OCR tool (e.g. "PO-2024-001")'),
      damaged_qty: z
        .number()
        .int()
        .min(0)
        .describe('Number of damaged units as confirmed by the OCR tool'),
    }),
  })
  async checkOrderImpact(
    input: { po_id: string; damaged_qty: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Running ATP check', { poId: input.po_id, damagedQty: input.damaged_qty });

    const result = this.inboundService.calculateATP(input.po_id, input.damaged_qty);

    ctx.logger.info('ATP check complete', {
      riskLevel: result.riskLevel,
      shortfall: result.shortfallQty,
      slaBreached: result.slaBreached,
    });

    return result;
  }

  /**
   * TOOL 3 — find_alternate_supplier
   * Queries the mock Airtable/vendor database to find the best backup supplier for the shortfall.
   */
  @Tool({
    name: 'find_alternate_supplier',
    description:
      'Searches the vendor database for alternate suppliers capable of fulfilling a shortfall quantity for a specific SKU. ' +
      'Ranks candidates by reliability score (descending) and lead time (ascending). ' +
      'Returns the best match with estimated cost and SLA feasibility. ' +
      'Call this after check_order_impact confirms a RED or AMBER risk level. ' +
      'Do NOT raise a PO without calling this tool first.',
    inputSchema: z.object({
      sku: z
        .string()
        .describe('Item SKU to source (e.g. "SKU-BRAKE-PAD-X1"). Use the SKU from the OCR result.'),
      required_qty: z
        .number()
        .int()
        .positive()
        .describe('Number of units needed from the alternate supplier (i.e., the shortfall quantity)'),
      base_unit_cost_usd: z
        .number()
        .positive()
        .describe('Unit cost of the item from the primary supplier in USD, used to estimate alternate cost'),
    }),
  })
  async findAlternateSupplier(
    input: { sku: string; required_qty: number; base_unit_cost_usd: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Searching for alternate supplier', { sku: input.sku, qty: input.required_qty });

    const result = this.supplierService.findAlternate(
      input.sku,
      input.required_qty,
      input.base_unit_cost_usd
    );

    ctx.logger.info('Alternate supplier search complete', {
      found: result.found,
      canMeetSla: result.canMeetSla,
    });

    return result;
  }

  /**
   * TOOL 4 — raise_emergency_po
   * Creates an Emergency Purchase Order. Status starts as HITL_PENDING.
   * The EmergencyPOApproval widget renders an [Approve]/[Reject] button for the manager.
   * Only dispatches Slack notification AFTER human approval (approved = true).
   */
  @Tool({
    name: 'raise_emergency_po',
    description:
      'Creates an Emergency Purchase Order (EPO) with a specific alternate supplier. ' +
      'CRITICAL: This tool ALWAYS starts with status = HITL_PENDING and renders a Human-in-the-Loop approval widget. ' +
      'The manager MUST click [Approve Emergency PO] in the widget before the PO is dispatched or Slack notified. ' +
      'Pass approved=false on first call (system generates the PO record and pauses). ' +
      'Pass approved=true ONLY when the manager has explicitly clicked Approve. ' +
      'Call find_alternate_supplier before this tool to get the supplierId.',
    inputSchema: z.object({
      supplier_id: z
        .string()
        .describe('Supplier ID from find_alternate_supplier result (e.g. "SUPP-BACKUP-ALPHA")'),
      sku: z.string().describe('Item SKU to order'),
      qty: z.number().int().positive().describe('Quantity to order'),
      linked_original_po_id: z
        .string()
        .describe('The original damaged PO ID this emergency PO is replacing'),
      estimated_total_cost_usd: z
        .number()
        .positive()
        .describe('Total estimated cost in USD (qty × unit price × supplier multiplier)'),
      approved: z
        .boolean()
        .describe(
          'Set to false to create HITL_PENDING PO (default first call). ' +
          'Set to true ONLY after the human manager has clicked [Approve] in the EmergencyPOApproval widget.'
        ),
    }),
  })
  @Widget('emergency-po-approval')
  async raiseEmergencyPo(
    input: {
      supplier_id: string;
      sku: string;
      qty: number;
      linked_original_po_id: string;
      estimated_total_cost_usd: number;
      approved: boolean;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Raising emergency PO', {
      supplierId: input.supplier_id,
      sku: input.sku,
      qty: input.qty,
      approved: input.approved,
    });

    const result = this.supplierService.raisePo(
      input.supplier_id,
      input.sku,
      input.qty,
      input.linked_original_po_id,
      input.estimated_total_cost_usd,
      input.approved
    );

    ctx.logger.info('Emergency PO created', { poId: result.poId, status: result.status });

    if (result.status === 'APPROVED') {
      ctx.logger.info('HITL Approved — Slack notification dispatched', {
        channel: result.slackPayload.channel,
      });
      // Fire Slack message
      await this.mcpClients.sendSlackMessage(
        result.slackPayload.channel,
        result.slackPayload.text
      );

      // Fire Gmail email
      const emailSubject = `Emergency PO ${result.poId} - ${result.sku}`;
      const emailBody = `An Emergency Purchase Order has been approved.\n\nPO ID: ${result.poId}\nSKU: ${result.sku}\nQuantity: ${result.qty}\nTotal Cost: $${result.estimatedTotalCostUsd}\nEstimated Delivery: ${result.estimatedDeliveryDate}`;
      
      await this.mcpClients.sendGmailEmail(
        process.env.SMTP_USER || 'procurement@alphaauto.in', // Use SMTP user to loopback the test email
        emailSubject,
        emailBody
      );
    }

    return result;
  }

  // ══════════════════════════════════════════════════════════
  // USE CASE 4: Quality Control Failure & Supplier Penalization
  // ══════════════════════════════════════════════════════════

  /**
   * TOOL 5 — log_qc_failure
   * Logs a QC failure and applies a Bayesian reliability penalty to the supplier score.
   * Formula: newScore = currentScore × (1 - 0.01)^affectedQty (capped at 30 units per event)
   */
  @Tool({
    name: 'log_qc_failure',
    description:
      'Logs a Quality Control (QC) failure for received goods and applies a mathematical reliability penalty to the supplier score. ' +
      'Uses formula: newScore = currentScore × (1 - penaltyRate)^affectedQty where penaltyRate = 0.01 per unit. ' +
      'The supplier reliability score is used in future find_alternate_supplier rankings. ' +
      'Call this when QC inspection reveals wrong specification, wrong color, or non-conforming goods — even if undamaged. ' +
      'HITL NOTE: This is a penalization action. The Orchestrator should confirm with the manager before calling this tool.',
    inputSchema: z.object({
      item_id: z
        .string()
        .describe('Item SKU / ID of the non-conforming goods (e.g. "SKU-BRAKE-PAD-X1")'),
      defect_type: z
        .string()
        .describe(
          'Description of the defect (e.g. "Wrong specification — Grade B instead of Grade A", "Incorrect color — red instead of black")'
        ),
      affected_qty: z
        .number()
        .int()
        .positive()
        .describe('Number of units that failed QC inspection'),
    }),
  })
  async logQcFailure(
    input: { item_id: string; defect_type: string; affected_qty: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Logging QC failure', {
      itemId: input.item_id,
      defect: input.defect_type,
      qty: input.affected_qty,
    });

    const result = this.inboundService.logQcFailureRecord(
      input.item_id,
      input.defect_type,
      input.affected_qty
    );

    ctx.logger.warn('QC failure recorded — supplier reliability updated', {
      supplierId: result.supplierId,
      previousScore: result.previousScore,
      newScore: result.newScore,
    });

    return result;
  }

  /**
   * TOOL 6 — generate_rma_document
   * Creates a Return Merchandise Authorization (RMA) for sending non-conforming goods back.
   */
  @Tool({
    name: 'generate_rma_document',
    description:
      'Generates a Return Merchandise Authorization (RMA) document for non-conforming or failed QC goods. ' +
      'Creates a formal return record with RMA ID, return instructions, and estimated credit value. ' +
      'Call this after log_qc_failure to create the paperwork for returning goods to the supplier. ' +
      'The RMA document should be printed and attached to the return shipment.',
    inputSchema: z.object({
      po_id: z
        .string()
        .describe('Purchase Order ID under which the non-conforming goods arrived'),
      item_id: z.string().describe('Item SKU / ID to be returned'),
      qty: z.number().int().positive().describe('Quantity of units to return'),
      reason: z
        .string()
        .describe(
          'Formal reason for return (e.g. "QC Failure: Incorrect specification. Grade B delivered, Grade A ordered.")'
        ),
      recipient_email: z.string().email().optional().describe('Optional email address to send the RMA document to'),
    }),
  })
  async generateRmaDocument(
    input: { po_id: string; item_id: string; qty: number; reason: string; recipient_email?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Generating RMA document', {
      poId: input.po_id,
      itemId: input.item_id,
      qty: input.qty,
    });

    const result = this.inboundService.generateRmaRecord(
      input.po_id,
      input.item_id,
      input.qty,
      input.reason
    );

    ctx.logger.info('RMA document created', { rmaId: result.rmaId, status: result.status });

    // Fire Gmail email with RMA details
    const emailSubject = `RMA Generated: ${result.rmaId} for PO ${result.poId}`;
    const emailBody = `A Return Merchandise Authorization (RMA) has been generated.\n\nRMA ID: ${result.rmaId}\nPO ID: ${result.poId}\nItem: ${result.itemId}\nQuantity: ${result.qty}\nReason: ${result.reason}\n\nInstructions: ${result.returnInstruction}\nEstimated Credit: $${result.estimatedCreditUsd}`;
    
    await this.mcpClients.sendGmailEmail(
      input.recipient_email || process.env.SMTP_USER || 'returns@supplier.com', // Use provided email or fallback
      emailSubject,
      emailBody
    );

    return result;
  }

  // ══════════════════════════════════════════════════════════
  // STAGE 3: Inventory Control, Telemetry & Holding
  // ══════════════════════════════════════════════════════════

  /**
   * calculate_days_of_supply
   * Triggers Use Case 3 (Real-Time Stockout).
   */
  @Tool({
    name: 'calculate_days_of_supply',
    description:
      'Calculates the Days of Supply (DOS) for a given SKU based on current stock levels and daily consumption rate. ' +
      'Identifies if the SKU is falling below the safety threshold.',
    inputSchema: z.object({
      sku: z.string().describe('The SKU to analyze (e.g. "SKU-104")'),
    }),
  })
  async calculateDaysOfSupply(
    input: { sku: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Calculating DOS for SKU', input);

    // Mock logic: Returns critical DOS for SKU-104
    if (input.sku === 'SKU-104') {
      await this.mcpClients.sendSlackMessage(
        '#procurement-team',
        `⚠️ *STOCKOUT WARNING:* ${input.sku} is down to 3 days of supply (Safety threshold is 7 days). Auto-replenishment PO draft generated.`
      );

      return {
        sku: 'SKU-104',
        currentStock: 150,
        dailyConsumptionRate: 50,
        daysOfSupply: 3,
        safetyThresholdDays: 7,
        status: 'CRITICAL',
        message: 'Days of supply (3 days) has fallen below the safety threshold (7 days). Replenishment required immediately.'
      };
    }

    return {
      sku: input.sku,
      currentStock: 1200,
      dailyConsumptionRate: 40,
      daysOfSupply: 30,
      safetyThresholdDays: 7,
      status: 'HEALTHY',
      message: 'Stock levels are healthy.'
    };
  }
}
