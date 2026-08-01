import { Injectable } from '@nitrostack/core';
import type { NitroStackServer } from '@nitrostack/core';

/**
 * Gives tool handlers a way to read live server state (currently: the
 * registered tool count for the ping health check). The NitroStackServer
 * instance itself only exists once McpApplicationFactory.create() returns, so
 * a @Tool method can't reach it any other way — src/index.ts's bootstrap()
 * calls setServer() right after create().
 */
@Injectable()
export class ServerInfo {
  private server?: NitroStackServer;

  setServer(server: NitroStackServer): void {
    this.server = server;
  }

  /** `tools` is typed private on NitroStackServer, but is a plain Map at runtime. */
  getToolCount(): number {
    if (!this.server) return 0;
    return (this.server as unknown as { tools: Map<string, unknown> }).tools.size;
  }
}
