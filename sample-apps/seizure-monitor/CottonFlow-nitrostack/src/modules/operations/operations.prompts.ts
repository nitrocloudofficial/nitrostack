import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Operations Prompts
 * 
 * Provides reusable prompt templates for operations coordination.
 */
export class OperationsPrompts {
  @Prompt({
    name: 'operations-help',
    description: 'Help with operations tools and workflows',
  })
  async operationsHelp(args: Record<string, unknown>, context: ExecutionContext) {
    context.logger.info('Generating operations help prompt');

    const help = `
# Operations Tools Help

## Available Operations Tools

### coordinateIncidentResponse
Orchestrates a complete incident response across multiple departments:
- Reassigns production batch to healthy line
- Adjusts environmental settings (humidity)
- Creates maintenance work order
- Notifies all relevant managers
- Updates delivery estimate

**Usage**: coordinateIncidentResponse(machineId, zoneId, orderId, targetLineId?, targetHumidity?)

### reassignProductionBatch
Moves a production batch from one line to another.

**Usage**: reassignProductionBatch(fromLineId, toLineId, batchId)

### adjustEnvironmentalSettings
Adjusts humidity levels in a factory zone.

**Usage**: adjustEnvironmentalSettings(zoneId, targetHumidity)

### createMaintenanceWorkOrder
Creates a high-priority maintenance work order.

**Usage**: createMaintenanceWorkOrder(machineId, issueType, urgency)

### checkSparePartAvailability
Checks if a spare part is in stock.

**Usage**: checkSparePartAvailability(partId)

### notifyManager
Sends a notification to a department manager.

**Usage**: notifyManager(department, message, urgency)

### updateDeliveryEstimate
Updates the delivery estimate for an order.

**Usage**: updateDeliveryEstimate(orderId, newEta)

## Common Workflows

### Incident Response Workflow
1. Use diagnostics tools to identify the problem
2. Call coordinateIncidentResponse to execute all corrective actions
3. Monitor via resources to verify completion

### Batch Reassignment Workflow
1. Identify healthy target line
2. Call reassignProductionBatch
3. Notify customer via updateDeliveryEstimate

### Maintenance Workflow
1. Create work order via createMaintenanceWorkOrder
2. Check spare parts via checkSparePartAvailability
3. Notify maintenance team via notifyManager
`;

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: help,
        },
      },
    ];
  }
}
