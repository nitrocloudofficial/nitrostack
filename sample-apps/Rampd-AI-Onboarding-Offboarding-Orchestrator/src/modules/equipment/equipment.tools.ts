import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { EquipmentStore, EquipmentRecord } from './equipment.store.js';

export class EquipmentTools {
  constructor(private store: EquipmentStore) {}

  @Tool({
    name: 'assignEquipment',
    description: 'Assign equipment to an employee based on their role. Engineers receive full kit (laptop, monitor, peripherals); others receive basic kit.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
      role: z.string().describe('Job role to determine equipment bundle'),
    }),
  })
  async assignEquipment(
    input: { employeeName: string; role: string },
    ctx: ExecutionContext,
  ): Promise<EquipmentRecord> {
    ctx.logger.info(`Assigning equipment to ${input.employeeName} (${input.role})`);
    const record = this.store.assign(input.employeeName, input.role);
    ctx.logger.info(`Equipment assigned: ${record.items.join(', ')}`);
    return record;
  }

  @Tool({
    name: 'reclaimEquipment',
    description: 'Reclaim all equipment from an employee, marking items as returned.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
    }),
  })
  async reclaimEquipment(
    input: { employeeName: string },
    ctx: ExecutionContext,
  ): Promise<EquipmentRecord | null> {
    ctx.logger.info(`Reclaiming equipment from ${input.employeeName}`);
    const record = this.store.reclaim(input.employeeName);
    if (record) {
      ctx.logger.info(`Equipment reclaimed; status set to returned`);
    } else {
      ctx.logger.warn(`No equipment record found for ${input.employeeName}`);
    }
    return record;
  }

  @Tool({
    name: 'getEquipmentStatus',
    description: 'Retrieve the current equipment assignment status for an employee.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
    }),
  })
  async getEquipmentStatus(
    input: { employeeName: string },
    ctx: ExecutionContext,
  ): Promise<EquipmentRecord | null> {
    ctx.logger.info(`Fetching equipment status for ${input.employeeName}`);
    return this.store.getStatus(input.employeeName);
  }
}
