import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { PortfolioService } from './portfolio.service.js';

@Injectable({ deps: [PortfolioService] })
@Controller('portfolio')
export class PortfolioTools {
  constructor(private readonly portfolioService: PortfolioService) {
    this.getPortfolio = this.getPortfolio.bind(this);
  }

  @Tool({
    name: 'get_portfolio',
    description: 'Get the current user\'s professional investment portfolio details including total value, daily change, and holdings.',
    inputSchema: z.object({})
  })
  async getPortfolio(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching professional portfolio details`);
    return this.portfolioService.getPortfolio();
  }
}
