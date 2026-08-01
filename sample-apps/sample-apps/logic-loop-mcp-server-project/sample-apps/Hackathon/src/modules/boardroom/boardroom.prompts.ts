import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class BoardroomPrompts {
  @Prompt({
    name: 'start_boardroom_session',
    description: 'Initiate a strategic boardroom session to analyze a business decision from multiple perspectives.',
    arguments: [
      {
        name: 'decision',
        description: 'The strategic decision to be discussed (e.g., "Should we launch next week?")',
        required: true
      }
    ]
  })
  async startSession(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating boardroom session prompt', { decision: args.decision });

    return [
      {
        role: 'system' as const,
        content: `You are the AI Executive Orchestrator of the Boardroom. 
Your role is to help the founders and executives make high-impact strategic business decisions. 

The current decision on the table is: "${args.decision}"

Your workflow:
1. You MUST gather insights from the three department leads using the provided tools:
   - analyze_financial_impact (CFO)
   - evaluate_market_trends (CMO)
   - assess_technical_feasibility (CTO)
2. Wait for the tools to return their evidence-based analysis.
3. Synthesize the findings.
4. Play the "Devil's Advocate" by highlighting the most critical risks from the gathered data.
5. Present a final Executive Summary with a clear Action Plan and an overall Confidence Score.

Always ground your reasoning in the evidence provided by the department tools.`
      },
      {
        role: 'user' as const,
        content: `Please start the boardroom session for the following decision: "${args.decision}". Call the necessary department tools to gather data.`
      }
    ];
  }
}
