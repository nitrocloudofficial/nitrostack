import { Injectable, ToolDecorator as Tool, z } from '@nitrostack/core';
import { ServerInfo } from '../services/server-info.service.js';

const PingSchema = z.object({});

/** Lightweight, unauthenticated health check — also used for cold-start warm-up. */
@Injectable({ deps: [ServerInfo] })
export class HealthTools {
  constructor(private readonly serverInfo: ServerInfo) {}

  @Tool({
    name: 'ping',
    description: 'Health check — returns server uptime and registered tool count.',
    inputSchema: PingSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  })
  async ping() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      tools: this.serverInfo.getToolCount(),
      version: '1.0.0',
    };
  }
}
