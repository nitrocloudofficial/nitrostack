import { ToolDecorator as Tool, Widget, ResourceDecorator as Resource, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { SemanticScholarService } from '../../core/services/semantic-scholar.service.js';
import { GithubService } from '../../core/services/github.service.js';
import { Paper, Repo, PriorSession } from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 0: Prior Work Search & Memory Lookup
 */
@Injectable({ deps: [MemoryStore, SemanticScholarService, GithubService] })
export class PriorWorkTools {
  constructor(
    private memory: MemoryStore,
    private semanticScholar: SemanticScholarService,
    private github: GithubService
  ) {
    console.error('[DEBUG PriorWorkTools] Constructor called', {
      hasMemory: !!memory,
      hasSemanticScholar: !!semanticScholar,
      hasGithub: !!github,
      semanticScholarKeys: semanticScholar ? Object.keys(semanticScholar) : 'undefined',
    });
  }

  @Tool({
    name: 'search_prior_work',
    description: 'Search for prior work: papers, repos, and previous sessions on a topic',
    inputSchema: z.object({
      topic: z.string().describe('Research topic'),
      maxPapers: z.number().int().default(10).describe('Max papers to return'),
      maxRepos: z.number().int().default(8).describe('Max repos to return'),
      sessionId: z.string().optional().describe('Session ID to store results'),
    }),
    invocation: {
      invoking: 'Searching Semantic Scholar, GitHub, and session memory...',
      invoked: 'Prior work search complete'
    },
    examples: {
      request: { topic: 'federated learning privacy', maxPapers: 5, maxRepos: 3, sessionId: 'sess_001' },
      response: {
        topic: 'federated learning privacy',
        papers: [
          { paperId: 'p1', title: 'DP-FedAvg: Differentially Private Federated Learning', authors: ['A. Smith', 'B. Jones'], year: 2023, venue: 'ICML', citationCount: 127, quartile: 'Q1', url: 'https://...' },
          { paperId: 'p2', title: 'Byzantine-Robust FL with DP', authors: ['C. Lee'], year: 2022, venue: 'IEEE S&P', citationCount: 89, quartile: 'Q1', url: 'https://...' }
        ],
        repos: [
          { name: 'tensorflow/privacy', url: 'https://github.com/tensorflow/privacy', description: 'Privacy-preserving ML', stars: 3200, language: 'Python', updatedAt: '2024-01-15' }
        ],
        priorSessions: [
          { sessionId: 'sess_001', topic: 'federated learning', status: 'completed', verdict: 'PASS', resilienceScore: 87, createdAt: '2026-07-20T10:00:00Z' }
        ]
      }
    }
  })
  @Widget('chat-history-sidebar')
  async searchPriorWork(
    input: { topic: string; maxPapers: number; maxRepos: number; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { topic, maxPapers, maxRepos, sessionId } = input;

    ctx.logger.info('Searching prior work', { topic, maxPapers, maxRepos });

    // Search papers
    const papers = await this.semanticScholar.searchPapers(topic, { limit: maxPapers });

    // Search GitHub repos
    const repos = await this.github.searchRepos(topic, maxRepos);

    // Check for prior sessions
    const priorSessions = this.memory.findSessionsByTopic(topic);

    // Store in session if provided
    if (sessionId) {
      this.memory.setPriorWork(
        sessionId,
        papers,
        repos.map(r => ({
          name: r.name,
          url: r.url,
          description: r.description,
          stars: r.stars,
          updatedAt: r.updatedAt,
        })),
        priorSessions.map(s => ({
          sessionId: s.sessionId,
          topic: s.topic,
          verdict: s.verdicts?.[s.verdicts.length - 1]?.finalVerdict,
          resilienceScore: s.verdicts?.[s.verdicts.length - 1]?.resilienceScore,
          createdAt: s.createdAt,
        }))
      );
    }

    return {
      topic,
      papers: papers.map(p => ({
        paperId: p.paperId,
        title: p.title,
        authors: p.authors,
        year: p.year,
        venue: p.venue,
        citationCount: p.citationCount,
        quartile: p.quartile,
        url: p.url,
      })),
      repos: repos.map(r => ({
        name: r.name,
        url: r.url,
        description: r.description,
        stars: r.stars,
        language: r.language,
        updatedAt: r.updatedAt,
      })),
      priorSessions: priorSessions.map(s => ({
        sessionId: s.sessionId,
        topic: s.topic,
        status: s.status,
        verdict: s.verdicts?.[s.verdicts.length - 1]?.finalVerdict,
        resilienceScore: s.verdicts?.[s.verdicts.length - 1]?.resilienceScore,
        createdAt: s.createdAt,
      })),
    };
  }

  @Tool({
    name: 'verify_repo_relevance',
    description: 'Verify if a repository is genuinely relevant to the topic (stub for LLM)',
    inputSchema: z.object({
      repoDescription: z.string().describe('Repository description'),
      topic: z.string().describe('Research topic'),
    }),
    invocation: {
      invoking: 'Checking repository relevance...',
      invoked: 'Relevance verification complete'
    },
    examples: {
      request: { repoDescription: 'Privacy-preserving federated learning framework with DP-SGD', topic: 'federated learning differential privacy' },
      response: { relevant: true, matchScore: 85, reason: 'Found 6/7 topic keywords in description' }
    }
  })
  @Widget('chat-history-sidebar')
  async verifyRepoRelevance(
    input: { repoDescription: string; topic: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Verifying repo relevance', { topic: input.topic });

    // Simple keyword overlap check
    const topicWords = input.topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const descWords = input.repoDescription.toLowerCase().split(/\s+/);

    const matches = topicWords.filter(w => descWords.some(d => d.includes(w))).length;
    const relevant = matches >= Math.max(1, topicWords.length * 0.3);

    return {
      relevant,
      matchScore: Math.round((matches / topicWords.length) * 100),
      reason: relevant
        ? `Found ${matches}/${topicWords.length} topic keywords in description`
        : `Only ${matches}/${topicWords.length} topic keywords found`,
    };
  }

  @Resource({
    uri: 'memory://prior-sessions/{topic}',
    name: 'Prior Sessions',
    description: 'List of previous research sessions on a topic',
    mimeType: 'application/json',
  })
  async getPriorSessions(uri: string, ctx: ExecutionContext) {
    const topic = uri.split('/').pop() || '';
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
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            verdict: s.verdicts?.[s.verdicts.length - 1]?.finalVerdict,
            resilienceScore: s.verdicts?.[s.verdicts.length - 1]?.resilienceScore,
          })),
        }, null, 2),
      }],
    };
  }

  @Resource({
    uri: 'memory://session/{sessionId}',
    name: 'Session Details',
    description: 'Full session details',
    mimeType: 'application/json',
  })
  async getSession(uri: string, ctx: ExecutionContext) {
    const sessionId = uri.split('/').pop() || '';
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
}