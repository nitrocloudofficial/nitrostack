import { ResourceDecorator as Resource, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { Session } from '../../core/memory/session.schema.js';

/**
 * Phase 12: Memory Persistence Resources
 *
 * Provides session-level resources for persistent memory across sessions.
 */
@Injectable({ deps: [MemoryStore] })
export class MemoryResources {
  constructor(private memory: MemoryStore) {}

  @Resource({
    uri: 'session://{sessionId?}',
    name: 'Research Session',
    description: 'Full research session state with all extracted knowledge',
    mimeType: 'application/json',
  })
  async getSession(sessionId?: string): Promise<Session[]> {
    if (sessionId) {
      const session = this.memory.getSession(sessionId);
      return session ? [session] : [];
    }
    return this.memory.listSessions();
  }

  @Resource({
    uri: 'session://{sessionId}/knowledge-graph',
    name: 'Session Knowledge Graph',
    description: 'Entities and relationships extracted from the session',
    mimeType: 'application/json',
  })
  async getKnowledgeGraph(sessionId: string) {
    const session = this.memory.getSession(sessionId);
    if (!session) {
      return { sessionId, entities: [], relationships: [] };
    }
    // knowledgeGraph is an array of KnowledgeGraphEdge with subject, relation, object
    const edges = session.knowledgeGraph || [];
    // Extract unique entities from subject and object
    const entities = [...new Set(edges.flatMap(e => [e.subject, e.object]))];
    return {
      sessionId,
      entities: entities.map(e => ({ name: e })),
      relationships: edges.map(e => ({
        subject: e.subject,
        relation: e.relation,
        object: e.object,
        weight: e.weight,
        source: e.source,
      })),
    };
  }

  @Resource({
    uri: 'memory://sessions',
    name: 'All Sessions',
    description: 'List all persisted research sessions',
    mimeType: 'application/json',
  })
  async listAllSessions() {
    const sessions = this.memory.listSessions();
    return sessions.map((s: Session) => ({
      sessionId: s.sessionId,
      topic: s.topic,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      paperCount: s.papers.length,
      claimCount: s.claims.length,
      gapCount: s.gaps.length,
      reviewCycleCount: s.reviews.length, // schema has 'reviews' not 'reviewCycles'
    }));
  }

  @Resource({
    uri: 'memory://sessions/topic/{topic}',
    name: 'Sessions by Topic',
    description: 'Find prior sessions by research topic',
    mimeType: 'application/json',
  })
  async findSessionsByTopic(topic: string) {
    const sessions = this.memory.findSessionsByTopic(topic);
    const results = [];
    const topicLower = topic.toLowerCase();

    for (const session of sessions) {
      if (
        session.topic.toLowerCase().includes(topicLower) ||
        session.papers.some(p => p.title.toLowerCase().includes(topicLower)) ||
        session.claims.some(c => c.text.toLowerCase().includes(topicLower))
      ) {
        results.push({
          sessionId: session.sessionId,
          topic: session.topic,
          createdAt: session.createdAt,
          paperCount: session.papers.length,
          claimCount: session.claims.length,
          matchType: session.topic.toLowerCase().includes(topicLower) ? 'topic' : 'content',
        });
      }
    }
    return results;
  }
}