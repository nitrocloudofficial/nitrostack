import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { GapAnalysisService } from './gap-analysis.service.js';

const IdentifyMissingInfoSchema = z.object({
  symptoms: z.array(z.string()).describe('Extracted symptoms from transcript'),
  historyConditions: z.array(z.string()).optional().default([]).describe('Known patient conditions')
});

@Injectable({ deps: [GapAnalysisService] })
export class GapAnalysisController {
  constructor(private readonly gapAnalysisService: GapAnalysisService) {}

  @Tool({
    name: 'identify_missing_info',
    description: 'Perform clinical gap analysis to discover missing patient history, unasked risk factors, and recommended follow-up questions.',
    inputSchema: IdentifyMissingInfoSchema,
    examples: {
      request: { symptoms: ['chest pain', 'cough'], historyConditions: ['Type 2 Diabetes'] },
      response: {
        agent: 'Gap Analysis Agent',
        missingRiskFactors: ['Smoking & Tobacco History', 'Recent Travel & Exposure'],
        suggestedQuestions: ['Have you ever smoked?']
      }
    }
  })
  async identifyMissingInfo(args: z.infer<typeof IdentifyMissingInfoSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`🔍 [Gap Analysis Agent] Evaluating clinical gaps for symptoms: ${args.symptoms.join(', ')}`);
    const gapData = this.gapAnalysisService.analyzeGaps(args.symptoms, args.historyConditions);
    return {
      status: 'success',
      agent: 'Gap Analysis Agent',
      ...gapData
    };
  }
}
