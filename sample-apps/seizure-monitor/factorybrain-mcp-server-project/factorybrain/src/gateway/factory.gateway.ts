import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

type RecoveryHandler = (stream: string | undefined, afterSequence: number, workflowId?: string) => unknown[];

@WebSocketGateway({
  cors: {
    origin: process.env.FACTORYBRAIN_DASHBOARD_ORIGIN ?? 'http://localhost:3003',
    credentials: true,
  },
})
export class FactoryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private static instance?: FactoryGateway;
  private static recovery?: RecoveryHandler;

  @WebSocketServer()
  server!: Server;

  constructor() { FactoryGateway.instance = this; }

  handleConnection(client: Socket): void {
    console.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('workflow.join')
  handleJoinWorkflow(@ConnectedSocket() client: Socket, @MessageBody() payload: { workflowId: string }): void {
    if (payload?.workflowId) void client.join(`workflow:${payload.workflowId}`);
  }

  @SubscribeMessage('workflow.leave')
  handleLeaveWorkflow(@ConnectedSocket() client: Socket, @MessageBody() payload: { workflowId: string }): void {
    if (payload?.workflowId) void client.leave(`workflow:${payload.workflowId}`);
  }

  @SubscribeMessage('workflow.recover')
  handleRecovery(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { stream?: string; afterSequence?: number; workflowId?: string },
  ): void {
    const events = FactoryGateway.recovery?.(payload?.stream, payload?.afterSequence ?? 0, payload?.workflowId) ?? [];
    for (const event of events) {
      const item = event as { type?: string };
      client.emit(item.type ?? 'workflow.updated', event);
    }
    client.emit('recovery.complete', { stream: payload?.stream });
  }

  publishToWorkflow(workflowId: string, eventType: string, payload: unknown): void {
    this.server.to(`workflow:${workflowId}`).emit(eventType, payload);
  }

  static publish(workflowId: string, eventType: string, payload: unknown): void {
    FactoryGateway.instance?.publishToWorkflow(workflowId, eventType, payload);
  }

  static setRecoveryHandler(handler: RecoveryHandler): void { FactoryGateway.recovery = handler; }
}
