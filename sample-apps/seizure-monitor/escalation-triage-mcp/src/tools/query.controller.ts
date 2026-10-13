import { ControllerDecorator as Controller, ToolDecorator as Tool, z, type ExecutionContext } from '@nitrostack/core';
import {
  findOrCreateCustomer,
  getSignalsForCustomer,
  getAllOwnerLoads,
  getBugsForCustomerName,
} from '../db.js';

/**
 * Supports the "Stay queryable" step: lets the orchestrator answer things
 * like "what's going on with Acme Corp" or "who's overloaded right now"
 * without the person digging through three tools.
 */
@Controller('query')
export class QueryController {
  @Tool({
    name: 'get_customer_status',
    description: 'Get a full status snapshot for a customer: signals, bugs, and timeline — for answering "what\'s going on with X".',
    inputSchema: z.object({ customerName: z.string() }),
  })
  async getCustomerStatus(input: { customerName: string }, _ctx: ExecutionContext) {
    const customer = await findOrCreateCustomer(input.customerName);
    const signals = await getSignalsForCustomer(customer.id, customer.name);
    const bugs = await getBugsForCustomerName(customer.name);
    return { customer: customer.name, signals, bugs };
  }

  @Tool({
    name: 'get_team_load',
    description: 'List every owner\'s current open-issue load vs. their max threshold, to answer "who\'s overloaded right now".',
    inputSchema: z.object({}),
  })
  async getTeamLoad(_input: Record<string, never>, _ctx: ExecutionContext) {
    const loads = await getAllOwnerLoads();
    return {
      loads,
      overloaded: loads.filter((l) => l.load >= l.max_load).map((l) => l.owner),
    };
  }
}
