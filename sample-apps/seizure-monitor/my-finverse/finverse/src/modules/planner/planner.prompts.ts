import { Prompt, Injectable, ExecutionContext } from '@nitrostack/core';

@Injectable()
export class PlannerPromptsController {

  @Prompt({
    name: 'financial_health_summary',
    description: 'Summarize financial health including loan eligibility, fraud risk, and cashflow',
    arguments: [{ name: 'userId', description: 'User ID', required: true }]
  })
  async getFinancialHealthSummaryPrompt(args: Record<string, string>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Provide a comprehensive financial health summary for user ${args['userId']}. Include loan eligibility, fraud risk assessment, cashflow analysis, repayment status, and succession readiness.`
      }
    ];
  }

  @Prompt({
    name: 'daily_financial_brief',
    description: 'Provide a concise daily financial brief with key metrics',
    arguments: [{ name: 'userId', description: 'User ID', required: true }]
  })
  async getDailyFinancialBriefPrompt(args: Record<string, string>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Provide a concise daily financial brief for user ${args['userId']}. Focus on today's repayment, cashflow status, and any urgent alerts.`
      }
    ];
  }
}
