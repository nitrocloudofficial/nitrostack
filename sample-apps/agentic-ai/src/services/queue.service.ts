import { createHash } from 'node:crypto';
import { Injectable, OnModuleInit } from '@nitrostack/core';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AgentEventRecord, DatabaseService } from './database.service.js';

export interface AgentEvent<TPayload = unknown> {
  eventId: string;
  from: string;
  to: string;
  type: string;
  payload: TPayload;
  timestamp: string;
}

export interface PublishOptions {
  idempotencyKey?: string;
  attempts?: number;
}

export type AgentEventHandler<TPayload = unknown> = (event: AgentEvent<TPayload>) => Promise<void>;
export type AgentEventObserver = (record: AgentEventRecord) => Promise<void>;

@Injectable({ deps: [DatabaseService] })
export class QueueService implements OnModuleInit {
  private redis?: IORedis;
  private agentQueue?: Queue<AgentEvent>;
  private deadLetterQueue?: Queue<AgentEventRecord>;
  private worker?: Worker<AgentEvent>;
  private readonly handlers = new Map<string, AgentEventHandler>();
  private readonly observers = new Map<string, AgentEventObserver>();

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    const prefix = process.env.FACTORYBRAIN_QUEUE_PREFIX ?? 'factorybrain';
    this.agentQueue = new Queue<AgentEvent>('agent-events', { connection: this.redis, prefix });
    this.deadLetterQueue = new Queue<AgentEventRecord>('agent-events-dlq', { connection: this.redis, prefix });
  }

  registerHandler<TPayload>(to: string, type: string, handler: AgentEventHandler<TPayload>): void {
    const key = handlerKey(to, type);
    if (this.handlers.has(key)) {
      throw new Error(`Agent event handler already registered for ${key}`);
    }
    this.handlers.set(key, handler as AgentEventHandler);
    this.startWorker();
  }

  registerObserver(name: string, observer: AgentEventObserver): void {
    if (this.observers.has(name)) throw new Error(`Agent event observer already registered: ${name}`);
    this.observers.set(name, observer);
  }

  private startWorker(): void {
    if (!this.redis || this.worker) return;
    const prefix = process.env.FACTORYBRAIN_QUEUE_PREFIX ?? 'factorybrain';
    this.worker = new Worker<AgentEvent>(
      'agent-events',
      async (job) => this.deliver(job),
      {
        connection: this.redis,
        prefix,
        concurrency: Number(process.env.FACTORYBRAIN_QUEUE_CONCURRENCY ?? 10),
      },
    );
    this.worker.on('failed', (job, error) => {
      if (job) void this.handleFinalFailure(job, error);
    });
  }

  async publish<TPayload>(
    event: Omit<AgentEvent<TPayload>, 'eventId' | 'timestamp'>,
    options: PublishOptions = {},
  ): Promise<AgentEvent<TPayload>> {
    const timestamp = new Date().toISOString();
    const eventId = options.idempotencyKey ?? stableEventId(event);
    const existing = this.database.findAgentEvent(eventId);
    if (existing) {
      if (existing.status === 'failed') {
        throw new Error(existing.error ?? `Agent event ${eventId} previously failed`);
      }
      return {
        eventId: existing.eventId,
        from: existing.from,
        to: existing.to,
        type: existing.type,
        payload: existing.payload as TPayload,
        timestamp: existing.timestamp,
      };
    }
    const queuedEvent: AgentEvent<TPayload> = { ...event, eventId, timestamp };

    await this.persistTransition(toRecord(queuedEvent, 'queued'));

    if (!this.agentQueue) {
      const handler = this.handlers.get(handlerKey(event.to, event.type));
      if (!handler) {
        const error = new Error(`No agent event handler registered for ${handlerKey(event.to, event.type)}`);
        await this.persistTransition(toRecord(queuedEvent, 'failed', error.message));
        throw error;
      }
      try {
        await this.notifyObservers(toRecord(queuedEvent, 'started'));
        await handler(queuedEvent);
        await this.persistTransition(toRecord(queuedEvent, 'delivered'));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.persistTransition(toRecord(queuedEvent, 'failed', message));
        throw error;
      }
      return queuedEvent;
    }

    await this.agentQueue.add(event.type, queuedEvent, {
      jobId: eventId,
      attempts: options.attempts ?? Number(process.env.FACTORYBRAIN_QUEUE_ATTEMPTS ?? 5),
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: false,
    });
    return queuedEvent;
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.agentQueue?.close();
    await this.deadLetterQueue?.close();
    await this.redis?.quit();
  }

  private async deliver(job: Job<AgentEvent>): Promise<void> {
    const event = job.data;
    const handler = this.handlers.get(handlerKey(event.to, event.type));
    if (!handler) {
      throw new Error(`No agent event handler registered for ${handlerKey(event.to, event.type)}`);
    }
    await this.notifyObservers(toRecord(event, 'started'));
    await handler(event);
    await this.persistTransition(toRecord(event, 'delivered'));
  }

  private async handleFinalFailure(job: Job<AgentEvent>, error: Error): Promise<void> {
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) return;

    const failedRecord = toRecord(job.data, 'failed', error.message);
    await this.persistTransition(failedRecord);
    await this.deadLetterQueue?.add(job.name, failedRecord, {
      jobId: `${job.data.eventId}-dlq`,
      removeOnComplete: false,
      removeOnFail: false,
    });
  }

  private async persistTransition(record: AgentEventRecord): Promise<void> {
    await this.database.saveAgentEvent(record);
    await this.notifyObservers(record);
  }
  private async notifyObservers(record: AgentEventRecord): Promise<void> { for (const observer of this.observers.values()) await observer({ ...record }); }
}

function handlerKey(to: string, type: string): string {
  return `${to}:${type}`;
}

function stableEventId(event: { from: string; to: string; type: string; payload: unknown }): string {
  const digest = createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex')
    .slice(0, 32);
  return `${event.from}-${event.to}-${event.type}-${digest}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function toRecord(
  event: AgentEvent,
  status: AgentEventRecord['status'],
  error?: string,
): AgentEventRecord {
  return {
    eventId: event.eventId,
    from: event.from,
    to: event.to,
    type: event.type,
    payload: event.payload,
    timestamp: event.timestamp,
    status,
    ...(error ? { error } : {}),
  };
}
