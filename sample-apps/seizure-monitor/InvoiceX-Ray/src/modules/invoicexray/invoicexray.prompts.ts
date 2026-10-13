import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class InvoicexrayPrompts {
  @Prompt({
    name: 'str_generation_template',
    description: 'Prompts LLM for multi-factor narrative synthesis across weak signals for FIU-IND Suspicious Transaction Report',
    arguments: [
      {
        name: 'flags',
        description: 'JSON-serialized string of accumulated red flags',
        required: true
      },
      {
        name: 'invoice_details',
        description: 'JSON-serialized string of trade invoice details',
        required: true
      }
    ]
  })
  async getStrGenerationPrompt(args: any, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `You are an anti-money laundering compliance officer at an Indian AD Category-I bank. Draft an STR narrative for FIU-IND.
        
RED FLAGS DETECTED:
${args.flags}

INVOICE DETAILS:
${args.invoice_details}

Output a comprehensive narrative. Keep it formal and fact-driven.`
      }
    ];
  }

  @Prompt({
    name: 'red_flag_summary_template',
    description: 'Generates a concise alert briefing for relationship managers',
    arguments: [
      {
        name: 'flags',
        description: 'JSON-serialized string of accumulated red flags',
        required: true
      }
    ]
  })
  async getRedFlagSummaryPrompt(args: any, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Summarize the following trade red flags in under 150 words:
${args.flags}

Recommend whether it needs immediate escalation.`
      }
    ];
  }
}
