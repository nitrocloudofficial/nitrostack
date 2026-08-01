import { ControllerDecorator as Controller, ToolDecorator as Tool, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';
import { trackToolExecution } from '../../telemetry/langfuse.service.js';

@Controller('mentor')
export class MentorTools {

  @Tool({
    name: 'coach_apprentice',
    description: 'Provides guidance to junior operators based on codified manufacturing rules.',
    inputSchema: z.object({
      scenario: z.string().describe('The situation the junior operator is facing'),
      applicableRule: z.string().describe('The codified Structured JSON AST rule (as a JSON string) that applies here'),
      verbosity: z.enum(['short', 'detailed']).optional().describe('Choose "short" for just the immediate fix, or "detailed" for a full coaching session')
    }),
  })
  async coachApprentice(input: any, ctx: ExecutionContext) {
    return trackToolExecution('coach_apprentice', input, async () => {
      let ruleStr = typeof input.applicableRule === 'string' ? input.applicableRule : JSON.stringify(input.applicableRule);
      
      if (!input.scenario || input.scenario === 'expected value' || input.scenario.trim() === '') {
        return {
          success: false,
          error: "Incomplete scenario. Please provide both the current scenario the junior operator is facing and the applicable rule to base the coaching on."
        };
      }
      if (!ruleStr || ruleStr === 'expected value' || ruleStr.trim() === '' || ruleStr === '{}') {
        return {
          success: false,
          error: "Incomplete scenario. Please provide both the current scenario the junior operator is facing and the applicable rule to base the coaching on."
        };
      }

      ctx.logger.info(`Mentoring apprentice on scenario (verbosity: ${input.verbosity || 'default'}): ${input.scenario}`);
      
      let verbosityInstruction = 'provide them with friendly, actionable guidance on what to do next.';
      if (input.verbosity === 'short') {
        verbosityInstruction = 'provide ONLY the immediate fix or action required. Do not include extra coaching or explanation.';
      } else if (input.verbosity === 'detailed') {
        verbosityInstruction = 'provide a deeply detailed coaching session, including the immediate fix, the "why" behind it, and preventive measures.';
      }

      return {
        success: true,
        instruction: `Please act as a Senior Manufacturing Mentor. A junior operator is facing the following scenario: "${input.scenario}". Based on the Structured JSON AST rule "${ruleStr}", ${verbosityInstruction}`,
        ui: {
          widget: {
            uri: '/mentor-guidance-widget',
            data: {
              scenario: input.scenario,
              verbosity: input.verbosity || 'short'
            }
          }
        }
      };
    });
  }

  @Prompt({
    name: 'mentor_persona',
    description: 'Configures the LLM as a senior manufacturing expert.',
    arguments: [],
  })
  async getMentorPrompt() {
    return {
      messages: [
        {
          role: 'user',
          content: `You are a veteran Senior Manufacturing Operator with 30 years of floor experience. You speak with authority but are very patient and encouraging to apprentices. Your goal is to guide them using validated rules of thumb.`
        }
      ]
    };
  }
}
