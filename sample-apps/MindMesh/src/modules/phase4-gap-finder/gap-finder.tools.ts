import { ToolDecorator as Tool, Widget, ExecutionContext, z, PromptDecorator as Prompt, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { EmbeddingsService } from '../../core/services/embeddings.service.js';
import {
  ResearchGap,
  Claim,
  Cluster,
} from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 4: Gap Finder Tools
 *
 * Assesses novelty and proposes research gaps.
 */
@Injectable({ deps: [MemoryStore, EmbeddingsService] })
export class GapFinderTools {
  constructor(
    private memory: MemoryStore,
    private embeddings: EmbeddingsService
  ) {}

  @Tool({
    name: 'assess_novelty',
    description: 'Assess novelty of a proposed claim against prior art using embedding similarity',
    inputSchema: z.object({
      proposedClaim: z.string().describe('The proposed claim to assess'),
      sessionId: z.string().describe('Session with prior art claims'),
      topK: z.number().int().default(10).describe('Number of similar prior claims to compare'),
    }),
    invocation: {
      invoking: 'Assessing novelty against prior art...',
      invoked: 'Novelty assessment complete'
    },
    examples: {
      request: { proposedClaim: 'Improving federated learning privacy with adaptive differential privacy', sessionId: 'sess_001', topK: 10 },
      response: { proposedClaim: 'Improving federated learning privacy with adaptive differential privacy', noveltyScore: 78, maxSimilarity: 22, topSimilar: [{ claimId: 'c1', paperId: 'p1', similarity: 22, text: 'DP-FedAvg uses fixed privacy budget...' }], assessment: 'High novelty' }
    }
  })
  @Widget('research-pilot-shell')
  async assessNovelty(
    input: { proposedClaim: string; sessionId: string; topK: number },
    ctx: ExecutionContext
  ) {
    const { proposedClaim, sessionId, topK } = input;

    ctx.logger.info('Assessing novelty', { sessionId, claimLength: proposedClaim.length });

    const priorClaims = this.memory.getClaims(sessionId);
    if (priorClaims.length === 0) {
      return {
        proposedClaim,
        noveltyScore: 100,
        similarClaims: [],
        note: 'No prior claims in session. Novelty assumed maximal.',
      };
    }

    // Find similar prior claims using embeddings
    const candidates = priorClaims.map(c => ({
      id: c.claimId,
      text: c.text,
      paperId: c.paperId,
      type: c.type,
    }));

    const similar = await this.embeddings.findSimilar(proposedClaim, candidates, topK);

    // Novelty = 100 - max similarity
    const maxSimilarity = similar[0]?.score || 0;
    const noveltyScore = Math.round((1 - maxSimilarity) * 100);

    return {
      proposedClaim,
      noveltyScore,
      maxSimilarity: Math.round(maxSimilarity * 100),
      topSimilar: similar.slice(0, 5).map(s => ({
        claimId: s.id,
        paperId: candidates.find(c => c.id === s.id)?.paperId,
        similarity: Math.round(s.score * 100),
        text: s.text.slice(0, 200),
      })),
      assessment: noveltyScore > 70 ? 'High novelty' : noveltyScore > 40 ? 'Moderate novelty' : 'Low novelty - similar to prior work',
    };
  }

  @Tool({
    name: 'propose_gap',
    description: 'Propose a specific research gap based on synthesis themes and contradictions',
    inputSchema: z.object({
      topic: z.string().describe('Research topic'),
      sessionId: z.string().describe('Session ID'),
      excludedPaperIds: z.array(z.string()).optional().describe('Papers to exclude from gap basis'),
    }),
    invocation: {
      invoking: 'Proposing research gap from synthesis...',
      invoked: 'Research gap proposed'
    },
    examples: {
      request: { topic: 'federated learning privacy', sessionId: 'sess_001', excludedPaperIds: [] },
      response: { gap: { gapId: 'gap_1', claim: 'Resolving contradictory findings in federated learning privacy: Claim A suggests improve while Claim B suggests worsen', evidence: ['p1', 'p2'], noveltyScore: 78, feasibility: 65, impact: 80, relatedPapers: ['p1', 'p2'], status: 'proposed', proposedAt: '2026-07-20T10:00:00Z' }, noveltyResult: { noveltyScore: 78 }, basis: { topThemes: ['privacy', 'federated'], underexploredThemes: ['adaptive'], contradictionCount: 1 } }
    }
  })
  @Widget('research-pilot-shell')
  async proposeGap(
    input: { topic: string; sessionId: string; excludedPaperIds?: string[] },
    ctx: ExecutionContext
  ) {
    const { topic, sessionId, excludedPaperIds = [] } = input;

    ctx.logger.info('Proposing gap', { topic, sessionId });

    const clusters = this.memory.getClusters(sessionId);
    const contradictions = this.memory.getContradictions(sessionId);
    const claims = this.memory.getClaims(sessionId);

    // Extract themes from clusters
    const allThemes = clusters.flatMap(c => c.keyThemes);
    const themeCounts = new Map<string, number>();
    for (const theme of allThemes) {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    }
    const topThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);

    // Find unresolved contradictions
    const unresolvedContradictions = contradictions.filter(c => c.severity === 'high' || c.severity === 'medium');

    // Find under-explored areas (themes with few papers)
    const themePaperCounts = new Map<string, number>();
    for (const cluster of clusters) {
      for (const theme of cluster.keyThemes) {
        themePaperCounts.set(theme, (themePaperCounts.get(theme) || 0) + cluster.paperIds.length);
      }
    }
    const underexploredThemes = Array.from(themePaperCounts.entries())
      .filter(([, count]) => count < 3)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([theme]) => theme);

    // Generate gap claim (in production, use LLM with prompt)
    const gapClaim = this.generateGapClaim(topic, topThemes, underexploredThemes, unresolvedContradictions);

    // Assess novelty
    const noveltyResult = await this.assessNovelty({ proposedClaim: gapClaim.claim, sessionId, topK: 10 }, ctx);

    // Create gap
    const gap: ResearchGap = {
      gapId: generateId('gap'),
      claim: gapClaim.claim,
      evidence: gapClaim.evidence,
      noveltyScore: noveltyResult.noveltyScore,
      feasibility: gapClaim.feasibility,
      impact: gapClaim.impact,
      relatedPapers: [...new Set(gapClaim.evidence)],
      status: 'proposed',
      proposedAt: new Date().toISOString(),
      reviewedAt: undefined,
      reviewIteration: 0,
    };

    // Ensure session exists
    const session = this.memory.getOrCreateSession(sessionId, topic);

    // Store in session
    this.memory.addGaps(sessionId, [gap]);
    const checkGap = this.memory.getGap(sessionId, gap.gapId);

    return {
      gap,
      noveltyResult,
      basis: {
        topThemes,
        underexploredThemes,
        contradictionCount: unresolvedContradictions.length,
      },
    };
  }

  private generateGapClaim(
    topic: string,
    topThemes: string[],
    underexploredThemes: string[],
    contradictions: any[]
  ): { claim: string; evidence: string[]; feasibility: number; impact: number } {
    // Simple gap generation logic with safety checks
    const primaryTheme = underexploredThemes[0] || topThemes[0] || 'addressing limitations';
    const baseClaim = `Improving ${topic} by ${primaryTheme}`;

    // Check for contradictions first (highest impact)
    if (contradictions.length > 0 && contradictions[0]) {
      return {
        claim: `Resolving contradictory findings in ${topic}: ${contradictions[0].explanation}`,
        evidence: [contradictions[0].claimA?.paperId, contradictions[0].claimB?.paperId].filter(Boolean),
        feasibility: 65,
        impact: 80,
      };
    }

    // Check for underexplored themes
    if (underexploredThemes.length > 0 && underexploredThemes[0]) {
      return {
        claim: `Exploring ${underexploredThemes[0]} in ${topic} - currently under-investigated`,
        evidence: [],
        feasibility: 75,
        impact: 70,
      };
    }

    // Fallback to top theme
    return {
      claim: baseClaim,
      evidence: [],
      feasibility: 70,
      impact: 65,
    };
  }

  @Tool({
    name: 'rank_gaps',
    description: 'Rank proposed gaps by novelty × feasibility × impact',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Ranking proposed gaps by composite score...',
      invoked: 'Gaps ranked'
    },
    examples: {
      request: { sessionId: 'sess_001' },
      response: { sessionId: 'sess_001', rankedGaps: [{ gapId: 'gap_1', claim: 'Resolving contradictory findings in federated learning privacy...', noveltyScore: 78, feasibility: 65, impact: 80, compositeScore: 74, status: 'proposed' }] }
    }
  })
  @Widget('research-pilot-shell')
  async rankGaps(
    input: { sessionId: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;

    const gaps = this.memory.getGaps(sessionId);
    if (gaps.length === 0) {
      return { sessionId, rankedGaps: [] };
    }

    const ranked = gaps
      .map(gap => ({
        ...gap,
        compositeScore: (gap.noveltyScore * 0.4 + gap.feasibility * 0.3 + gap.impact * 0.3),
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore);

    return {
      sessionId,
      rankedGaps: ranked.map(g => ({
        gapId: g.gapId,
        claim: g.claim,
        noveltyScore: g.noveltyScore,
        feasibility: g.feasibility,
        impact: g.impact,
        compositeScore: Math.round(g.compositeScore),
        status: g.status,
      })),
    };
  }
}