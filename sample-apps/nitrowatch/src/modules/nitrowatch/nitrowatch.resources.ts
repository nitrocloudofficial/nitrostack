import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { SERVERS, LOGS } from './nitrowatch.store.js';

export class NitroWatchResources {
  @Resource({ uri: 'nitrowatch://servers', name: 'Registered servers', description: 'All MCP servers currently registered with NitroWatch', mimeType: 'application/json' })
  async getServers(uri: string, ctx: ExecutionContext) {
    return { servers: Array.from(SERVERS.values()) };
  }

  @Resource({ uri: 'nitrowatch://servers/{serverId}/logs', name: 'Server logs', description: 'Recent log entries for a given registered server', mimeType: 'application/json' })
  async getLogs(uri: string, ctx: ExecutionContext) {
    const serverId = uri.split('/')[2];
    return { logs: LOGS.get(serverId) ?? [] };
  }
}

