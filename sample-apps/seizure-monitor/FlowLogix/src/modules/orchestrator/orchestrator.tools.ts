import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { OrchestratorService } from './services/orchestrator.service.js';

/**
 * Orchestrator Agent — Tools
 *
 * Handles: UC5 (Approve/Reject Widgets) and Global Rules
 * Agent: Orchestrator Agent
 * Stage: Global
 */
@Controller('orchestrator')
export class OrchestratorTools {
  private readonly orchestratorService = new OrchestratorService();

  /**
   * TOOL 1 — get_warehouse_summary
   * Pulls the master RED/AMBER/GREEN status for the warehouse.
   */
  @Tool({
    name: 'get_warehouse_summary',
    description:
      'Retrieves the master health summary of the warehouse. ' +
      'Returns the overall status (RED/AMBER/GREEN), active alerts, and key metrics. ' +
      'Call this to get a high-level view of current operations before deciding on further actions.',
    inputSchema: z.object({}),
  })
  @Widget('warehouse-health-summary')
  async getWarehouseSummary(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching warehouse summary');
    const result = this.orchestratorService.getWarehouseSummary();
    ctx.logger.info('Warehouse summary retrieved', { status: result.status });
    return result;
  }

  /**
   * TOOL 2 — read_persistent_memory
   * Checks managerial rules set by the warehouse manager.
   */
  @Tool({
    name: 'read_persistent_memory',
    description:
      'Reads persistent rules and constraints set by the warehouse manager. ' +
      'Use this to verify if there are any specific standing orders (like prioritizing a certain customer ' +
      'or blocking certain operations) before routing tasks to sub-agents.',
    inputSchema: z.object({}),
  })
  async readPersistentMemory(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Reading persistent memory rules');
    const result = this.orchestratorService.getPersistentMemory();
    ctx.logger.info('Rules retrieved', { count: result.rules.length });
    return result;
  }

  /**
   * TOOL 3 — route_to_supply_chain
   * Wakes up and delegates a task to the Supply Chain Agent.
   */
  @Tool({
    name: 'route_to_supply_chain',
    description:
      'Delegates a procurement, inventory, or supplier-related task to the Supply Chain Agent. ' +
      'Use this when the user query or system alert involves damaged freight, stockouts, PO generation, ' +
      'supplier delays, or QC failures. ' +
      'Provide a clear context and goal for the Supply Chain Agent.',
    inputSchema: z.object({
      context: z.string().describe('The background context or alert that triggered this delegation.'),
      goal: z.string().describe('The specific outcome the Supply Chain Agent needs to achieve.'),
    }),
  })
  async routeToSupplyChain(
    input: { context: string; goal: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Routing task to Supply Chain Agent', { goal: input.goal });
    return {
      status: 'DELEGATED',
      targetAgent: 'Supply Chain Agent',
      message: 'Task has been successfully routed to the Supply Chain Agent for execution.',
    };
  }

  /**
   * TOOL 4 — route_to_floor_ops
   * Wakes up and delegates a task to the Floor Operations Agent.
   */
  @Tool({
    name: 'route_to_floor_ops',
    description:
      'Delegates a physical movement, scheduling, or labor-related task to the Floor Operations Agent. ' +
      'Use this when the user query or system alert involves dock doors, truck arrivals/delays, ' +
      'worker scheduling, space allocation, or physical putaway. ' +
      'Provide a clear context and goal for the Floor Operations Agent.',
    inputSchema: z.object({
      context: z.string().describe('The background context or alert that triggered this delegation.'),
      goal: z.string().describe('The specific outcome the Floor Operations Agent needs to achieve.'),
    }),
  })
  async routeToFloorOps(
    input: { context: string; goal: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Routing task to Floor Operations Agent', { goal: input.goal });
    return {
      status: 'DELEGATED',
      targetAgent: 'Floor Operations Agent',
      message: 'Task has been successfully routed to the Floor Operations Agent for execution.',
    };
  }
}
