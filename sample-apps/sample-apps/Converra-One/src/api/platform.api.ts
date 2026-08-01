import { ConnectorManagerService } from '../services/ConnectorManager.service.js';

export async function fetchPlatformStatuses() {
  const manager = ConnectorManagerService.getInstance();
  return manager.getPlatformStatuses();
}
