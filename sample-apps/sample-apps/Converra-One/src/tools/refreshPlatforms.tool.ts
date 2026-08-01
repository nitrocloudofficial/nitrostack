import { ConnectorManagerService } from '../services/ConnectorManager.service.js';

export const refreshPlatformsTool = {
  name: 'refreshPlatforms',
  description: 'Triggers a re-sync across all platform channels',
  execute: async () => {
    const manager = ConnectorManagerService.getInstance();
    const messages = await manager.fetchAllMessages();
    return {
      status: 'success',
      refreshedAt: new Date(),
      harvestedCount: messages.length
    };
  }
};
