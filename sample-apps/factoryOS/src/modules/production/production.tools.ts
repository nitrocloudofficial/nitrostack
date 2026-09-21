import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { ProductionService } from '../../services/production.service.js';

@Injectable({ deps: [ProductionService] })
export class ProductionTools {
  constructor(private productionService: ProductionService) {}

  @Tool({
    name: 'reroute_production',
    description: 'Production Rerouting Tool: Dynamically reroutes manufacturing jobs and optimizes shift schedules across alternative assembly lines during machine downtime.',
    inputSchema: z.object({
      affectedLineId: z.string().describe('Assembly line ID experiencing downtime'),
      alternativeLineId: z.string().describe('Target assembly line ID to receive transferred jobs'),
      shiftId: z.string().describe('Target shift ID')
    })
  })
  async rerouteProduction(
    input: { affectedLineId: string; alternativeLineId: string; shiftId: string },
    _ctx: ExecutionContext
  ) {
    return await this.productionService.rerouteProduction(
      input.affectedLineId,
      input.alternativeLineId,
      input.shiftId
    );
  }
}
