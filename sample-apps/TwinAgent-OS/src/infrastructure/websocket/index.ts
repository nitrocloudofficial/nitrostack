import { WebSocket } from 'ws';
import { logger } from '../logger/index.js';

class WebSocketManager {
  private static instance: WebSocketManager;
  private clients: Set<WebSocket> = new Set();

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public register(ws: WebSocket) {
    this.clients.add(ws);
    logger.info(`[WebSocketManager] Client connected. Total active connections: ${this.clients.size}`);

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info(`[WebSocketManager] Client disconnected. Total active connections: ${this.clients.size}`);
    });
  }

  public broadcast(event: string, payload: unknown) {
    const data = JSON.stringify({ type: event, data: payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}

export const wsManager = WebSocketManager.getInstance();
