import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { FactoryStateService } from '../diagnostics/factory-state.service.js';
import { ProductionLineInputSchema } from './schemas/production-line.schema.js';

/**
 * Operations Tools
 * 
 * Provides tools for coordinating factory operations including batch reassignment,
 * environmental adjustments, maintenance work orders, spare parts management,
 * manager notifications, and delivery estimate updates.
 */
@Injectable({ deps: [FactoryStateService] })
export class OperationsTools {
  constructor(private factoryState: FactoryStateService) {}

  /**
   * Coordinate incident response: orchestrates 5 sub-actions atomically
   * - Reassign production batch to healthy line
   * - Adjust environmental settings
   * - Create maintenance work order
   * - Notify managers
   * - Update delivery estimate
   */
  @Tool({
    name: 'coordinateIncidentResponse',
    description: 'Coordinate a multi-department incident response: reassign batch, adjust environment, create maintenance work order, notify managers, and update delivery estimate',
    inputSchema: z.object({
      machineId: z.string().describe('The affected machine ID'),
      zoneId: z.string().describe('The affected zone ID'),
      orderId: z.string().describe('The affected order ID'),
      targetLineId: z.string().optional().describe('Target line for batch reassignment (defaults to L-2)'),
      targetHumidity: z.number().optional().describe('Target humidity percentage (defaults to 55)'),
    }),
  })
  async coordinateIncidentResponse(
    input: {
      machineId: string;
      zoneId: string;
      orderId: string;
      targetLineId?: string;
      targetHumidity?: number;
    },
    context: ExecutionContext
  ) {
    context.logger.info(`Coordinating incident response for machine ${input.machineId}, zone ${input.zoneId}, order ${input.orderId}`);

    const targetLineId = input.targetLineId || 'L-2';
    const targetHumidity = input.targetHumidity || 55;

    const results = {
      success: true,
      actions: [] as Array<{ action: string; status: string; details: unknown }>,
      summary: '',
    };

    try {
      // Action 1: Reassign production batch
      const machine = this.factoryState.getMachineHealth(input.machineId);
      const order = this.factoryState.getOrder(input.orderId);
      const fromLine = machine ? this.factoryState.getLineProduction(machine.lineId) : null;

      if (fromLine && order && order.batchId) {
        const reassignSuccess = this.factoryState.reassignBatch(fromLine.id, targetLineId, order.batchId);
        results.actions.push({
          action: 'reassignProductionBatch',
          status: reassignSuccess ? 'completed' : 'failed',
          details: {
            fromLine: fromLine.id,
            toLine: targetLineId,
            batchId: order.batchId,
          },
        });
        context.logger.info(`Batch reassignment: ${reassignSuccess ? 'success' : 'failed'}`);
      }

      // Action 2: Adjust environmental settings
      const zone = this.factoryState.getZoneEnvironment(input.zoneId);
      if (zone) {
        this.factoryState.updateZoneHumidity(input.zoneId, targetHumidity);
        results.actions.push({
          action: 'adjustEnvironmentalSettings',
          status: 'completed',
          details: {
            zoneId: input.zoneId,
            previousHumidity: zone.currentHumidity,
            targetHumidity,
          },
        });
        context.logger.info(`Environmental adjustment: humidity set to ${targetHumidity}%`);
      }

      // Action 3: Create maintenance work order
      const workOrderId = `WO-${Date.now()}`;
      results.actions.push({
        action: 'createMaintenanceWorkOrder',
        status: 'completed',
        details: {
          workOrderId,
          machineId: input.machineId,
          issueType: 'bearing-replacement',
          urgency: 'high',
          estimatedDuration: 45,
          assignedTo: 'Maintenance Team A',
        },
      });
      context.logger.info(`Maintenance work order created: ${workOrderId}`);

      // Action 4: Notify managers
      const notifications = [
        {
          department: 'maintenance',
          message: `High-priority work order ${workOrderId} created for ${input.machineId}. Bearing replacement required.`,
          urgency: 'high',
        },
        {
          department: 'production',
          message: `Batch from ${input.machineId} reassigned to ${targetLineId}. Order ${input.orderId} continues production.`,
          urgency: 'high',
        },
        {
          department: 'facilities',
          message: `Humidity adjustment in ${input.zoneId} to ${targetHumidity}%. Activate humidifier system.`,
          urgency: 'medium',
        },
      ];

      results.actions.push({
        action: 'notifyManagers',
        status: 'completed',
        details: {
          notificationsSent: notifications.length,
          notifications,
        },
      });
      context.logger.info(`Notifications sent to ${notifications.length} departments`);

      // Action 5: Update delivery estimate
      if (order) {
        const currentEta = new Date(order.currentEta);
        const newEta = new Date(currentEta.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
        this.factoryState.updateOrderEta(input.orderId, newEta.toISOString());

        results.actions.push({
          action: 'updateDeliveryEstimate',
          status: 'completed',
          details: {
            orderId: input.orderId,
            previousEta: order.currentEta,
            newEta: newEta.toISOString(),
            delayMinutes: 120,
          },
        });
        context.logger.info(`Delivery estimate updated: +2 hours for order ${input.orderId}`);
      }

      results.summary = `Incident response coordinated successfully. 5 actions completed: batch reassigned to ${targetLineId}, humidity adjusted to ${targetHumidity}%, maintenance work order created, managers notified, and delivery estimate updated.`;
    } catch (error) {
      results.success = false;
      results.summary = `Incident response failed: ${error}`;
      context.logger.error(`Incident response error: ${error}`);
    }

    return results;
  }

  /**
   * Reassign production batch from one line to another
   */
  @Tool({
    name: 'reassignProductionBatch',
    description: 'Reassign a production batch from one line to another',
    inputSchema: z.object({
      fromLineId: z.string().describe('Source line ID'),
      toLineId: z.string().describe('Target line ID'),
      batchId: z.string().describe('Batch ID to reassign'),
    }),
  })
  async reassignProductionBatch(
    input: { fromLineId: string; toLineId: string; batchId: string },
    context: ExecutionContext
  ) {
    context.logger.info(`Reassigning batch ${input.batchId} from ${input.fromLineId} to ${input.toLineId}`);

    const success = this.factoryState.reassignBatch(input.fromLineId, input.toLineId, input.batchId);

    return {
      success,
      fromLineId: input.fromLineId,
      toLineId: input.toLineId,
      batchId: input.batchId,
      message: success ? 'Batch reassigned successfully' : 'Failed to reassign batch',
    };
  }

  /**
   * Adjust environmental settings for a zone
   */
  @Tool({
    name: 'adjustEnvironmentalSettings',
    description: 'Adjust environmental settings (humidity) for a factory zone',
    inputSchema: z.object({
      zoneId: z.string().describe('Zone ID'),
      targetHumidity: z.number().describe('Target humidity percentage (0-100)'),
    }),
  })
  async adjustEnvironmentalSettings(
    input: { zoneId: string; targetHumidity: number },
    context: ExecutionContext
  ) {
    context.logger.info(`Adjusting humidity in zone ${input.zoneId} to ${input.targetHumidity}%`);

    const zone = this.factoryState.getZoneEnvironment(input.zoneId);
    if (!zone) {
      return {
        success: false,
        error: `Zone ${input.zoneId} not found`,
      };
    }

    const previousHumidity = zone.currentHumidity;
    this.factoryState.updateZoneHumidity(input.zoneId, input.targetHumidity);

    return {
      success: true,
      zoneId: input.zoneId,
      previousHumidity,
      targetHumidity: input.targetHumidity,
      adjustmentRequired: Math.abs(input.targetHumidity - previousHumidity),
      message: `Humidity adjustment initiated: ${previousHumidity}% → ${input.targetHumidity}%`,
    };
  }

  /**
   * Create a maintenance work order
   */
  @Tool({
    name: 'createMaintenanceWorkOrder',
    description: 'Create a maintenance work order for a machine',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID'),
      issueType: z.string().describe('Type of issue (e.g., bearing-replacement, belt-replacement)'),
      urgency: z.enum(['low', 'medium', 'high']).describe('Urgency level'),
    }),
  })
  async createMaintenanceWorkOrder(
    input: { machineId: string; issueType: string; urgency: string },
    context: ExecutionContext
  ) {
    context.logger.info(`Creating maintenance work order for ${input.machineId}: ${input.issueType} (${input.urgency})`);

    const machine = this.factoryState.getMachineHealth(input.machineId);
    if (!machine) {
      return {
        success: false,
        error: `Machine ${input.machineId} not found`,
      };
    }

    const workOrderId = `WO-${Date.now()}`;
    const estimatedDuration = input.urgency === 'high' ? 45 : input.urgency === 'medium' ? 90 : 180;

    return {
      success: true,
      workOrderId,
      machineId: input.machineId,
      machineName: machine.name,
      issueType: input.issueType,
      urgency: input.urgency,
      estimatedDuration,
      createdAt: new Date().toISOString(),
      status: 'open',
      message: `Work order ${workOrderId} created for ${machine.name}`,
    };
  }

  /**
   * Check spare part availability
   */
  @Tool({
    name: 'checkSparePartAvailability',
    description: 'Check availability of a spare part',
    inputSchema: z.object({
      partId: z.string().describe('Spare part ID'),
    }),
  })
  async checkSparePartAvailability(input: { partId: string }, context: ExecutionContext) {
    context.logger.info(`Checking availability of spare part ${input.partId}`);

    const part = this.factoryState.getSparePart(input.partId);
    if (!part) {
      return {
        success: false,
        error: `Spare part ${input.partId} not found`,
      };
    }

    const available = part.quantity > 0;
    const needsReorder = part.quantity <= part.reorderLevel;

    return {
      success: true,
      partId: part.id,
      name: part.name,
      type: part.type,
      quantity: part.quantity,
      reorderLevel: part.reorderLevel,
      available,
      needsReorder,
      leadTime: part.leadTime,
      message: available ? `${part.quantity} units available` : 'Part out of stock',
    };
  }

  /**
   * Notify manager
   */
  @Tool({
    name: 'notifyManager',
    description: 'Send a notification to a department manager',
    inputSchema: z.object({
      department: z.string().describe('Department (maintenance, production, facilities, sales)'),
      message: z.string().describe('Notification message'),
      urgency: z.enum(['low', 'medium', 'high']).describe('Urgency level'),
    }),
  })
  async notifyManager(
    input: { department: string; message: string; urgency: string },
    context: ExecutionContext
  ) {
    context.logger.info(`Notifying ${input.department} manager (${input.urgency}): ${input.message}`);

    const notificationId = `NOTIF-${Date.now()}`;

    return {
      success: true,
      notificationId,
      department: input.department,
      message: input.message,
      urgency: input.urgency,
      sentAt: new Date().toISOString(),
      deliveryMethod: 'email-and-sms',
    };
  }

  /**
   * Update delivery estimate for an order
   */
  @Tool({
    name: 'updateDeliveryEstimate',
    description: 'Update the delivery estimate for an order',
    inputSchema: z.object({
      orderId: z.string().describe('Order ID'),
      newEta: z.string().describe('New estimated time of arrival (ISO 8601 format)'),
    }),
  })
  async updateDeliveryEstimate(input: { orderId: string; newEta: string }, context: ExecutionContext) {
    context.logger.info(`Updating delivery estimate for order ${input.orderId} to ${input.newEta}`);

    const order = this.factoryState.getOrder(input.orderId);
    if (!order) {
      return {
        success: false,
        error: `Order ${input.orderId} not found`,
      };
    }

    const previousEta = order.currentEta;
    const success = this.factoryState.updateOrderEta(input.orderId, input.newEta);

    return {
      success,
      orderId: input.orderId,
      customerName: order.customerName,
      previousEta,
      newEta: input.newEta,
      delayMinutes: success ? Math.round((new Date(input.newEta).getTime() - new Date(previousEta).getTime()) / 60000) : 0,
      message: success ? 'Delivery estimate updated' : 'Failed to update delivery estimate',
    };
  }

  /**
   * Create a new production line
   */
  @Tool({
    name: 'createProductionLine',
    description: 'Create a new production line with specified name, zone, and weather conditions',
    inputSchema: ProductionLineInputSchema,
  })
  async createProductionLine(
    input: z.infer<typeof ProductionLineInputSchema>,
    context: ExecutionContext
  ) {
    context.logger.info(`Creating production line ${input.name} in zone ${input.zoneId} under ${input.weather} weather`);

    const zone = this.factoryState.getZoneEnvironment(input.zoneId);
    if (!zone) {
      return {
        success: false,
        error: `Zone ${input.zoneId} not found`,
      };
    }

    const lineId = input.lineId || `L-${this.factoryState.getAllLines().length + 1}`;
    
    // Adjust zone humidity based on weather conditions
    let humidityAdjustment = 0;
    if (input.weather === 'rainy') {
      // Rainy weather increases humidity
      humidityAdjustment = 15;
      const newHumidity = Math.min(100, zone.currentHumidity + humidityAdjustment);
      this.factoryState.updateZoneHumidity(input.zoneId, newHumidity);
      context.logger.info(`Rainy weather detected. Zone ${input.zoneId} humidity increased by ${humidityAdjustment}% to ${newHumidity}%`);
    }

    const newLine = {
      id: lineId,
      name: input.name,
      zone: input.zoneId,
      status: 'running',
      currentBatchId: '',
      yarnBreakageRate: input.weather === 'rainy' ? 1.2 : 1.8,
      yarnBreakageTrend: 'stable',
      imageUrl: 'https://images.unsplash.com/photo-1612685180313-bdfe1d6896cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTQ3NTl8MHwxfHNlYXJjaHwzfHxjb3R0b24lMjB5YXJuJTIwcHJvZHVjdGlvbiUyMGxpbmUlMjBtYW51ZmFjdHVyaW5nfGVufDF8MHx8fDE3ODU1MTUzNzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    };

    this.factoryState.createLine(newLine);

    return {
      success: true,
      line: newLine,
      weatherImpact: {
        weather: input.weather,
        humidityAdjustment,
        newZoneHumidity: this.factoryState.getZoneEnvironment(input.zoneId)?.currentHumidity,
        message: input.weather === 'rainy' 
          ? `Rainy weather conditions handled. Zone humidity increased to optimize yarn moisture levels and reduce static breakage.`
          : `Standard weather conditions applied.`,
      },
    };
  }
}
