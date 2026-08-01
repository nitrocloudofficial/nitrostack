import { Injectable } from '@nitrostack/core';
import { ExternalStatusUpdate } from './monitoring.types.js';
@Injectable()
export class MockStatusService {
  private readonly updates = new Map<string, ExternalStatusUpdate[]>();
  set(update: ExternalStatusUpdate): void { this.updates.set(update.workflowId, [...(this.updates.get(update.workflowId) ?? []), structuredClone(update)]); }
  poll(workflowId: string): ExternalStatusUpdate[] { const found = this.updates.get(workflowId) ?? []; this.updates.delete(workflowId); return found.map((item) => structuredClone(item)); }
}
