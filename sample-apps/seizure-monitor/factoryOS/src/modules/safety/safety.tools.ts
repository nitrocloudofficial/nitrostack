import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { SafetyService } from '../../services/safety.service.js';

@Injectable({ deps: [SafetyService] })
export class SafetyTools {
  constructor(private safetyService: SafetyService) {}

  @Tool({
    name: 'generate_safety_report',
    description: 'Generate Safety Report Tool: Compiles and formats an OSHA-compliant incident and hazard assessment report for a given safety incident.',
    inputSchema: z.object({
      incidentId: z.string().describe('The ID of the safety incident (e.g. "INC-2001")')
    })
  })
  async generateSafetyReport(input: { incidentId: string }, _ctx: ExecutionContext) {
    return await this.safetyService.generateSafetyReport(input.incidentId);
  }

  @Tool({
    name: 'create_incident_timeline',
    description: 'Create Incident Timeline Tool: Registers the chronological chain of events and milestones associated with an active safety incident for audit tracking.',
    inputSchema: z.object({
      incidentId: z.string().describe('The ID of the safety incident'),
      events: z.array(
        z.object({
          timestamp: z.string().describe('ISO timestamp or relative time of the event'),
          description: z.string().describe('A summary of the event that occurred')
        })
      ).describe('Array of timeline events')
    })
  })
  async createIncidentTimeline(
    input: { incidentId: string; events: Array<{ timestamp: string; description: string }> },
    _ctx: ExecutionContext
  ) {
    return await this.safetyService.createIncidentTimeline(input.incidentId, input.events);
  }
}
