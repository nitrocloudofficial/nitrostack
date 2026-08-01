import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { JiraService } from './jira.service.js';

@Injectable({ deps: [JiraService] })
@Controller()
export class JiraTools {
  constructor(private readonly jiraService: JiraService) {}

  @Tool({
    name: 'jira',
    description: 'Perform Jira operations',
    inputSchema: z.object({
      action: z.enum(['createIncidentTicket', 'updateIncidentTicket']),
      title: z.string().optional(),
      description: z.string().optional(),
      severity: z.string().optional(),
      ticketId: z.string().optional(),
      status: z.string().optional(),
      comment: z.string().optional()
    })
  })
  async execute(args: { action: string, title?: string, description?: string, severity?: string, ticketId?: string, status?: string, comment?: string }) {
    switch(args.action) {
      case 'createIncidentTicket': return { success: true, data: this.jiraService.createIncidentTicket(args.title!, args.description!, args.severity!) };
      case 'updateIncidentTicket': return { success: true, data: this.jiraService.updateIncidentTicket(args.ticketId!, args.status!, args.comment!) };
      default: throw new Error('Unknown action');
    }
  }
}
