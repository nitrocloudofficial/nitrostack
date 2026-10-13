import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { DebtsService } from './debts.service.js';

@Injectable({ deps: [DebtsService] })
@Controller('debts')
export class DebtsTools {
  constructor(private readonly debtsService: DebtsService) {}

  @Tool({
    name: 'get_debts',
    description: 'Get a ledger of all pending debts (who owes the user, and who the user owes)',
    inputSchema: z.object({})
  })
  async getDebts(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching debts ledger`);
    return this.debtsService.getDebts();
  }

  @Tool({
    name: 'add_debt',
    description: 'Log a new debt or loan',
    inputSchema: z.object({
      person: z.string().describe('Name of the person'),
      amount: z.number().describe('Amount in rupees'),
      type: z.enum(['owe_me', 'i_owe']).describe('Whether they owe the user, or the user owes them')
    })
  })
  async addDebt(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Adding debt for ${input.person}`);
    return this.debtsService.addDebt(input.person, input.amount, input.type);
  }

  @Tool({
    name: 'mark_debt_paid',
    description: 'Mark a specific debt as paid',
    inputSchema: z.object({ id: z.string().describe('The UUID of the debt') })
  })
  async markDebtPaid(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Marking debt ${input.id} as paid`);
    return this.debtsService.markAsPaid(input.id);
  }
}
