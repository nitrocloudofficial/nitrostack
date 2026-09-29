import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class TriageRouterTools {
  @Tool({
    name: 'triage-submission',
    description: 'Route a submission to the appropriate judge based on tier and score',
    inputSchema: z.object({
      submissionId: z.string().describe('Submission identifier'),
      averageScore: z.number().describe('Average rubric score (0-100)'),
      tier: z.string().describe('Assigned tier (Platinum, Gold, Silver, Bronze, Participant)'),
      category: z.string().optional().describe('Submission category (e.g., Web App, Mobile, AI/ML)'),
      hasGitHub: z.boolean().optional().describe('Whether submission has GitHub repository'),
      hasDemo: z.boolean().optional().describe('Whether submission has live demo'),
      hasDocumentation: z.boolean().optional().describe('Whether submission has documentation'),
      teamSize: z.number().optional().describe('Number of team members')
    })
  })
  async triageSubmission(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Triaging submission', { submissionId: input.submissionId, tier: input.tier });

    const judgeLevel = this.assignJudgeLevel(input.tier);
    const priority = this.calculatePriorityByTier(input.tier, input.averageScore);
    const recommendedEvaluators = this.recommendEvaluatorsByTier(input.tier);

    return {
      submissionId: input.submissionId,
      tier: input.tier,
      averageScore: input.averageScore,
      judgeLevel,
      priority,
      recommendedEvaluators,
      requiresManualReview: input.averageScore < 50,
      estimatedReviewTime: this.estimateReviewTimeByTier(input.tier)
    };
  }



  private assignJudgeLevel(tier: string): string {
    const judgeMap: Record<string, string> = {
      'Platinum': 'senior-judge',
      'Gold': 'senior-judge',
      'Silver': 'mid-level-judge',
      'Bronze': 'junior-judge',
      'Participant': 'general-reviewer'
    };
    return judgeMap[tier] || 'general-reviewer';
  }

  private calculatePriorityByTier(tier: string, score: number): string {
    if (tier === 'Platinum' || tier === 'Gold') return 'high';
    if (tier === 'Silver') return 'medium';
    return 'low';
  }

  private recommendEvaluatorsByTier(tier: string): string[] {
    const evaluatorMap: Record<string, string[]> = {
      'Platinum': ['senior-judge', 'lead-evaluator'],
      'Gold': ['senior-judge', 'evaluator'],
      'Silver': ['mid-level-judge', 'evaluator'],
      'Bronze': ['junior-judge', 'reviewer'],
      'Participant': ['general-reviewer']
    };
    return evaluatorMap[tier] || ['general-reviewer'];
  }

  private estimateReviewTimeByTier(tier: string): number {
    const timeMap: Record<string, number> = {
      'Platinum': 60,
      'Gold': 45,
      'Silver': 30,
      'Bronze': 20,
      'Participant': 15
    };
    return timeMap[tier] || 30;
  }
}
