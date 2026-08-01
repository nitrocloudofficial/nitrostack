import { PromptDecorator as Prompt, Injectable, ExecutionContext } from '@nitrostack/core';
import { DashboardService } from './dashboard.service.js';
import { DashboardTools } from './dashboard.tools.js';

@Injectable({ deps: [DashboardService, DashboardTools] })
export class DashboardPrompts {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardTools: DashboardTools
  ) {}

  @Prompt({
    name: 'money_summary_assistant',
    description: 'Generate a conversational narrative of the current financial dashboard state',
    arguments: [
      {
        name: 'include_actions',
        description: 'Whether to include suggested actions (default: true)',
        required: false
      }
    ]
  })
  async getMoneySummary(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating money summary narrative', { include_actions: args.include_actions });

    const summary = await this.dashboardTools.getMoneySummary({}, ctx);
    const includeActions = args.include_actions !== 'false';
    const narrative = this.generateNarrative(summary, includeActions);

    return [
      {
        role: 'user' as const,
        content: 'Give me an overview of my finances.'
      },
      {
        role: 'assistant' as const,
        content: narrative
      }
    ];
  }

  private generateNarrative(summary: any, includeActions: boolean): string {
    const { balance, owed, investmentGrowth, quickActions } = summary;

    let narrative = `**Your Financial Snapshot**\n\n`;
    narrative += `Your current balance is **₹${balance.toFixed(2)}**. `;

    if (owed > 0) {
      narrative += `Friends owe you **₹${owed.toFixed(2)}** — don't forget to follow up!\n\n`;
    } else {
      narrative += `No pending amounts owed to you.\n\n`;
    }

    if (investmentGrowth >= 0) {
      narrative += `**Investments:** Up **+${investmentGrowth.toFixed(2)}%** — nice growth!\n\n`;
    } else {
      narrative += `**Investments:** Down **${investmentGrowth.toFixed(2)}%** — markets fluctuate, stay patient.\n\n`;
    }

    if (includeActions && quickActions?.length > 0) {
      narrative += `**What would you like to do today?**\n`;
      for (const action of quickActions) {
        narrative += `- ${action.label}\n`;
      }
      narrative += `\nJust tell me what you need!`;
    }

    return narrative;
  }
}
