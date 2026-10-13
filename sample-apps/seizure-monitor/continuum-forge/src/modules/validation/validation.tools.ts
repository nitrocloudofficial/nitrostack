import { ControllerDecorator as Controller, ToolDecorator as Tool, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';
import { trackToolExecution } from '../../telemetry/langfuse.service.js';

@Controller('continuum')
export class ValidationTools {

  @Tool({
    name: 'validate_heuristic',
    description: 'Validates a manufacturing heuristic mathematically against sensor datasets. Exposes the rule and data to the Orchestrator LLM to compute statistical significance.',
    inputSchema: z.object({
      heuristicId: z.string().optional().describe('The ID of the heuristic'),
      rule: z.string().describe('The Structured JSON AST rule to validate (as a JSON string)'),
      datasetUri: z.string().optional().describe('URI to the sensor logs')
    }),
  })
  async validateHeuristic(input: any, ctx: ExecutionContext) {
    return trackToolExecution('validate_heuristic', input, async () => {
      let ruleStr = typeof input.rule === 'string' ? input.rule : JSON.stringify(input.rule);
      
      if (!ruleStr || ruleStr === 'expected value' || ruleStr.trim() === '' || ruleStr === '{}') {
        return {
          success: false,
          error: "Invalid rule. Please provide a specific Structured JSON AST rule to validate."
        };
      }
      if (!input.datasetUri || input.datasetUri === 'expected value' || input.datasetUri.trim() === '') {
        return {
          success: false,
          error: "Validation requires a dataset. Please provide a dataset URI (e.g., neon://sensor_logs)."
        };
      }

      ctx.logger.info(`Requested validation for structured rule`);
      
      // Instead of using Gemini locally, we return the payload so the
      // Orchestrator LLM (Claude inside NitroStudio) can use its own tokens
      return {
        success: true,
        instruction: `Please act as an expert Data Scientist. Calculate the statistical significance of the following Structured JSON AST rule against the dataset. Provide your reasoning and confidence score in a clear, formatted response.`,
        ruleToValidate: input.rule,
        datasetContext: input.datasetUri,
        message: 'Payload returned successfully. Waiting for Orchestrator LLM to compute validation.'
      };
    });
  }

  @Prompt({
    name: 'data_scientist_subagent',
    description: 'Instructs the LLM to act as a strict Data Scientist.',
    arguments: [],
  })
  async getDataScientistPrompt() {
    return {
      messages: [
        {
          role: 'user',
          content: `You are the Data Scientist Subagent. Your job is to take a Structured JSON AST Rule and a dataset context, and calculate the statistical significance (e.g., p-value, correlation) to determine if the rule is 'Accepted' or 'Rejected'.`
        }
      ]
    };
  }
}
