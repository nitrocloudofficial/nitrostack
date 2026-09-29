import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class RubricEvaluatorTools {
  @Tool({
    name: 'evaluate-rubric-completeness',
    description: 'Evaluate a submission against hackathon rubric criteria',
    inputSchema: z.object({
      submissionId: z.string().describe('Unique submission identifier'),
      submissionTitle: z.string().describe('Title of the submission'),
      innovationScore: z.number().min(0).max(100).optional().describe('Innovation score (0-100)'),
      executionScore: z.number().min(0).max(100).optional().describe('Execution quality score (0-100)'),
      designScore: z.number().min(0).max(100).optional().describe('Design/UX score (0-100)'),
      completenessScore: z.number().min(0).max(100).optional().describe('Completeness score (0-100)'),
      feedbackNotes: z.string().optional().describe('Evaluator feedback notes')
    })
  })
  async evaluateAgainstRubric(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Evaluating submission against rubric', { submissionId: input.submissionId });

    const scores = [
      input.innovationScore ?? 75,
      input.executionScore ?? 75,
      input.designScore ?? 75,
      input.completenessScore ?? 75
    ];

    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const rubricResult = {
      submissionId: input.submissionId,
      submissionTitle: input.submissionTitle,
      scores: {
        innovation: input.innovationScore,
        execution: input.executionScore,
        design: input.designScore,
        completeness: input.completenessScore
      },
      averageScore,
      maxScore,
      minScore,
      feedback: input.feedbackNotes || 'No additional feedback',
      status: 'evaluated'
    };

    return rubricResult;
  }

  @Tool({
    name: 'calculate_rubric_tier',
    description: 'Determine tier ranking based on rubric scores',
    inputSchema: z.object({
      averageScore: z.number().min(0).max(100).describe('Average rubric score'),
      submissionId: z.string().describe('Submission identifier')
    })
  })
  async calculateRubricTier(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Calculating rubric tier', { submissionId: input.submissionId, score: input.averageScore });

    let tier: string;
    let tierDescription: string;

    if (input.averageScore >= 90) {
      tier = 'Platinum';
      tierDescription = 'Exceptional submission with outstanding innovation and execution';
    } else if (input.averageScore >= 80) {
      tier = 'Gold';
      tierDescription = 'Excellent submission with strong innovation and execution';
    } else if (input.averageScore >= 70) {
      tier = 'Silver';
      tierDescription = 'Good submission with solid execution and innovation';
    } else if (input.averageScore >= 60) {
      tier = 'Bronze';
      tierDescription = 'Acceptable submission with room for improvement';
    } else {
      tier = 'Participant';
      tierDescription = 'Submission completed but needs significant improvement';
    }

    return {
      submissionId: input.submissionId,
      averageScore: input.averageScore,
      tier,
      tierDescription,
      status: 'tier_assigned'
    };
  }

  @Tool({
    name: 'generate_rubric_report',
    description: 'Generate detailed rubric evaluation report',
    inputSchema: z.object({
      submissionId: z.string().describe('Submission identifier'),
      submissionTitle: z.string().describe('Submission title'),
      tier: z.string().describe('Assigned tier'),
      scores: z.object({
        innovation: z.number(),
        execution: z.number(),
        design: z.number(),
        completeness: z.number()
      }).describe('Rubric scores breakdown'),
      averageScore: z.number().describe('Average score'),
      feedback: z.string().optional().describe('Evaluator feedback')
    })
  })
  async generateRubricReport(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating rubric report', { submissionId: input.submissionId });

    const report = {
      submissionId: input.submissionId,
      submissionTitle: input.submissionTitle,
      tier: input.tier,
      averageScore: input.averageScore,
      scores: input.scores,
      feedback: input.feedback || 'No additional feedback provided',
      generatedAt: new Date().toISOString(),
      status: 'report_generated'
    };

    return report;
  }
}
