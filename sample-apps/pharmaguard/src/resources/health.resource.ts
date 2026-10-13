import { ControllerDecorator as Controller, ResourceDecorator as Resource, type ExecutionContext } from '@nitrostack/core';

@Controller()
export class HealthResource {
  @Resource({
    uri: 'health://status',
    name: 'System Health Status',
    description: 'Returns the current health status of the MCP server',
    mimeType: 'application/json',
  })
  async getStatus(context: ExecutionContext) {
    return {
      contents: [
        {
          uri: 'health://status',
          mimeType: 'application/json',
          text: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        },
      ],
    };
  }
}
