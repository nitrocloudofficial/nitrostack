import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';

/**
 * Phase 0: Prior Work Resources
 *
 * Provides access to prior work data through MCP Resources.
 */
@Injectable({ deps: [MemoryStore] })
export class PriorWorkResources {
  constructor(private memory: MemoryStore) {}

  @Resource({
    uri: 'memory://sessions/{topic}',
    name: 'Prior Sessions by Topic',
    description: 'List of prior AI research sessions matching a topic',
    mimeType: 'application/json',
  })
  async getSessionsByTopic(uri: string, ctx: ExecutionContext) {
    const topic = uri.replace('memory://sessions/', '');
    ctx.logger.info('Fetching prior sessions', { topic });

    const sessions = this.memory.findSessionsByTopic(topic);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          topic,
          count: sessions.length,
          sessions: sessions.map(s => ({
            sessionId: s.sessionId,
            topic: s.topic,
            status: s.status,
            verdict: s.verdicts[s.verdicts.length - 1]?.finalVerdict,
            resilienceScore: s.verdicts[s.verdicts.length - 1]?.resilienceScore,
            createdAt: s.createdAt,
            paperCount: s.papers.length,
          })),
        }, null, 2),
      }],
    };
  }

  @Resource({
    uri: 'memory://session/{sessionId}',
    name: 'Session Details',
    description: 'Full details of a research session',
    mimeType: 'application/json',
  })
  async getSession(uri: string, ctx: ExecutionContext) {
    const sessionId = uri.replace('memory://session/', '');
    ctx.logger.info('Fetching session', { sessionId });

    const session = this.memory.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(session, null, 2),
      }],
    };
  }

  @Resource({
    uri: 'memory://papers/{sessionId}',
    name: 'Session Papers',
    description: 'Papers collected in a research session',
    mimeType: 'application/json',
  })
  async getPapers(uri: string, ctx: ExecutionContext) {
    const sessionId = uri.replace('memory://papers/', '');
    ctx.logger.info('Fetching session papers', { sessionId });

    const papers = this.memory.getPapers(sessionId);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ sessionId, count: papers.length, papers }, null, 2),
      }],
    };
  }
}