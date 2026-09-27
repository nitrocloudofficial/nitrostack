import { Injectable } from '@nitrostack/core';

@Injectable()
export class ResourceNotifierService {
  private server: any;

  /**
   * Called at bootstrap to inject the core McpServer instance.
   */
  public setServer(server: any) {
    this.server = server;
  }

  /**
   * Dispatches a resource update notification to the MCP client.
   * Defensive: fails silently if server is unset or unsupported.
   */
  public notify(uri: string): void {
    if (!this.server) {
      console.debug(`[ResourceNotifier] No server instance attached, dropping update for: ${uri}`);
      return;
    }
    
    if (typeof this.server.notifyResourceUpdated !== 'function') {
      console.debug(`[ResourceNotifier] notifyResourceUpdated not supported in this SDK, dropping update for: ${uri}`);
      return;
    }
    
    try {
      this.server.notifyResourceUpdated(uri);
    } catch (e) {
      console.debug(`[ResourceNotifier] Error notifying update for ${uri}:`, e);
    }
  }
}
