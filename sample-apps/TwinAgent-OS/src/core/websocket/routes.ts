import { FastifyInstance } from 'fastify';
import { wsManager } from '../../infrastructure/websocket/index.js';
import { WebSocket } from 'ws';

export async function websocketRoutes(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const rawSocket: WebSocket = (connection as any).socket || connection;
    wsManager.register(rawSocket);
    rawSocket.send(
      JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to TwinAgent OS Real-time Telemetry WebSocket Server',
        timestamp: new Date().toISOString(),
      })
    );
  });
}
