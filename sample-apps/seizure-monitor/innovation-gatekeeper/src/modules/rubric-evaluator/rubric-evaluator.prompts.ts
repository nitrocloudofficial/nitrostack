import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class RubricEvaluatorPrompts {
  @Tool({
    name: 'generate_evaluation_summary',
    description: 'Generate a summary of the rubric evaluation for judge review',
    inputSchema: z.object({
      submissionId: z.string().describe('Submission identifier'),
      submissionTitle: z.string().describe('Submission title'),
      tier: z.string().describe('Assigned tier (Platinum, Gold, Silver, Bronze, Participant)'),
      averageScore: z.number().describe('Average rubric score'),
      innovationScore: z.number().describe('Innovation score'),
      executionScore: z.number().describe('Execution score'),
      designScore: z.number().describe('Design score'),
      completenessScore: z.number().describe('Completeness score'),
      feedback: z.string().optional().describe('Evaluator feedback')
    })
  })
  async generateEvaluationSummary(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating evaluation summary', { submissionId: input.submissionId });

    const summary = `
Submission: ${input.submissionTitle}
ID: ${input.submissionId}
Tier: ${input.tier}
Average Score: ${input.averageScore}/100

Rubric Breakdown:
- Innovation: ${input.innovationScore}/100
- Execution: ${input.executionScore}/100
- Design: ${input.designScore}/100
- Completeness: ${input.completenessScore}/100

Evaluator Notes:
${input.feedback || 'No additional feedback provided'}

Recommendation:
${this.generateRecommendation(input.tier, input.averageScore)}
    `.trim();

    return {
      submissionId: input.submissionId,
      summary,
      tier: input.tier,
      status: 'summary_generated'
    };
  }

  private generateRecommendation(tier: string, score: number): string {
    switch (tier) {
      case 'Platinum':
        return 'Highly recommended for awards and recognition. Exceptional work that demonstrates outstanding innovation and execution.';
      case 'Gold':
        return 'Recommended for awards. Strong submission with excellent innovation and execution quality.';
      case 'Silver':
        return 'Solid submission worthy of consideration. Good innovation and execution with minor areas for improvement.';
      case 'Bronze':
        return 'Acceptable submission. Shows promise but would benefit from refinement in several areas.';
      case 'Participant':
        return 'Submission completed. Encourage participant to address feedback and resubmit in future hackathons.';
      default:
        return 'Evaluation complete. Review feedback for improvement areas.';
    }
  }
}
