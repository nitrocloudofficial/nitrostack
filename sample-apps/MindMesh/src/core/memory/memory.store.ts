import { Injectable, OnModuleInit, OnModuleDestroy } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '../config/config.service.js';
import {
  Session,
  SessionSchema,
  Paper,
  Repo,
  PriorSession,
  Claim,
  Methodology,
  Dataset,
  Metric,
  TechnicalParams,
  Cluster,
  Contradiction,
  ResearchGap,
  ReviewResult,
  Verdict,
  Analogy,
  Citation,
  WritingCheck,
  VerificationCheck,
  KnowledgeGraphEdge,
} from './session.schema.js';

/**
 * Memory Store
 *
 * In-memory session storage with periodic JSON persistence.
 * Provides fast access for tool execution with durability across restarts.
 */
@Injectable()
export class MemoryStore implements OnModuleInit, OnModuleDestroy {
  private sessions = new Map<string, Session>();
  private persistTimer: NodeJS.Timeout | null = null;
  private persistPath: string;
  private persistIntervalMs: number;

  constructor(private config: ConfigService) {
    const memConfig = config.getMemoryConfig();
    this.persistPath = memConfig.persistPath;
    this.persistIntervalMs = memConfig.intervalMs;
  }

  onModuleInit(): void {
    this.loadFromDisk();
    this.startPersistenceTimer();
  }

  onModuleDestroy(): void {
    this.stopPersistenceTimer();
    this.saveToDisk();
  }

