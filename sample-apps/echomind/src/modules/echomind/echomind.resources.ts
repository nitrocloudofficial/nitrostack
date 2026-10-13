import {
  ResourceDecorator as Resource,
  ExecutionContext
} from '@nitrostack/core';

export class EchoMindResources {

  @Resource({
    uri: 'echomind://status',
    name: 'EchoMind Status',
    description: 'Current status of EchoMind'
  })
  async status(uri: string, ctx: ExecutionContext) {

    ctx.logger.info("Fetching EchoMind status");

    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          status: "Running",
          version: "1.0"
        })
      }]
    };
  }

}