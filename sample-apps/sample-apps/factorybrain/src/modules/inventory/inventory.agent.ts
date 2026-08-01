import { Injectable, OnModuleInit } from '@nitrostack/core';
import { QueueService } from '../../services/queue.service.js';
import { InventoryCsvService } from './inventory-csv.service.js';
import { InventoryRequest, InventoryResponse } from './inventory.types.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';

@Injectable({ deps: [InventoryCsvService, QueueService] })
export class InventoryAgent implements OnModuleInit {
  constructor(
    private readonly inventoryCsv: InventoryCsvService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queue.registerHandler('inventory', ORCHESTRATOR_JOBS.RUN_INVENTORY, async (event) => {
      await this.handleSparePartRequest(event as { payload: { sparePartRequest: any; ticket: any } });
    });
  }

  async handleSparePartRequest(event: { payload: { sparePartRequest: any; ticket: any } }): Promise<void> {
    const { sparePartRequest, ticket } = event.payload;
    await this.checkInventory({
      partId: sparePartRequest.partId,
      partName: sparePartRequest.partName,
      quantity: sparePartRequest.quantity,
      ticketId: sparePartRequest.ticketId,
      machineId: sparePartRequest.machineId,
      urgency: sparePartRequest.urgency,
      requestedBy: sparePartRequest.requestedBy,
    }, ticket);
  }

  async checkInventory(request: InventoryRequest, ticket?: unknown): Promise<InventoryResponse> {
    const lookups = [request.partId, request.partName].filter(
      (value): value is string => Boolean(value?.trim()),
    );
    if (lookups.length === 0) {
      throw new Error('Inventory request must include partId or partName');
    }
    if (request.quantity <= 0) {
      throw new Error('Inventory request quantity must be greater than zero');
    }

    const item = lookups
      .map((lookup) => this.inventoryCsv.findItem(lookup))
      .find((candidate) => candidate !== undefined);
    if (!item) {
      const requestedPart = request.partName ?? request.partId!;
      const validItems = this.inventoryCsv.listItems();
      const validPartIds = validItems.map((candidate) => candidate.partId).join(', ');
      const similarParts = validItems
        .filter((candidate) => isSimilarPart(requestedPart, candidate.partId, candidate.partName))
        .slice(0, 3)
        .map((candidate) => `${candidate.partId} (${candidate.partName})`);
      throw new Error(
        `Inventory part not found: ${requestedPart}. Valid part IDs: ${validPartIds || 'none'}. ` +
        `Similar parts: ${similarParts.join(', ') || 'none'}. Provide a valid partId or exact partName.`,
      );
    }

    if (item.availableQuantity >= request.quantity) {
      const reservation = await this.inventoryCsv.reserve(item.partId, {
        reservationId: `RSV-${request.ticketId}-${Date.now()}`,
        quantity: request.quantity,
        ticketId: request.ticketId,
        machineId: request.machineId,
      });
      const updatedItem = this.inventoryCsv.findItem(item.partId) ?? item;
      const reorderRequired = updatedItem.availableQuantity <= updatedItem.reorderLevel;
      const response: InventoryResponse = {
        decision: reorderRequired ? 'low_stock' : 'in_stock',
        item: updatedItem,
        requestedQuantity: request.quantity,
        quantityOnHand: updatedItem.quantityAvailable,
        availableQuantity: updatedItem.availableQuantity,
        warehouseLocation: updatedItem.warehouseLocation,
        reservation,
        reorderRequired,
        message: reorderRequired
          ? `${updatedItem.partName} reserved, but stock is at or below reorder level. Forwarding replenishment to Purchase Agent.`
          : `${updatedItem.partName} reserved from ${updatedItem.warehouseLocation}. Forwarding recovery plan to Production Planning Agent.`,
      };

      await this.forwardToManager(request, response);

      if (reorderRequired) {
        await this.forwardToProduction(request, response, ticket);
        await this.forwardToPurchase(request, response, ticket);
      } else {
        await this.forwardToProduction(request, response, ticket);
      }
      return response;
    }

    const pending = await this.inventoryCsv.markPendingPurchase(item.partId, {
      reservationId: `PENDING-${request.ticketId}-${Date.now()}`,
      quantity: request.quantity,
      ticketId: request.ticketId,
      machineId: request.machineId,
    });
    const response: InventoryResponse = {
      decision: item.availableQuantity === 0 ? 'out_of_stock' : 'low_stock',
      item: this.inventoryCsv.findItem(item.partId) ?? item,
      requestedQuantity: request.quantity,
      quantityOnHand: item.quantityAvailable,
      availableQuantity: item.availableQuantity,
      warehouseLocation: item.warehouseLocation,
      reservation: pending,
      reorderRequired: true,
      message: `${item.partName} has insufficient stock (${item.availableQuantity} available, ${request.quantity} requested). Forwarding to Purchase Agent.`,
    };
    await this.forwardToManager(request, response);
    await this.forwardToPurchase(request, response, ticket);
    return response;
  }

  private async forwardToPurchase(request: InventoryRequest, response: InventoryResponse, ticket?: unknown): Promise<void> {
    await this.queue.publish({
      from: 'inventory',
      to: 'purchase',
      type: ORCHESTRATOR_JOBS.RUN_PURCHASE,
      payload: {
        request,
        inventory: response,
        ticket,
        fulfillmentContext: response.reservation?.status === 'Reserved' ? 'stock_replenishment' : 'repair_blocking',
      },
    }, { idempotencyKey: `${request.ticketId}:purchase` });
  }

  private async forwardToProduction(request: InventoryRequest, response: InventoryResponse, ticket?: unknown): Promise<void> {
    await this.queue.publish({
      from: 'inventory',
      to: 'production',
      type: ORCHESTRATOR_JOBS.RUN_PRODUCTION_PLANNING,
      payload: {
        request,
        inventory: response,
        ticket,
      },
    }, { idempotencyKey: `${request.ticketId}:production` });
  }

  private async forwardToManager(request: InventoryRequest, response: InventoryResponse): Promise<void> {
    await this.queue.publish({
      from: 'inventory',
      to: 'manager',
      type: 'inventory_summary',
      payload: {
        ticketId: request.ticketId,
        machineId: request.machineId,
        decision: response.decision,
        requestedQuantity: response.requestedQuantity,
        availableQuantity: response.availableQuantity,
        warehouseLocation: response.warehouseLocation,
        reorderRequired: response.reorderRequired,
      },
    }, { idempotencyKey: `manager-inventory-${request.ticketId}` });
  }
}

function isSimilarPart(input: string, partId: string, partName: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const needle = normalize(input);
  const candidates = [normalize(partId), normalize(partName)];
  return candidates.some((candidate) => candidate.includes(needle) || needle.includes(candidate) || sharedPrefix(needle, candidate) >= 3);
}

function sharedPrefix(left: string, right: string): number {
  let index = 0;
  while (index < left.length && index < right.length && left[index] === right[index]) index += 1;
  return index;
}
