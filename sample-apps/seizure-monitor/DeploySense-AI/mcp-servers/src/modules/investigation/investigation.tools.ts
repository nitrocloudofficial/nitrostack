import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { InvestigationService } from './investigation.service.js';

@Injectable({ deps: [InvestigationService] })
@Controller()
export class InvestigationTools {
  constructor(private readonly investigationService: InvestigationService) {}

  @Tool({
    name: 'investigation',
    description: 'Perform Investigation operations',
    inputSchema: z.object({
      action: z.enum(['investigateIncident']),
      incidentId: z.string()
    })
  })
  async execute(args: { action: string, incidentId: string }) {
    console.log('THIS BINDING:', this);
    console.log('INVESTIGATION SERVICE:', this.investigationService);
    switch(args.action) {
      case 'investigateIncident': return { success: true, data: await this.investigationService.investigateIncident(args.incidentId) };
      default: throw new Error('Unknown action');
    }
  }
}
