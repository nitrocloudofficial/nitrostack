import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class GuardianResources {
  @Resource({
    uri: 'guardian://status',
    name: 'Guardian System Status',
    description: 'Current GuardianSense backend status',
    mimeType: 'application/json',
    examples: {
      response: {
        system: 'online',
        monitoring: false,
        activeSessions: 0,
        connectedDevices: 0
      }
    }
  })
  async getStatus(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching GuardianSense system status');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              system: 'online',
              monitoring: false,
              activeSessions: 0,
              connectedDevices: 0
            },
            null,
            2
          )
        }
      ]
    };
  }
}