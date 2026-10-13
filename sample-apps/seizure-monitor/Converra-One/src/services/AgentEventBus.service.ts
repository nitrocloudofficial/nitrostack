import { EventEmitter } from 'events';

export type AgentEventType =
  | 'COLLECTION_STARTED'
  | 'COLLECTION_COMPLETED'
  | 'PRIORITY_STARTED'
  | 'PRIORITY_COMPLETED'
  | 'SUMMARY_STARTED'
  | 'SUMMARY_COMPLETED'
  | 'TASK_EXTRACTED'
  | 'REPLY_GENERATED'
  | 'WORKFLOW_STARTED'
  | 'WORKFLOW_COMPLETED'
  | 'AGENT_ERROR';

export interface AgentEventPayload<T = unknown> {
  type: AgentEventType;
  agentName: string;
  timestamp: Date;
  data?: T;
  executionTimeMs?: number;
  error?: string;
}

export class AgentEventBusService {
  private static instance: AgentEventBusService;
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
  }

  public static getInstance(): AgentEventBusService {
    if (!AgentEventBusService.instance) {
      AgentEventBusService.instance = new AgentEventBusService();
    }
    return AgentEventBusService.instance;
  }

  public emit<T>(event: AgentEventPayload<T>): boolean {
    return this.emitter.emit(event.type, event);
  }

  public on<T>(type: AgentEventType, listener: (event: AgentEventPayload<T>) => void): void {
    this.emitter.on(type, listener as (event: AgentEventPayload) => void);
  }

  public off<T>(type: AgentEventType, listener: (event: AgentEventPayload<T>) => void): void {
    this.emitter.off(type, listener as (event: AgentEventPayload) => void);
  }
}
