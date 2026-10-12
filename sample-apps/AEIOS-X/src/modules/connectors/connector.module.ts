import { Module } from '@nitrostack/core';
import { ConnectorTools } from './connector.tools.js';
import { ConnectorResources } from './connector.resources.js';

@Module({
  name: 'connectors',
  description: 'Enterprise Connectors - GitHub, Slack, Jira integration',
  controllers: [ConnectorTools, ConnectorResources],
})
export class ConnectorsModule {}
