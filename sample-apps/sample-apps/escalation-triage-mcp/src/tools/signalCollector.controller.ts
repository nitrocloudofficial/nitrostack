import { ControllerDecorator as Controller, ToolDecorator as Tool, z, type ExecutionContext } from '@nitrostack/core';
import { findOrCreateCustomer, getSignalsForCustomer } from '../db.js';

/**
 * AGENT: Signal Collector
 * Pulls raw data from tickets, CRM/slack, and bug tracker; normalizes into
 * one common shape: { source, timestamp, message, customer }.
 */
@Controller('signals')
export class SignalCollectorController {
  @Tool({
    name: 'get_signals_for_customer',
    description:
      'Pull and normalize every raw signal (support tickets, Slack/CRM messages, bug tracker entries) for a given customer name into one unified timeline.',
    inputSchema: z.object({
      customerName: z.string().describe('The customer/account name, e.g. "Acme Corp"'),
    }),
  })
  async getSignals(input: { customerName: string }, ctx: ExecutionContext) {
    ctx.logger.info('Collecting signals', { customer: input.customerName });
    const customer = await findOrCreateCustomer(input.customerName);
    const signals = await getSignalsForCustomer(customer.id, customer.name);
    return {
      customer: customer.name,
      signalCount: signals.length,
      signals,
    };
  }
}
