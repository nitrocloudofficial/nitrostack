import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { LogsService } from './logs.service.js';

@Injectable({ deps: [LogsService] })
@Controller()
export class LogsTools {
  constructor(private readonly logsService: LogsService) {}

  @Tool({
    name: 'logs',
    description: 'Perform Log operations',
    inputSchema: z.object({
      action: z.enum(['searchLogs', 'latestErrors', 'getServiceLogs']),
      query: z.string().optional(),
      serviceName: z.string().optional()
    })
  })
  async execute(args: { action: string, query?: string, serviceName?: string }) {
    switch(args.action) {
      case 'searchLogs': return { success: true, data: this.logsService.searchLogs(args.query!) };
      case 'latestErrors': return { success: true, data: this.logsService.latestErrors() };
      case 'getServiceLogs': return { success: true, data: this.logsService.getServiceLogs(args.serviceName!) };
      default: throw new Error('Unknown action');
    }
  }
}
