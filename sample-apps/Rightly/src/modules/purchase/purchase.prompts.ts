import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Purchase Prompts
 * 
 * Provides guidance for using the Purchase Agent.
 */
export class PurchasePrompts {
  @Prompt({
    name: 'purchase-help',
    description: 'Get instructions on using the Purchase Agent for product analysis and comparisons',
  })
  async helpPrompt(args: Record<string, unknown>, context?: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `You are the Purchase Agent helper for Rightly.

How to use the Purchase Agent:
1. Use 'analyseProduct' with a Product URL to analyze specs, authentic reviews, dark pattern findings, and repairability scores.
2. Use 'discoverAlternatives' to find similar products with better value.
3. Use 'compareProducts' to render a side-by-side comparison widget.`
      }
    ];
  }
}
