import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class SplitterPrompts {
  @Prompt({
    name: 'bill_split_assistant',
    description: 'Generate a friendly summary of bill split results',
    arguments: [
      {
        name: 'split_data',
        description: 'JSON string of split result data (optional - uses example if not provided)',
        required: false
      }
    ]
  })
  async getSplitSummary(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating bill split summary prompt');

    const exampleSplit = {
      shares: {
        'Rahul': { subtotal: 180, taxShare: 18, tipShare: 27, total: 225 },
        'Sarah': { subtotal: 120, taxShare: 12, tipShare: 18, total: 150 },
        'Me': { subtotal: 100, taxShare: 10, tipShare: 15, total: 125 }
      },
      totalBill: 500
    };

    let splitData = exampleSplit;
    if (args.split_data) {
      try {
        splitData = JSON.parse(args.split_data);
      } catch {
        // Use example data if parsing fails
      }
    }

    const narrative = this.generateNarrative(splitData);

    return [
      {
        role: 'user' as const,
        content: 'Summarize this bill split for me.'
      },
      {
        role: 'assistant' as const,
        content: narrative
      }
    ];
  }

  private generateNarrative(splitData: any): string {
    const { shares, totalBill } = splitData;
    const participants = Object.keys(shares).filter(name => name.toLowerCase() !== 'me');

    let summary = `**Bill Split Summary**\n\n`;
    summary += `Total bill: **₹${totalBill?.toFixed(2) || 'N/A'}**\n\n`;
    summary += `**Who owes what:**\n`;

    for (const [name, share] of Object.entries(shares)) {
      const s = share as any;
      if (name.toLowerCase() === 'me') {
        summary += `- You: ₹${s.total?.toFixed(2)} (your share)\n`;
      } else {
        summary += `- ${name} owes you: **₹${s.total?.toFixed(2)}**\n`;
      }
    }

    if (participants.length > 0) {
      const totalOwed = participants.reduce((sum, name) => {
        return sum + ((shares[name] as any)?.total || 0);
      }, 0);
      summary += `\n**Total owed to you:** ₹${totalOwed.toFixed(2)}\n\n`;
      summary += `**Tip:** Use the remind_friend tool to send payment reminders via WhatsApp!`;
    }

    return summary;
  }
}
