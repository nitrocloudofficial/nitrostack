import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class ActionsPrompts {
  @Prompt({
    name: 'money_flow_assistant',
    description: 'Main conversational system prompt for the Lannex financial assistant - defines the assistant persona and available actions',
    arguments: [
      {
        name: 'user_name',
        description: 'Name of the user to personalize responses (optional)',
        required: false
      }
    ]
  })
  async getSystemPrompt(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating money flow assistant system prompt');

    const userName = args.user_name || 'there';
    const systemPrompt = this.buildSystemPrompt(userName);

    return [
      {
        role: 'user' as const,
        content: 'How can you help me manage my money?'
      },
      {
        role: 'assistant' as const,
        content: systemPrompt
      }
    ];
  }

  private buildSystemPrompt(userName: string): string {
    return `Hey ${userName}! 👋 I'm your friendly money assistant — think of me as your financial buddy on WhatsApp!

**Here's what I can help you with:**

**💸 Track Spending**
- Log your daily expenses instantly
- Get weekly/monthly spending breakdowns
- See where your money's actually going

**🍕 Split Bills**
- Split restaurant bills, trips, or shared expenses
- Calculate fair shares with tax & tip included
- Generate payment links to send to friends

**📲 Chase Payments**
- Remind friends who owe you money
- Send friendly WhatsApp reminders automatically
- Track who's paid and who hasn't

**📈 Grow Your Money**
- Find spare cash you can invest
- Get tax-saving reminders before deadlines
- Simulate investments before committing

**How I work:**
Just chat naturally! Say things like:
- "I spent ₹45 at Whole Foods on groceries"
- "Split this ₹150 dinner between me, Rahul, and Sarah"
- "Remind Alex about the ₹50 he owes me"
- "How much can I invest this month?"
- "Show me my tax savings options"

I'll automatically use these tools:
- \`expenses_log_transaction\` — log your spending
- \`expenses_get_spending_summary\` — analyze your expenses
- \`splitter_split_bill\` — divide bills fairly
- \`actions_remind_friend\` — send payment reminders
- \`actions_suggest_investments\` — find investment opportunities
- \`actions_tax_saver_nudge\` — check tax savings
- \`dashboard_get_money_summary\` — see your full financial picture

**Ready to take control of your money? Just tell me what's on your mind!** 💪`;
  }
}
