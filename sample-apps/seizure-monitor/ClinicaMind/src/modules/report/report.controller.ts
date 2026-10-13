import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { ReportService } from './report.service.js';

const GenerateSummarySchema = z.object({
  findings: z.any().describe('Aggregated JSON findings object from History, Medication, Research, and Gap Analysis agents')
});

@Injectable({ deps: [ReportService] })
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Tool({
    name: 'generate_clinical_summary',
    description: 'Synthesize all multi-agent findings into a final, evidence-backed clinical briefing for the physician workspace.',
    inputSchema: GenerateSummarySchema,
    examples: {
      request: { findings: { symptoms: ['chest pain'], patientId: '1234' } },
      response: {
        agent: 'Report Generator Agent',
        summary: {
          chiefComplaint: 'Acute chest pain...',
          riskLevel: 'CRITICAL RISK'
        }
      }
    }
  })
  async generateClinicalSummary(args: z.infer<typeof GenerateSummarySchema>, ctx: ExecutionContext) {
    ctx.logger.info(`📋 [Report Generator Agent] Compiling final clinical summary briefing...`);
    const summary = this.reportService.generateSummary(args.findings);
    return {
      status: 'success',
      agent: 'Report Generator Agent',
      summary
    };
  }
}
