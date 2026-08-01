import { io, type Socket } from 'socket.io-client';
import type { ConnectionStatus, FactorySocketEvent } from '../types/factory.types';
import { widgetRuntimeConfig } from './runtime-config';

type Handler = (event: FactorySocketEvent) => void;

class FactorySocketService {
  private socket?: Socket;
  private workflowId?: string;
  private lastSequence = 0;
  private consumers = 0;
  private status: ConnectionStatus = 'connecting';
  private handlers = new Set<Handler>();
  private statusHandlers = new Set<(status: ConnectionStatus) => void>();

  acquire(workflowId?: string): () => void {
    this.consumers += 1;
    const previous = this.workflowId;
    if (previous && previous !== workflowId) this.socket?.emit('workflow.leave', { workflowId: previous });
    this.workflowId = workflowId;
    if (!this.socket) this.open();
    else if (this.socket.connected) { this.emitStatus('connected'); this.join(); }
    return () => { if (--this.consumers <= 0) this.disconnect(); };
  }

  subscribe(handler: Handler) { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  subscribeStatus(handler: (status: ConnectionStatus) => void) { this.statusHandlers.add(handler); handler(this.status); return () => this.statusHandlers.delete(handler); }

  private open() {
    this.emitStatus('connecting');
    this.socket = io(widgetRuntimeConfig.websocketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
    });
    this.socket.on('connect', () => {
      this.emitStatus('connected'); this.join();
      this.socket?.emit('workflow.recover', { stream: 'monitoring', afterSequence: this.lastSequence, workflowId: this.workflowId });
    });
    this.socket.io.on('reconnect_attempt', () => this.emitStatus('reconnecting'));
    this.socket.on('disconnect', () => this.emitStatus(this.consumers ? 'reconnecting' : 'disconnected'));
    this.socket.on('connect_error', (error) => { console.error('FactoryBrain Socket.IO connection failed', error.message); this.emitStatus('reconnecting'); });
    this.socket.onAny((eventType, payload: FactorySocketEvent) => {
      if (!payload || typeof payload !== 'object') return;
      const event = { ...payload, type: payload.type ?? eventType } as FactorySocketEvent;
      if (event.sequence && event.sequence <= this.lastSequence) return;
      if (event.sequence) this.lastSequence = event.sequence;
      if (this.workflowId && event.workflowId && event.workflowId !== this.workflowId) return;
      this.handlers.forEach((handler) => handler(event));
    });
  }

  private join() { if (this.workflowId) this.socket?.emit('workflow.join', { workflowId: this.workflowId }); }
  private disconnect() { this.consumers = 0; if (this.workflowId) this.socket?.emit('workflow.leave', { workflowId: this.workflowId }); this.socket?.disconnect(); this.socket = undefined; this.emitStatus('disconnected'); }
  private emitStatus(status: ConnectionStatus) { this.status = status; this.statusHandlers.forEach((handler) => handler(status)); }
}

export const factorySocket = new FactorySocketService();
