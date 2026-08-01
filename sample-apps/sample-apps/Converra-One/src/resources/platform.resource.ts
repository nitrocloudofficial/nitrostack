import { ConnectorManagerService } from '../services/ConnectorManager.service.js';

export const platformResource = {
  uri: 'resource://platforms/status',
  name: 'Platform Connection Health Status',
  description: 'Connection status, accounts, and sync times for 6 integrations',
  read: async () => {
    const manager = ConnectorManagerService.getInstance();
    return manager.getPlatformStatuses();
  }
};
