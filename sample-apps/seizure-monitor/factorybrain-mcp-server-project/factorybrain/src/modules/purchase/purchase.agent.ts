import { Injectable, OnModuleInit } from '@nitrostack/core';
import { InventoryRequest, InventoryResponse } from '../inventory/inventory.types.js';
import { QueueService } from '../../services/queue.service.js';
import {
  ApprovalStatus,
  PurchaseAgentRequest,
  PurchaseRecommendation,
  PurchaseStatus,
  PurchaseUrgency,
} from './purchase.types.js';
import { PurchaseRequestService } from './purchase-request.service.js';
import { ScoringService } from './scoring.service.js';
import { SupplierService } from './supplier.service.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';

@Injectable({ deps: [SupplierService, ScoringService, PurchaseRequestService, QueueService] })
export class PurchaseAgent implements OnModuleInit {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly scoringService: ScoringService,
    private readonly purchaseRequests: PurchaseRequestService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queue.registerHandler('purchase', ORCHESTRATOR_JOBS.RUN_PURCHASE, async (event) => {
      await this.handleInventoryPartRequest(event as { payload: { request: InventoryRequest; inventory: InventoryResponse; ticket?: unknown; fulfillmentContext?: PurchaseAgentRequest['fulfillmentContext'] } });
    });
  }

  async handleInventoryPartRequest(event: { payload: { request: InventoryRequest; inventory: InventoryResponse; ticket?: unknown; fulfillmentContext?: PurchaseAgentRequest['fulfillmentContext'] } }): Promise<void> {
    const { request, inventory, ticket, fulfillmentContext } = event.payload;
    await this.recommendPurchase({
      partId: inventory.item?.partId ?? request.partId,
      partName: inventory.item?.partName ?? request.partName ?? request.partId ?? 'Unknown Part',
      inventoryId: inventory.item?.inventoryId,
      requestedQuantity: Math.max(request.quantity, inventory.item?.reorderLevel ?? request.quantity),
      urgency: PurchaseUrgency[request.urgency],
      requestReason: inventory.decision === 'out_of_stock' ? 'Out of Stock' : 'Low Stock - Below Reorder Level',
      unitCostGbp: inventory.item?.unitCostGbp,
      ticketId: request.ticketId,
      machineId: request.machineId,
      fulfillmentContext: fulfillmentContext ?? (inventory.reservation?.status === 'Reserved' ? 'stock_replenishment' : 'repair_blocking'),
    }, ticket);
  }

  async recommendPurchase(request: PurchaseAgentRequest, ticket?: unknown): Promise<PurchaseRecommendation> {
    const suppliers = this.supplierService.findSuppliersForPart(request.partName);
    if (suppliers.length === 0) {
      throw new Error(`No active suppliers found for ${request.partName}`);
    }

    const rankedSuppliers = this.scoringService.rankSuppliers({
      suppliers,
      urgency: request.urgency,
      requestedQuantity: request.requestedQuantity,
      unitCostGbp: request.unitCostGbp,
    });
    const selectedSupplier = rankedSuppliers[0];
    const purchaseRequest = await this.purchaseRequests.createRequest({
      requestDate: new Date().toISOString(),
      inventoryId: request.inventoryId ?? '',
      partId: request.partId ?? '',
      partName: request.partName,
      supplierId: selectedSupplier.supplier.supplierId,
      supplierName: selectedSupplier.supplier.supplierName,
      requestedQuantity: selectedSupplier.recommendedQuantity,
      unitCostGbp: selectedSupplier.estimatedUnitCostGbp,
      totalCostGbp: selectedSupplier.estimatedTotalCostGbp,
      urgencyLevel: request.urgency,
      requestReason: request.requestReason,
      expectedDeliveryDate: selectedSupplier.expectedDeliveryDate,
      approvalStatus: ApprovalStatus.Pending,
      purchaseStatus: PurchaseStatus.Requested,
      requestedBy: 'Purchase Agent',
      approvedBy: '',
    });

    const recommendation: PurchaseRecommendation = {
      purchaseRequest,
      rankedSuppliers,
      selectedSupplier,
      message: `Recommended ${selectedSupplier.supplier.supplierName} for ${request.partName}: ${selectedSupplier.rationale}`,
    };

    if (request.fulfillmentContext !== 'stock_replenishment') {
      await this.queue.publish({
        from: 'purchase',
        to: 'production',
        type: ORCHESTRATOR_JOBS.RUN_PRODUCTION_PLANNING,
        payload: {
          recommendation,
          ticket,
          expectedDelayDays: selectedSupplier.supplier.averageLeadTimeDays,
        },
      }, { idempotencyKey: `${request.ticketId}:production` });
    }
    await this.queue.publish({
      from: 'purchase',
      to: 'manager',
      type: 'purchase_recommendation',
      payload: {
        recommendation,
        ticket,
        summary: {
          ticketId: request.ticketId ?? purchaseRequest.purchaseRequestId,
          purchaseRequestId: purchaseRequest.purchaseRequestId,
          supplierId: purchaseRequest.supplierId,
          supplierName: purchaseRequest.supplierName,
          totalCost: purchaseRequest.totalCostGbp,
          expectedDeliveryDate: purchaseRequest.expectedDeliveryDate,
          recommendation,
        },
      },
    });

    return recommendation;
  }
}
