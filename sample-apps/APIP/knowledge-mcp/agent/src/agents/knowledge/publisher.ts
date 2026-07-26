/**
 * Knowledge Graph Agent — Component 6: Publisher
 * 
 * Publishes events when the knowledge graph is updated.
 * Uses an in-memory EventEmitter for internal subscribers,
 * with optional HTTP webhook dispatch for external agents.
 */

import { EventEmitter } from 'events';
import { GraphEvent, EventType } from './models';

// ============================================================================
// EVENT BUS (In-Memory)
// ============================================================================

class KnowledgeEventBus extends EventEmitter {
  private webhookUrls: string[] = [];
  private eventLog: GraphEvent[] = [];

  constructor() {
    super();
    this.setMaxListeners(20);

    // Load webhook URLs from environment
    const urls = process.env.WEBHOOK_URLS;
    if (urls) {
      this.webhookUrls = urls.split(',').map((u) => u.trim()).filter(Boolean);
    }
  }

  /**
   * Register a webhook URL for external event dispatch.
   */
  registerWebhook(url: string): void {
    if (!this.webhookUrls.includes(url)) {
      this.webhookUrls.push(url);
      console.log(`[Publisher] Registered webhook: ${url}`);
    }
  }

  /**
   * Remove a webhook URL.
   */
  unregisterWebhook(url: string): void {
    this.webhookUrls = this.webhookUrls.filter((u) => u !== url);
    console.log(`[Publisher] Unregistered webhook: ${url}`);
  }

  /**
   * Publish an event to all subscribers (internal + webhooks).
   */
  async publish(event: GraphEvent): Promise<void> {
    // Store in event log
    this.eventLog.push(event);

    // Emit to internal listeners
    this.emit(event.event_type, event);
    this.emit('*', event); // Wildcard listener

    console.log(`[Publisher] Event: ${event.event_type} | Project: ${event.project_id} | ` +
      `Nodes: ${event.data.nodes_created || 0} created, ${event.data.nodes_updated || 0} updated | ` +
      `Edges: ${event.data.edges_created || 0}`);

    // Dispatch to external webhooks
    if (this.webhookUrls.length > 0) {
      await this.dispatchWebhooks(event);
    }
  }

  /**
   * Send event to all registered webhook URLs.
   * Non-blocking — failures are logged but don't break the pipeline.
   */
  private async dispatchWebhooks(event: GraphEvent): Promise<void> {
    const payload = JSON.stringify(event);

    const promises = this.webhookUrls.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Event-Type': event.event_type,
            'X-Project-Id': event.project_id,
          },
          body: payload,
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!response.ok) {
          console.warn(`[Publisher] Webhook ${url} returned ${response.status}`);
        } else {
          console.log(`[Publisher] Webhook ${url} → ${response.status} OK`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Publisher] Webhook ${url} failed: ${message}`);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get the event log (for debugging and audit).
   */
  getEventLog(): GraphEvent[] {
    return [...this.eventLog];
  }

  /**
   * Get recent events (last N).
   */
  getRecentEvents(count: number = 10): GraphEvent[] {
    return this.eventLog.slice(-count);
  }

  /**
   * Clear the event log.
   */
  clearEventLog(): void {
    this.eventLog = [];
  }
}

// Singleton instance
export const eventBus = new KnowledgeEventBus();

// ============================================================================
// CONVENIENCE PUBLISHERS
// ============================================================================

/**
 * Publish a graph.updated event after a full pipeline run.
 */
export function publishGraphUpdated(
  projectId: string,
  explorationId: string,
  stats: {
    nodes_created: number;
    nodes_updated: number;
    edges_created: number;
    modified_node_ids: string[];
    workflows_created: number;
  }
): void {
  const event: GraphEvent = {
    event_type: EventType.GRAPH_UPDATED,
    project_id: projectId,
    exploration_id: explorationId,
    timestamp: new Date().toISOString(),
    data: stats,
  };

  // Fire and forget — don't block the pipeline on webhook delivery
  eventBus.publish(event).catch((err) => {
    console.error('[Publisher] Failed to publish event:', err);
  });
}

/**
 * Publish an exploration.completed event.
 */
export function publishExplorationCompleted(
  projectId: string,
  explorationId: string,
  stats: {
    nodes_created: number;
    nodes_updated: number;
    edges_created: number;
    workflows_created: number;
  }
): void {
  const event: GraphEvent = {
    event_type: EventType.EXPLORATION_COMPLETED,
    project_id: projectId,
    exploration_id: explorationId,
    timestamp: new Date().toISOString(),
    data: stats,
  };

  eventBus.publish(event).catch((err) => {
    console.error('[Publisher] Failed to publish event:', err);
  });
}
