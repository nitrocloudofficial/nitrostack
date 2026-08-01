import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { FactoryStateService } from './factory-state.service.js';

/**
 * Diagnostics Resources
 * 
 * Provides queryable MCP Resources for live factory state:
 * - factory://machines/{machineId}/status
 * - factory://lines/{lineId}/production
 * - factory://inventory/spare-parts
 * - factory://orders/active
 * - factory://environment/{zoneId}
 */
@Injectable({ deps: [FactoryStateService] })
export class DiagnosticsResources {
  constructor(private factoryState: FactoryStateService) {}

  /**
   * Resource: factory://machines/{machineId}/status
   * Returns detailed status of a specific machine
   */
  @Resource({
    uri: 'factory://machines/{machineId}/status',
    name: 'Machine Status',
    description: 'Get detailed status of a specific machine including health metrics',
    mimeType: 'application/json',
  })
  async machineStatus(
    { machineId }: { machineId: string },
    context: ExecutionContext
  ) {
    context.logger.info(`Resource: fetching machine status for ${machineId}`);

    const machine = this.factoryState.getMachineHealth(machineId);
    if (!machine) {
      return {
        type: 'text' as const,
        text: JSON.stringify({ error: `Machine ${machineId} not found` }, null, 2),
      };
    }

    return {
      type: 'text' as const,
      text: JSON.stringify(machine, null, 2),
    };
  }

  /**
   * Resource: factory://lines/{lineId}/production
   * Returns production status of a specific line
   */
  @Resource({
    uri: 'factory://lines/{lineId}/production',
    name: 'Line Production Status',
    description: 'Get production status of a specific line',
    mimeType: 'application/json',
  })
  async lineProduction(
    { lineId }: { lineId: string },
    context: ExecutionContext
  ) {
    context.logger.info(`Resource: fetching line production for ${lineId}`);

    const line = this.factoryState.getLineProduction(lineId);
    if (!line) {
      return {
        type: 'text' as const,
        text: JSON.stringify({ error: `Line ${lineId} not found` }, null, 2),
      };
    }

    // Include associated machines and order
    const machines = this.factoryState.getAllMachines().filter(m => m.lineId === lineId);
    const order = this.factoryState.getActiveOrders().find(o => o.lineId === lineId);

    const result = {
      ...line,
      machines: machines.map(m => ({
        id: m.id,
        name: m.name,
        vibration: m.vibration,
        temperature: m.temperature,
        status: m.status,
      })),
      associatedOrder: order || null,
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(result, null, 2),
    };
  }

  /**
   * Resource: factory://inventory/spare-parts
   * Returns all spare parts inventory
   */
  @Resource({
    uri: 'factory://inventory/spare-parts',
    name: 'Spare Parts Inventory',
    description: 'Get current spare parts inventory status',
    mimeType: 'application/json',
  })
  async spareParts(context: ExecutionContext) {
    context.logger.info('Resource: fetching spare parts inventory');

    const parts = this.factoryState.getAllSpareParts();
    const inventory = {
      totalParts: parts.length,
      parts: parts.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        quantity: p.quantity,
        reorderLevel: p.reorderLevel,
        needsReorder: p.quantity <= p.reorderLevel,
        leadTime: p.leadTime,
      })),
      lowStockAlerts: parts.filter(p => p.quantity <= p.reorderLevel),
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(inventory, null, 2),
    };
  }

  /**
   * Resource: factory://orders/active
   * Returns all active orders
   */
  @Resource({
    uri: 'factory://orders/active',
    name: 'Active Orders',
    description: 'Get all active production orders',
    mimeType: 'application/json',
  })
  async activeOrders(context: ExecutionContext) {
    context.logger.info('Resource: fetching active orders');

    const orders = this.factoryState.getActiveOrders();
    const summary = {
      totalActive: orders.length,
      byPriority: {
        high: orders.filter(o => o.priority === 'high').length,
        medium: orders.filter(o => o.priority === 'medium').length,
        low: orders.filter(o => o.priority === 'low').length,
      },
      orders: orders.map(o => ({
        id: o.id,
        customerName: o.customerName,
        priority: o.priority,
        status: o.status,
        lineId: o.lineId,
        quantity: o.quantity,
        dueDate: o.dueDate,
        currentEta: o.currentEta,
      })),
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(summary, null, 2),
    };
  }

  /**
   * Resource: factory://environment/{zoneId}
   * Returns environmental conditions for a zone
   */
  @Resource({
    uri: 'factory://environment/{zoneId}',
    name: 'Zone Environment',
    description: 'Get environmental conditions for a specific zone',
    mimeType: 'application/json',
  })
  async zoneEnvironment(
    { zoneId }: { zoneId: string },
    context: ExecutionContext
  ) {
    context.logger.info(`Resource: fetching environment for zone ${zoneId}`);

    const zone = this.factoryState.getZoneEnvironment(zoneId);
    if (!zone) {
      return {
        type: 'text' as const,
        text: JSON.stringify({ error: `Zone ${zoneId} not found` }, null, 2),
      };
    }

    // Include lines in this zone
    const lines = this.factoryState.getAllLines().filter(l => l.zone === zoneId);

    const result = {
      ...zone,
      lines: lines.map(l => ({
        id: l.id,
        name: l.name,
        status: l.status,
        yarnBreakageRate: l.yarnBreakageRate,
      })),
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(result, null, 2),
    };
  }
}
