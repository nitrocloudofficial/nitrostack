import { ControllerDecorator as Controller, ToolDecorator as Tool, PromptDecorator as Prompt, ResourceDecorator as Resource, z, ExecutionContext } from '@nitrostack/core';

@Controller('elicitation')
export class ElicitationTools {

  @Tool({
    name: 'interview_expert',
    description: 'Generates targeted interview questions to extract tacit knowledge from a domain expert based on a specific manufacturing failure mode.',
    inputSchema: z.object({
      failureMode: z.string().describe('The manufacturing failure mode or scenario to investigate'),
      expertRole: z.string().optional().describe('The role of the expert (e.g. Senior Technician)')
    }),
  })
  async interviewExpert(input: any, ctx: ExecutionContext) {
    if (!input.failureMode || input.failureMode === 'expected value' || input.failureMode.trim() === '') {
      return {
        success: false,
        error: "Insufficient context. Please specify a specific failure mode (e.g., 'thermal-induced-rejection') and expert role (e.g., 'Senior Technician') to generate targeted questions."
      };
    }
    if (!input.expertRole || input.expertRole === 'expected value' || input.expertRole.trim() === '') {
      return {
        success: false,
        error: "Insufficient context. Please specify a specific failure mode (e.g., 'thermal-induced-rejection') and expert role (e.g., 'Senior Technician') to generate targeted questions."
      };
    }
    ctx.logger.info(`Starting expert interview session for: ${input.failureMode}`);
    return {
      success: true,
      instruction: `Please act as a Knowledge Engineer. Ask the ${input.expertRole || 'Domain Expert'} probing questions about the failure mode: "${input.failureMode}". Focus on their tacit, unspoken heuristics that they use to resolve or identify this issue.`
    };
  }

  @Prompt({
    name: 'expert_interview_session',
    description: 'System prompt to configure the LLM as a tacit knowledge elicitation expert.',
    arguments: [
      { name: 'industry', description: 'The industry of the expert (e.g., Aerospace, Automotive)', required: true }
    ],
  })
  async getExpertPrompt(args: any) {
    return {
      messages: [
        {
          role: 'user',
          content: `You are an expert Knowledge Engineer in the ${args.industry} industry. Your goal is to conduct an interview with a domain expert to extract their tacit knowledge (intuitions, rules of thumb, unwritten heuristics) and codify it.`
        }
      ]
    };
  }

  @Resource({
    uri: 'app://guidelines/elicitation',
    name: 'Elicitation Guidelines',
    description: 'Best practices for conducting interviews to extract tacit knowledge.',
    mimeType: 'text/plain',
  })
  async getGuidelines() {
    return `1. Focus on specific scenarios, not general procedures.
2. Ask "What do you look for?" and "How does it feel/sound?"
3. Probe for exceptions to standard operating procedures.
4. Encourage storytelling about past critical incidents.`;
  }
}
