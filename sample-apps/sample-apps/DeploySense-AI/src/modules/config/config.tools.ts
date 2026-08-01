import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { ConfigService } from './config.service.js';

@Injectable({ deps: [ConfigService] })
@Controller()
export class ConfigTools {
  constructor(private readonly configService: ConfigService) {}

  @Tool({
    name: 'config',
    description: 'Perform Configuration operations like querying environment variables',
    inputSchema: z.object({
      action: z.enum(['getEnvVariables', 'getActiveScenario']),
      serviceName: z.string().optional()
    })
  })
  async execute(args: { action: string, serviceName?: string }) {
    switch (args.action) {
      case 'getEnvVariables': {
        const configData = this.configService.getMockData('config');
        if (configData) {
          return { success: true, data: configData };
        }
        return { success: false, error: 'No configuration found for active scenario' };
      }
      case 'getActiveScenario': {
        return { success: true, data: { activeScenario: this.configService.getActiveScenarioName() } };
      }
      default:
        throw new Error('Unknown action');
    }
  }
}
