import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { ActionsService } from './actions.service.js';

@Injectable({ deps: [ActionsService] })
@Controller('actions')
export class ActionsTools {
  constructor(private readonly actionsService: ActionsService) {
    this.remindFriend = this.remindFriend.bind(this);
    this.suggestInvestments = this.suggestInvestments.bind(this);
    this.taxSaverNudge = this.taxSaverNudge.bind(this);
    this.canIAffordThis = this.canIAffordThis.bind(this);
    this.getPendingNudges = this.getPendingNudges.bind(this);
  }

  @Tool({
    name: 'remind_friend',
    description: 'Remind a friend to pay you back by generating a WhatsApp link. If amount is omitted, looks up the pending debt amount.',
    inputSchema: z.object({
      name: z.string().describe('The name of the friend'),
      amount: z.number().optional().describe('The amount owed. If omitted, uses pending debt balance.')
    })
  })
  async remindFriend(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Reminding friend ${input.name} for amount ${input.amount || 'auto'}`);
    return this.actionsService.remindFriend(input.name, input.amount);
  }

  @Tool({
    name: 'suggest_investments',
    description: 'Suggest investments for a given amount of spare cash.',
    inputSchema: z.object({
      amount: z.number().describe('The amount to invest'),
      monthly_budget: z.number().optional().describe('Optional monthly budget (defaults to 5000 or env config)')
    })
  })
  async suggestInvestments(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Suggesting investments for amount ${input.amount}`);
    return this.actionsService.suggestInvestments(input.amount, input.monthly_budget);
  }

  @Tool({
    name: 'tax_saver_nudge',
    description: 'Check available tax savings and suggest a contribution.',
    inputSchema: z.object({
      available_amount: z.number().optional().describe('Optional available tax room amount (defaults to 1500 or env config)')
    })
  })
  async taxSaverNudge(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Checking tax saver nudge`);
    return this.actionsService.taxSaverNudge(input.available_amount);
  }

  @Tool({
    name: 'can_i_afford_this',
    description: 'Evaluate an impulse purchase for opportunity cost, work hours required, and financial runway risk.',
    inputSchema: z.object({
      item_name: z.string().describe('Name of the item or purchase (e.g., iPhone 16, New Shoes)'),
      price: z.number().positive().describe('Price of the item in rupees'),
      hourly_wage: z.number().positive().optional().describe('Your hourly wage rate (defaults to 500 or env config)'),
      expected_return_rate: z.number().optional().describe('Expected annual compound investment return % (defaults to 12)'),
      monthly_budget: z.number().optional().describe('Your monthly budget buffer (defaults to 5000 or env config)')
    })
  })
  async canIAffordThis(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Evaluating impulse purchase for ${input.item_name} (₹${input.price})`);
    return this.actionsService.evaluateImpulsePurchase(
      input.item_name,
      input.price,
      input.hourly_wage,
      input.expected_return_rate,
      input.monthly_budget
    );
  }

  @Tool({
    name: 'get_pending_nudges',
    description: 'Get all pending investment nudges based on recent activity.',
    inputSchema: z.object({})
  })
  async getPendingNudges(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching pending nudges');
    return this.actionsService.getPendingNudges();
  }
}


