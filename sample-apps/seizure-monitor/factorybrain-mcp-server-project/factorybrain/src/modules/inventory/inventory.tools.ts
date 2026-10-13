import { ControllerDecorator as Controller, ExecutionContext, ToolDecorator as Tool, z } from '@nitrostack/core';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';
import { DatabaseService } from '../../services/database.service.js';
import { QueueService } from '../../services/queue.service.js';
import { InventoryAgent } from './inventory.agent.js';
import { InventoryCsvService } from './inventory-csv.service.js';

const inventoryRequestSchema = z.object({
  partId: z.string().optional().describe('Inventory part ID, for example P001'),
  partName: z.string().optional().describe('Human part name, for example Bearing X45'),
  quantity: z.number().int().positive().default(1),
  ticketId: z.string().describe('Maintenance ticket ID requesting this part'),
  machineId: z.string().describe('Machine requiring this part'),
  urgency: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  requestedBy: z.string().optional(),
});

@Controller('inventory')
export class InventoryTools {
  private readonly inventoryAgent: InventoryAgent;
  private readonly inventoryCsv: InventoryCsvService;
  private readonly ready: Promise<void>;

  constructor(inventoryAgent?: InventoryAgent, inventoryCsv?: InventoryCsvService) {
    if (inventoryAgent && inventoryCsv) {
      this.inventoryAgent = inventoryAgent;
      this.inventoryCsv = inventoryCsv;
      this.ready = Promise.resolve();
      return;
    }

    const database = new DatabaseService();
    const queue = new QueueService(database);
    queue.registerHandler('manager', 'inventory_summary', async () => {});
    queue.registerHandler('production', ORCHESTRATOR_JOBS.RUN_PRODUCTION_PLANNING, async () => {});
    queue.registerHandler('purchase', ORCHESTRATOR_JOBS.RUN_PURCHASE, async () => {});
    const resolvedInventoryCsv = new InventoryCsvService(database);
    this.inventoryCsv = resolvedInventoryCsv;
    this.inventoryAgent = new InventoryAgent(resolvedInventoryCsv, queue);
    this.ready = (async () => {
      await database.onModuleInit();
      await resolvedInventoryCsv.onModuleInit();
    })();
  }

  @Tool({
    name: 'check_inventory',
    description: 'Check and reserve spare-part inventory for a maintenance ticket. In-stock requests go to Production; low/out-of-stock requests go to Purchase.',
    inputSchema: inventoryRequestSchema,
  })
  async checkInventory(input: z.infer<typeof inventoryRequestSchema>, ctx: ExecutionContext) {
    await this.ready;
    const result = await this.inventoryAgent.checkInventory(input);
    ctx.logger.info(`Inventory check for ${input.partId ?? input.partName}: ${result.decision}`);
    return result;
  }

  @Tool({
    name: 'list_items',
    description: 'List inventory items loaded from data/inventory_FIXED.csv.',
    inputSchema: z.object({}),
  })
  async listItems() {
    await this.ready;
    return this.inventoryCsv.listItems();
  }

  @Tool({
    name: 'list_reservations',
    description: 'List inventory reservations created during this server run.',
    inputSchema: z.object({
      ticketId: z.string().optional(),
    }),
  })
  async listReservations(input: { ticketId?: string }) {
    await this.ready;
    return this.inventoryCsv.listReservations(input.ticketId);
  }
}
