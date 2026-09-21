import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { ConnectorService } from './connector.service.js';

const connectorService = new ConnectorService();

export class ConnectorResources {
  @Resource({
    uri: 'aeios://connectors/status',
    name: 'Enterprise Connectors Status',
    description: 'Status of all enterprise connectors (GitHub, Slack, Jira)',
    mimeType: 'application/json',
  })
  async connectorStatus(ctx: ExecutionContext) {
    const connectors = connectorService.listConnectors();
    return {
      contents: [{
        uri: 'aeios://connectors/status',
        mimeType: 'application/json',
        text: JSON.stringify({ connectors, timestamp: new Date().toISOString() }, null, 2),
      }],
    };
  }
}
