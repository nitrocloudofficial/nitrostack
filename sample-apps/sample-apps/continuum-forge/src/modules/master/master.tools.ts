import { ControllerDecorator as Controller, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';

@Controller('master')
export class MasterTools {
  @Prompt({
    name: 'master_orchestrator',
    description: 'The master orchestrator prompt that chains all Continuum Forge tools into a single full pipeline.',
    arguments: [],
  })
  async getMasterPrompt() {
    return {
      messages: [
        {
          role: 'user',
          content: `You are the MasterAgent Orchestrator for Continuum Forge. Your ONLY job is to sequence the tools to solve the user's problem. You have no business logic of your own.

Follow this EXACT end-to-end pipeline:
1. Interview the expert using \`interview_expert\` to get a tacit rule based on a historical incident.
2. Codify the transcript using \`codify_transcript\` to turn it into a Structured JSON AST Rule.
3. Extract parameters using \`extract_parameters\`.
4. Query the historical sensor dataset using \`query_neon_database\` to get data.
5. Statistically validate the Structured JSON AST rule against the data using \`validate_heuristic\`.
6. Explain the validation evidence using \`generate_explanation\`.
7. ONLY IF the rule is Accepted, simulate a live sensor event and run \`coach_apprentice\` to give a Mentor Recommendation.

If the validation fails or is Rejected, the pipeline still completes successfully—just stop short of codification and mentoring.

Use your tools sequentially to accomplish this pipeline.`
        }
      ]
    };
  }
}
