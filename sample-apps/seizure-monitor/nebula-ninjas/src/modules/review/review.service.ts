/**
 * Sentinel Gateway — Review Queue Service
 * 
 * Human-in-the-loop approval queue for flagged/ambiguous calls.
 */

import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import { LedgerService } from '../ledger/ledger.service.js';
import { FingerprintService } from '../fingerprint/fingerprint.service.js';
import type { ReviewItem, ReviewType, ReviewStatus } from '../shared/types.js';

@Injectable({ deps: [LedgerService, FingerprintService] })
export class ReviewService {
  private queue: Map<string, ReviewItem> = new Map();
  private listeners: Array<(item: ReviewItem) => void> = [];

  constructor(
    private readonly ledger: LedgerService,
    private readonly fingerprint: FingerprintService,
  ) {}

  /**
   * Add a new item to the review queue.
   */
  addItem(params: {
    type: ReviewType;
    serverName: string;
    toolName: string;
    reason: string;
    details: Record<string, unknown>;
  }): ReviewItem {
    const item: ReviewItem = {
      id: randomUUID(),
      type: params.type,
      serverName: params.serverName,
      toolName: params.toolName,
      reason: params.reason,
      details: params.details,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };

    this.queue.set(item.id, item);

    // Notify listeners
    for (const listener of this.listeners) {
      try { listener(item); } catch { /* ignore */ }
    }

    console.error(`📋 Review item added: ${item.type} — ${item.reason}`);
    return item;
  }

  /**
   * Approve a review item. If it's a drift issue, re-pin the fingerprint.
   */
  approve(itemId: string, resolvedBy: string = 'admin'): ReviewItem | null {
    const item = this.queue.get(itemId);
    if (!item) return null;

    item.status = 'APPROVED';
    item.resolvedAt = new Date().toISOString();
    item.resolvedBy = resolvedBy;

    // If it was a drift detection, re-pin the tool with its new description
    if (item.type === 'DRIFT' && item.details.newDescription) {
      this.fingerprint.repinTool(
        item.serverName,
        item.toolName,
        item.details.newDescription as string,
        item.details.newSchema as Record<string, unknown> | undefined,
      );

      this.ledger.append({
        agentId: resolvedBy,
        serverName: item.serverName,
        toolName: item.toolName,
        action: 'FINGERPRINT_RESET',
        status: 'INFO',
        details: `Fingerprint re-pinned after admin approval. Review ID: ${itemId}`,
      });
    }

    this.ledger.append({
      agentId: resolvedBy,
      serverName: item.serverName,
      toolName: item.toolName,
      action: 'REVIEW_APPROVED',
      status: 'INFO',
      details: `Review item approved: ${item.reason}`,
    });

    return item;
  }

  /**
   * Deny a review item. The block remains active.
   */
  deny(itemId: string, resolvedBy: string = 'admin'): ReviewItem | null {
    const item = this.queue.get(itemId);
    if (!item) return null;

    item.status = 'DENIED';
    item.resolvedAt = new Date().toISOString();
    item.resolvedBy = resolvedBy;

    this.ledger.append({
      agentId: resolvedBy,
      serverName: item.serverName,
      toolName: item.toolName,
      action: 'REVIEW_DENIED',
      status: 'INFO',
      details: `Review item denied — block remains active: ${item.reason}`,
    });

    return item;
  }

  /**
   * Get all pending items.
   */
  getPendingItems(): ReviewItem[] {
    return Array.from(this.queue.values()).filter((i) => i.status === 'PENDING');
  }

  /**
   * Get all items (any status).
   */
  getAllItems(): ReviewItem[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get a specific item.
   */
  getItem(itemId: string): ReviewItem | undefined {
    return this.queue.get(itemId);
  }

  /**
   * Subscribe to new review items.
   */
  onNewItem(listener: (item: ReviewItem) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Count of pending items.
   */
  get pendingCount(): number {
    return this.getPendingItems().length;
  }
}
