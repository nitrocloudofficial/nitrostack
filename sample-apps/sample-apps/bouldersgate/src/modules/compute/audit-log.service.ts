import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import type { AuditEvent } from './compute.types.js';

const MAX_EVENTS = 500;

@Injectable()
export class AuditLogService {
  private readonly events: AuditEvent[] = [];

  record(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent {
    const recorded: AuditEvent = {
      eventId: `audit_${randomUUID()}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.events.push(recorded);
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }
    return structuredClone(recorded);
  }

  forAgent(agentId: string, limit = 50): AuditEvent[] {
    return this.events
      .filter((event) => event.agentId === agentId)
      .slice(-limit)
      .reverse()
      .map((event) => structuredClone(event));
  }
}
