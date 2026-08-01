import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { ReportService } from './report.service.js';

@Injectable({ deps: [ReportService] })
@Controller()
export class ReportTools {
  constructor(private readonly reportService: ReportService) {}

  @Tool({
    name: 'report',
    description: 'Perform Report operations',
    inputSchema: z.object({
      action: z.enum(['generateIncidentSummary', 'getRootCauseAnalysis', 'getEvidenceTimeline', 'getRecommendedActions', 'getResolutionStatus']),
      incidentId: z.string().optional()
    })
  })
  async execute(args: { action: string, incidentId?: string }) {
    switch(args.action) {
      case 'generateIncidentSummary': return { success: true, data: this.reportService.generateIncidentSummary(args.incidentId!) };
      case 'getRootCauseAnalysis': return { success: true, data: this.reportService.getRootCauseAnalysis(args.incidentId!) };
      case 'getEvidenceTimeline': return { success: true, data: this.reportService.getEvidenceTimeline(args.incidentId!) };
      case 'getRecommendedActions': return { success: true, data: this.reportService.getRecommendedActions(args.incidentId!) };
      case 'getResolutionStatus': return { success: true, data: this.reportService.getResolutionStatus(args.incidentId!) };
      default: throw new Error('Unknown action');
    }
  }
}