  /**
   * Load sessions from JSON file on startup
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = fs.readFileSync(this.persistPath, 'utf-8');
        const parsed = JSON.parse(data);
        const validated = SessionSchema.array().safeParse(parsed);
        if (validated.success) {
          for (const session of validated.data) {
            this.sessions.set(session.sessionId, session);
          }
          console.log(`[MemoryStore] Loaded ${this.sessions.size} sessions from disk`);
        } else {
          console.warn('[MemoryStore] Failed to validate persisted sessions, starting fresh');
        }
      }
    } catch (error) {
      console.warn('[MemoryStore] Failed to load from disk:', error);
    }
  }

  /**
   * Save sessions to JSON file
   */
  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.sessions.values());
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[MemoryStore] Failed to save to disk:', error);
    }
  }

  private startPersistenceTimer(): void {
    this.persistTimer = setInterval(() => {
      this.saveToDisk();
    }, this.persistIntervalMs);
    // Don't prevent process exit
    this.persistTimer.unref?.();
  }

  private stopPersistenceTimer(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
  }

  // ========== Session CRUD ==========

  /**
   * Create a new session
   */
  createSession(sessionId: string, topic: string): Session {
    const now = new Date().toISOString();
    const session: Session = SessionSchema.parse({
      sessionId,
      topic,
      createdAt: now,
      updatedAt: now,
      status: 'active',
    });
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get or create a session
   */
  getOrCreateSession(sessionId: string, topic: string): Session {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId, topic);
    }
    return session;
  }

  /**
   * Update a session
   */
  updateSession(sessionId: string, updates: Partial<Session>): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const updated = SessionSchema.parse({
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    this.sessions.set(sessionId, updated);
    return updated;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * List all sessions (optional topic filter)
   */
  listSessions(topicFilter?: string): Session[] {
    const sessions = Array.from(this.sessions.values());
    if (topicFilter) {
      return sessions.filter(s =>
        s.topic.toLowerCase().includes(topicFilter.toLowerCase())
      );
    }
    return sessions;
  }

  /**
   * Get all sessions as a Map
   */
  getAllSessions(): Map<string, Session> {
    return new Map(this.sessions);
  }

  /**
   * Find sessions by topic
   */
  findSessionsByTopic(topic: string): Session[] {
    return this.listSessions(topic);
  }

  // ========== Paper Management ==========

  addPapers(sessionId: string, papers: Paper[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const existingIds = new Set(session.papers.map(p => p.paperId));
    const newPapers = papers.filter(p => !existingIds.has(p.paperId));
    session.papers.push(...newPapers);
    return this.updateSession(sessionId, { papers: session.papers });
  }

  getPapers(sessionId: string): Paper[] {
    return this.sessions.get(sessionId)?.papers ?? [];
  }

  getPaper(sessionId: string, paperId: string): Paper | undefined {
    return this.sessions.get(sessionId)?.papers.find(p => p.paperId === paperId);
  }

  hasPaper(sessionId: string, paperId: string): boolean {
    return this.sessions.get(sessionId)?.papers.some(p => p.paperId === paperId) ?? false;
  }

  // ========== Repo Management ==========

  addRepos(sessionId: string, repos: Repo[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.priorWork.repos.push(...repos);
    return this.updateSession(sessionId, { priorWork: session.priorWork });
  }

  // ========== Claim Management ==========

  addClaims(sessionId: string, claims: Claim[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.claims.push(...claims);
    return this.updateSession(sessionId, { claims: session.claims });
  }

  getClaims(sessionId: string, paperId?: string): Claim[] {
    const claims = this.sessions.get(sessionId)?.claims ?? [];
    if (paperId) return claims.filter(c => c.paperId === paperId);
    return claims;
  }

  // ========== Methodology Management ==========

  addMethodologies(sessionId: string, methodologies: Methodology[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.methodologies.push(...methodologies);
    return this.updateSession(sessionId, { methodologies: session.methodologies });
  }

  getMethodologies(sessionId: string): Methodology[] {
    return this.sessions.get(sessionId)?.methodologies ?? [];
  }

  // ========== Dataset Management ==========

  addDatasets(sessionId: string, datasets: Dataset[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.datasets.push(...datasets);
    return this.updateSession(sessionId, { datasets: session.datasets });
  }

  getDatasets(sessionId: string): Dataset[] {
    return this.sessions.get(sessionId)?.datasets ?? [];
  }

  // ========== Metric Management ==========

  addMetrics(sessionId: string, metrics: Metric[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.metrics.push(...metrics);
    return this.updateSession(sessionId, { metrics: session.metrics });
  }

  getMetrics(sessionId: string): Metric[] {
    return this.sessions.get(sessionId)?.metrics ?? [];
  }

  // ========== Technical Params ==========

  addTechnicalParams(sessionId: string, params: TechnicalParams[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.technicalParams.push(...params);
    return this.updateSession(sessionId, { technicalParams: session.technicalParams });
  }

  getTechnicalParams(sessionId: string): TechnicalParams[] {
    return this.sessions.get(sessionId)?.technicalParams ?? [];
  }

  // ========== Cluster Management ==========

  addClusters(sessionId: string, clusters: Cluster[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.clusters.push(...clusters);
    return this.updateSession(sessionId, { clusters: session.clusters });
  }

  getClusters(sessionId: string): Cluster[] {
    return this.sessions.get(sessionId)?.clusters ?? [];
  }

  // ========== Contradiction Management ==========

  addContradictions(sessionId: string, contradictions: Contradiction[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.contradictions.push(...contradictions);
    return this.updateSession(sessionId, { contradictions: session.contradictions });
  }

  getContradictions(sessionId: string): Contradiction[] {
    return this.sessions.get(sessionId)?.contradictions ?? [];
  }

  // ========== Gap Management ==========

  addGaps(sessionId: string, gaps: ResearchGap[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`addGaps failed: session ${sessionId} does not exist`);
    }
    session.gaps.push(...gaps);
    return this.updateSession(sessionId, { gaps: session.gaps });
  }

  updateGap(sessionId: string, gapId: string, updates: Partial<ResearchGap>): ResearchGap | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    const idx = session.gaps.findIndex(g => g.gapId === gapId);
    if (idx === -1) return undefined;
    session.gaps[idx] = { ...session.gaps[idx], ...updates };
    this.updateSession(sessionId, { gaps: session.gaps });
    return session.gaps[idx];
  }

  getGaps(sessionId: string): ResearchGap[] {
    return this.sessions.get(sessionId)?.gaps ?? [];
  }

  getGap(sessionId: string, gapId: string): ResearchGap | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    return session.gaps.find(g => g.gapId === gapId);
  }

  // ========== Review Management ==========

  addReview(sessionId: string, review: ReviewResult): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.reviews.push(review);
    return this.updateSession(sessionId, { reviews: session.reviews });
  }

  getReviews(sessionId: string): ReviewResult[] {
    return this.sessions.get(sessionId)?.reviews ?? [];
  }

  getLatestReview(sessionId: string): ReviewResult | undefined {
    const reviews = this.getReviews(sessionId);
    return reviews[reviews.length - 1];
  }

  // ========== Verdict Management ==========

  addVerdict(sessionId: string, verdict: Verdict): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.verdicts.push(verdict);
    return this.updateSession(sessionId, { verdicts: session.verdicts });
  }

  getVerdicts(sessionId: string): Verdict[] {
    return this.sessions.get(sessionId)?.verdicts ?? [];
  }

  getLatestVerdict(sessionId: string): Verdict | undefined {
    const verdicts = this.getVerdicts(sessionId);
    return verdicts[verdicts.length - 1];
  }

  // ========== Analogy Management ==========

  addAnalogies(sessionId: string, analogies: Analogy[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.analogies.push(...analogies);
    return this.updateSession(sessionId, { analogies: session.analogies });
  }

  getAnalogies(sessionId: string): Analogy[] {
    return this.sessions.get(sessionId)?.analogies ?? [];
  }

  // ========== Citation Management ==========

  addCitations(sessionId: string, citations: Citation[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.citations.push(...citations);
    return this.updateSession(sessionId, { citations: session.citations });
  }

  getCitations(sessionId: string): Citation[] {
    return this.sessions.get(sessionId)?.citations ?? [];
  }

  // ========== Writing Check Management ==========

  addWritingChecks(sessionId: string, checks: WritingCheck[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.writingChecks.push(...checks);
    return this.updateSession(sessionId, { writingChecks: session.writingChecks });
  }

  getWritingChecks(sessionId: string): WritingCheck[] {
    return this.sessions.get(sessionId)?.writingChecks ?? [];
  }

  // ========== Verification Management ==========

  addVerificationChecks(sessionId: string, checks: VerificationCheck[]): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.verificationChecks.push(...checks);
    return this.updateSession(sessionId, { verificationChecks: session.verificationChecks });
  }

  getVerificationChecks(sessionId: string): VerificationCheck[] {
    return this.sessions.get(sessionId)?.verificationChecks ?? [];
  }

  // ========== Knowledge Graph ==========

  addKnowledgeGraphEdges(
    sessionId: string,
    edges: KnowledgeGraphEdge[]
  ): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.knowledgeGraph.push(...edges);
    return this.updateSession(sessionId, { knowledgeGraph: session.knowledgeGraph });
  }

  getKnowledgeGraph(sessionId: string): KnowledgeGraphEdge[] {
    return this.sessions.get(sessionId)?.knowledgeGraph ?? [];
  }

  // ========== Prior Work ==========

  setPriorWork(
    sessionId: string,
    papers: Paper[],
    repos: Repo[],
    priorSessions: PriorSession[]
  ): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.priorWork = { papers, repos, priorSessions };
    return this.updateSession(sessionId, { priorWork: session.priorWork });
  }

  getPriorWork(sessionId: string): Session['priorWork'] {
    return this.sessions.get(sessionId)?.priorWork ?? { papers: [], repos: [], priorSessions: [] };
  }

  // ========== Overleaf ==========

  setOverleafProjectId(sessionId: string, projectId: string): Session | undefined {
    return this.updateSession(sessionId, { overleafProjectId: projectId });
  }

  getOverleafProjectId(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.overleafProjectId;
  }

  // ========== Utility ==========

  /**
   * Force immediate persistence
   */
  async flush(): Promise<void> {
    this.saveToDisk();
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.sessions.clear();
  }
}