import { ConnectorManagerService } from '../services/ConnectorManager.service.js';

export const getPlatformStatusTool = {
  name: 'getPlatformStatus',
  description: 'Returns connection status for 6 integrated platforms (Gmail, Slack, Discord, GitHub, Notion, Calendar)',
  execute: async () => {
    const manager = ConnectorManagerService.getInstance();
    return manager.getPlatformStatuses();
  }
};
