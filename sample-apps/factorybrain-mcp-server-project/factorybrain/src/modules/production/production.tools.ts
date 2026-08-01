import { ControllerDecorator as Controller, ExecutionContext, Injectable, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { ProductionAgent } from './production.agent.js';
import { ProductionDataService } from './production-data.service.js';

export const disruptionSchema = z.object({
  machineId: z.string().describe('Disrupted machine ID'),
  downtimeStart: z.string().datetime().describe('Required ISO 8601 timestamp when downtime starts'),
  expectedDowntimeHours: z.number().nonnegative(),
  reason: z.string(),
  sourceReference: z.string().min(1).describe('Required maintenance ticket ID or machine alert ID'),
});

@Controller('production')
@Injectable({ deps: [ProductionAgent, ProductionDataService] })
export class ProductionTools {
  constructor(
    private readonly agent: ProductionAgent,
    private readonly data: ProductionDataService,
  ) {}

  @Tool({
    name: 'plan_production',
    description: 'Create a priority-aware recovery plan only when machineId, ISO downtimeStart, numeric expectedDowntimeHours, reason, and a maintenance ticket or alert sourceReference are all provided.',
    inputSchema: disruptionSchema,
  })
  @Widget('production-timeline')
  async planProduction(input: z.infer<typeof disruptionSchema>, ctx: ExecutionContext) {
    const plan = await this.agent.planDisruption(input);
    ctx.logger.info(`Production plan ${plan.planId} created with ${plan.affectedOrderCount} affected order(s)`);
    return plan;
  }

  @Tool({
    name: 'list_production_orders',
    description: "List production orders, optionally filtered to a production date.",
    inputSchema: z.object({ productionDate: z.string().optional() }),
  })
  async listOrders(input: { productionDate?: string }) {
    return this.data.listOrders(input.productionDate);
  }

  @Tool({
    name: 'get_production_schedule',
    description: 'Read the current production schedule without modifying it.',
    inputSchema: z.object({ productionDate: z.string().optional() }),
  })
  async getSchedule(input: { productionDate?: string }) {
    return this.data.listSchedules(input.productionDate);
  }

  @Tool({
    name: 'list_production_plans',
    description: 'List proposed production plans awaiting or previously sent for Manager approval.',
    inputSchema: z.object({}),
  })
  async listPlans() {
    return this.data.listPlans();
  }
}
