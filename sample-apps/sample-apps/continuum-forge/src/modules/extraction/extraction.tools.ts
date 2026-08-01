import { ControllerDecorator as Controller, ToolDecorator as Tool, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';
import { trackToolExecution } from '../../telemetry/langfuse.service.js';

@Controller('extraction')
export class ExtractionTools {

  @Tool({
    name: 'extract_parameters',
    description: 'Extracts measurable parameters, thresholds, and condition variables from a tacit rule string.',
    inputSchema: z.object({
      rule: z.string().describe('The codified rule to extract from')
    }),
  })
  async extractParameters(input: any, ctx: ExecutionContext) {
    return trackToolExecution('extract_parameters', input, async () => {
      ctx.logger.info(`Extracting parameters from rule: ${input.rule}`);
      return {
        success: true,
        instruction: `Please act as a Data Extraction Engine. Analyze the following Structured JSON AST Rule and return a JSON list of objects containing 'parameter', 'operator', and 'threshold'. Rule: "${input.rule}"`
      };
    });
  }

  @Prompt({
    name: 'extraction_subagent',
    description: 'Instructs the LLM to act as a strict Data Extraction Engine.',
    arguments: [],
  })
  async getExtractionPrompt() {
    return {
      messages: [
        {
          role: 'user',
          content: `You are the Data Extraction Subagent. Your job is to parse Structured JSON AST Rules and extract the mathematical operators and variables into a standard format so they can be queried in a database. Output strictly in JSON.`
        }
      ]
    };
  }
}
