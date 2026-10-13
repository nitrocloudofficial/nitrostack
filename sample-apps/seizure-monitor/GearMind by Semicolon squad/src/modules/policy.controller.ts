import {
  ControllerDecorator as Controller,
  ResourceDecorator as Resource,
  ExecutionContext
} from '@nitrostack/core';

@Controller()
export class PolicyController {
  @Resource({
    uri: 'memo://manufacturing/inventory-rules',
    name: 'Manufacturing Inventory & Procurement Rules',
    description: 'Defines minimum stock levels and procurement policies for industrial spare parts.',
    mimeType: 'text/plain',
  })
  async getInventoryRules(ctx: ExecutionContext) {
    return {
      contents: [
        {
          uri: 'memo://manufacturing/inventory-rules',
          mimeType: 'text/plain',
          text: `
Rules:
- Maintain a minimum stock of 5 units for all critical spare parts.
- Ball Bearings must always have at least 10 units available.
- Servo Motors must always have at least 5 units available.
- PLC Modules must always have at least 3 units available.
- Hydraulic Oil must maintain at least 50 liters in inventory.
- If stock falls below the minimum threshold, procurement must be initiated immediately.
- Prefer suppliers with the lowest delivery time. If delivery times are equal, choose the supplier with the lower unit price.
- All industrial components must be stored in the Central Spare Parts Warehouse.
          `.trim(),
        },
      ],
    };
  }
}