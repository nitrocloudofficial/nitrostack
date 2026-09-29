import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class TriageRouterPrompts {
  @Tool({
    name: 'generate_triage_report',
    description: 'Generate a triage report for submission routing and evaluation planning',
    inputSchema: z.object({
      submissionId: z.string().describe('Submission identifier'),
      submissionTitle: z.string().describe('Submission title'),
      routingPath: z.string().describe('Determined routing path'),
      priority: z.string().describe('Priority level (high, medium, low)'),
      recommendedEvaluators: z.array(z.string()).describe('List of recommended evaluator types'),
      estimatedReviewTime: z.number().describe('Estimated review time in minutes'),
      requiresManualReview: z.boolean().describe('Whether manual review is required')
    })
  })
  async generateTriageReport(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating triage report', { submissionId: input.submissionId });

    const report = `
TRIAGE REPORT
=============

Submission: ${input.submissionTitle}
ID: ${input.submissionId}
Priority: ${input.priority.toUpperCase()}

Routing Path: ${input.routingPath}
Estimated Review Time: ${input.estimatedReviewTime} minutes

Recommended Evaluators:
${input.recommendedEvaluators.map((e: string) => `  - ${e}`).join('\n')}

Manual Review Required: ${input.requiresManualReview ? 'YES' : 'NO'}

Next Steps:
${this.generateNextSteps(input.routingPath, input.requiresManualReview)}
    `.trim();

    return {
      submissionId: input.submissionId,
      report,
      routingPath: input.routingPath,
      status: 'triage_report_generated'
    };
  }

  private generateNextSteps(routingPath: string, requiresManualReview: boolean): string {
    let steps = '';

    switch (routingPath) {
      case 'full_evaluation':
        steps = `  1. Assign to recommended evaluators
  2. Conduct full rubric evaluation
  3. Generate judge report
  4. Assign tier and awards`;
        break;
      case 'code_evaluation':
        steps = `  1. Perform GitHub repository audit
  2. Evaluate code quality and completeness
  3. Request demo if available
  4. Generate evaluation report`;
        break;
      case 'documentation_required':
        steps = `  1. Request additional documentation
  2. Set deadline for submission
  3. Notify team of requirements
  4. Schedule follow-up evaluation`;
        break;
      case 'partial_evaluation':
        steps = `  1. Evaluate available components
  2. Document missing elements
  3. Provide feedback to team
  4. Allow resubmission opportunity`;
        break;
      case 'manual_review':
        steps = `  1. Flag for manual review by judges
  2. Assess submission completeness
  3. Determine if eligible for evaluation
  4. Provide guidance to team`;
        break;
      default:
        steps = `  1. Review submission details
  2. Determine evaluation approach
  3. Assign to appropriate evaluators`;
    }

    if (requiresManualReview) {
      steps += '\n  * PRIORITY: Manual review required before proceeding';
    }

    return steps;
  }
}
