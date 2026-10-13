import { ControllerDecorator as Controller, ExecutionContext, ToolDecorator as Tool, z } from '@nitrostack/core';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';
import { DatabaseService } from '../../services/database.service.js';
import { QueueService } from '../../services/queue.service.js';
import { PurchaseAgent } from './purchase.agent.js';
import { PurchaseRequestService } from './purchase-request.service.js';
import { ScoringService } from './scoring.service.js';
import { SupplierService } from './supplier.service.js';
import { PurchaseUrgency } from './purchase.types.js';

const purchaseRequestSchema = z.object({
  partId: z.string().optional(),
  partName: z.string().describe('Part name to purchase, for example Bearing X45'),
  inventoryId: z.string().optional(),
  requestedQuantity: z.number().int().positive().default(1),
  urgency: z.nativeEnum(PurchaseUrgency).default(PurchaseUrgency.Medium),
  requestReason: z.string().default('Low Stock - Below Reorder Level'),
  unitCostGbp: z.number().positive().optional(),
  ticketId: z.string().optional(),
  machineId: z.string().optional(),
});

@Controller('purchase')
export class PurchaseTools {
  private readonly purchaseAgent: PurchaseAgent;
  private readonly supplierService: SupplierService;
  private readonly purchaseRequests: PurchaseRequestService;
  private readonly ready: Promise<void>;

  constructor(purchaseAgent?: PurchaseAgent, supplierService?: SupplierService, purchaseRequests?: PurchaseRequestService) {
    if (purchaseAgent && supplierService && purchaseRequests) {
      this.purchaseAgent = purchaseAgent;
      this.supplierService = supplierService;
      this.purchaseRequests = purchaseRequests;
      this.ready = Promise.resolve();
      return;
    }

    const database = new DatabaseService();
    const queue = new QueueService(database);
    queue.registerHandler('production', ORCHESTRATOR_JOBS.RUN_PRODUCTION_PLANNING, async () => {});
    queue.registerHandler('manager', 'purchase_recommendation', async () => {});
    const resolvedSupplierService = new SupplierService();
    const resolvedPurchaseRequests = new PurchaseRequestService(database);
    this.supplierService = resolvedSupplierService;
    this.purchaseRequests = resolvedPurchaseRequests;
    this.purchaseAgent = new PurchaseAgent(resolvedSupplierService, new ScoringService(), resolvedPurchaseRequests, queue);
    this.ready = (async () => {
      await database.onModuleInit();
      await resolvedSupplierService.onModuleInit();
      await resolvedPurchaseRequests.onModuleInit();
    })();
  }

  @Tool({
    name: 'find_suppliers',
    description: 'Find active suppliers that can provide a requested spare part.',
    inputSchema: z.object({
      partName: z.string(),
    }),
  })
  async findSuppliers(input: { partName: string }) {
    await this.ready;
    return this.supplierService.findSuppliersForPart(input.partName);
  }

  @Tool({
    name: 'recommend_purchase',
    description: 'Rank suppliers using urgency-aware scoring, create a purchase request, and hand off delivery estimate to Production plus recommendation to Manager.',
    inputSchema: purchaseRequestSchema,
  })
  async recommendPurchase(input: z.infer<typeof purchaseRequestSchema>, ctx: ExecutionContext) {
    await this.ready;
    const recommendation = await this.purchaseAgent.recommendPurchase(input);
    ctx.logger.info(`Purchase recommendation ${recommendation.purchaseRequest.purchaseRequestId} created for ${input.partName}`);
    return recommendation;
  }

  @Tool({
    name: 'list_purchase_requests',
    description: 'List purchase requests loaded from CSV and created during this server run.',
    inputSchema: z.object({}),
  })
  async listPurchaseRequests() {
    await this.ready;
    return this.purchaseRequests.listRequests();
  }
}
