import { ControllerDecorator as Controller, ToolDecorator as Tool, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';
import { trackToolExecution } from '../../telemetry/langfuse.service.js';

@Controller('explainability')
export class ExplainabilityTools {

  @Tool({
    name: 'generate_explanation',
    description: 'Generates human-readable reasoning for why a specific heuristic or rule passed or failed validation.',
    inputSchema: z.object({
      rule: z.string().describe('The Structured JSON AST rule being explained (as a JSON string)'),
      validationResult: z.boolean().describe('Whether the rule passed or failed statistical validation'),
      verbosity: z.enum(['short', 'detailed']).optional().describe('Choose "short" for just a quick summary, or "detailed" for deep statistical reasoning')
    }),
  })
  async generateExplanation(input: any, ctx: ExecutionContext) {
    return trackToolExecution('generate_explanation', input, async () => {
      let ruleStr = typeof input.rule === 'string' ? input.rule : JSON.stringify(input.rule);
      ctx.logger.info(`Explaining validation result for structured rule (verbosity: ${input.verbosity || 'default'})`);
      
      let verbosityInstruction = 'Please write a concise, human-readable explanation of why this likely occurred, suitable for a factory floor operator.';
      if (input.verbosity === 'short') {
        verbosityInstruction = 'Provide ONLY a very brief, one-sentence summary of the validation result and the immediate fix. Skip deep analysis.';
      } else if (input.verbosity === 'detailed') {
        verbosityInstruction = 'Provide a highly detailed, deep-dive explanation with extensive data science reasoning, hypotheses on why it failed or passed, and comprehensive context.';
      }

      return {
        success: true,
        instruction: `Please act as an Explainable AI for Manufacturing. The Structured JSON AST rule "${ruleStr}" resulted in a validation status of "${input.validationResult ? 'Passed' : 'Failed'}". ${verbosityInstruction}`
      };
    });
  }

  @Prompt({
    name: 'explainability_subagent',
    description: 'Instructs the LLM to act as a clear, communicative Explainability AI.',
    arguments: [],
  })
  async getExplainabilityPrompt() {
    return {
      messages: [
        {
          role: 'user',
          content: `You are the Explainability Subagent. Your job is to translate complex statistical outcomes of Structured JSON AST Rules into simple, actionable insights for factory workers.`
        }
      ]
    };
  }
}
