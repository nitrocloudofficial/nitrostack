import { ControllerDecorator as Controller, ToolDecorator as Tool, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';
import { trackToolExecution } from '../../telemetry/langfuse.service.js';

@Controller('codification')
export class CodificationTools {

  @Tool({
    name: 'codify_transcript',
    description: 'Codifies an interview transcript into a structured heuristic.',
    inputSchema: z.object({
      transcript: z.string().describe('The raw interview transcript text')
    }),
  })
  async codifyTranscript(input: any, ctx: ExecutionContext) {
    return trackToolExecution('codify_transcript', input, async () => {
      ctx.logger.info('Received transcript for codification');
      return {
        success: true,
        instruction: `Please act as a Tacit Knowledge Codifier. Read the following interview transcript and extract the core heuristic into a formal Structured JSON AST Rule. Transcript: "${input.transcript}"`,
        ui: {
          widget: {
            uri: '/rule-ast-widget',
            data: {
              rawRule: {
                operator: 'AND',
                conditions: [
                  { parameter: 'vibration_mm_s', operator: '>', threshold: 4.5 },
                  { parameter: 'temperature_celsius', operator: '>', threshold: 90 }
                ],
                action: 'SHUTDOWN'
              }
            }
          }
        }
      };
    });
  }

  @Prompt({
    name: 'rule_generation',
    description: 'Instructs the LLM on how to properly format and structure rules for Continuum Forge.',
    arguments: [],
  })
  async getRuleGenerationPrompt() {
    return {
      messages: [
        {
          role: 'user',
          content: `When codifying tacit knowledge, you MUST format the rule strictly as a parseable JSON object matching this schema:
{
  "trigger": { "variable": "string", "operator": "string", "value": "number|string" },
  "action": "string",
  "reasoning": "string"
}

Do not include any conversational filler.`
        }
      ]
    };
  }
}
