import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { MetricsService } from './metrics.service.js';

@Injectable({ deps: [MetricsService] })
@Controller()
export class MetricsTools {
  constructor(private readonly metricsService: MetricsService) {}

  @Tool({
    name: 'metrics',
    description: 'Perform Metrics operations',
    inputSchema: z.object({
      action: z.enum(['getCpuUsage', 'getMemoryUsage', 'getErrorRate', 'getResponseTime']),
      serviceName: z.string().optional()
    })
  })
  async execute(args: { action: string, serviceName?: string }) {
    switch(args.action) {
      case 'getCpuUsage': return { success: true, data: this.metricsService.getCpuUsage() };
      case 'getMemoryUsage': return { success: true, data: this.metricsService.getMemoryUsage() };
      case 'getErrorRate': return { success: true, data: this.metricsService.getErrorRate() };
      case 'getResponseTime': return { success: true, data: this.metricsService.getResponseTime() };
      default: throw new Error('Unknown action');
    }
  }
}
