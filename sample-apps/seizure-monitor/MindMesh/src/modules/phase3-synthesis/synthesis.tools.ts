import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { EmbeddingsService } from '../../core/services/embeddings.service.js';
import {
  Paper,
  Claim,
  Cluster,
  Contradiction,
} from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 3: Synthesis & Clustering Tools
 */
@Injectable({ deps: [MemoryStore, EmbeddingsService] })
export class SynthesisTools {
  constructor(
    private memory: MemoryStore,
    private embeddings: EmbeddingsService
  ) {}

  @Tool({
    name: 'cluster_papers',
    description: 'Cluster papers by embedding similarity',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
      paperIds: z.array(z.string()).optional().describe('Paper IDs to cluster (default: all in session)'),
      numClusters: z.number().int().optional().describe('Number of clusters (default: auto)'),
      method: z.enum(['kmeans', 'hierarchical']).default('kmeans').describe('Clustering method'),
    }),
    invocation: {
      invoking: 'Clustering papers by embedding similarity...',
      invoked: 'Paper clustering complete'
    },
    examples: {
      request: { sessionId: 'sess_001', numClusters: 4, method: 'kmeans' },
      response: { sessionId: 'sess_001', paperCount: 12, clusterCount: 4, clusters: [{ clusterId: 'cl1', label: 'Cluster 1', paperCount: 3, keyThemes: ['attention', 'transformer', 'efficiency'], summary: 'Cluster "Cluster 1" contains 3 papers with 15 claims (finding, method). Key themes: attention, transformer, efficiency.' }] }
    }
  })
  @Widget('research-pilot-shell')
  async clusterPapers(
    input: { sessionId: string; paperIds?: string[]; numClusters?: number; method?: 'kmeans' | 'hierarchical' },
    ctx: ExecutionContext
  ) {
    const { sessionId, paperIds, numClusters, method = 'kmeans' } = input;

    ctx.logger.info('Clustering papers', { sessionId, paperCount: paperIds?.length, numClusters });

    // Get papers to cluster
    const papers = this.memory.getPapers(sessionId);
    const targetPapers = paperIds
      ? papers.filter(p => paperIds.includes(p.paperId))
      : papers;

    if (targetPapers.length < 2) {
      throw new Error('Need at least 2 papers to cluster');
    }

    // Use abstracts for embedding
    const items = targetPapers.map(p => ({
      id: p.paperId,
      text: p.abstract || p.title,
    }));

    // Embed and cluster
    const clustered = await this.embeddings.cluster(items, numClusters || Math.min(5, targetPapers.length));

    // Build clusters
    const clusters: Cluster[] = [];
    const clusterMap = new Map<number, Cluster>();

    for (const item of clustered) {
      const paper = targetPapers.find(p => p.paperId === item.id);
      if (!paper) continue;

      let cluster = clusterMap.get(item.cluster);
      if (!cluster) {
        cluster = {
          clusterId: generateId('cluster'),
          label: `Cluster ${item.cluster + 1}`,
          paperIds: [],
          centroid: undefined,
          summary: undefined,
          keyThemes: [],
          createdAt: new Date().toISOString(),
        };
        clusterMap.set(item.cluster, cluster);
        clusters.push(cluster);
      }
      cluster.paperIds.push(paper.paperId);
    }

    // Generate themes for each cluster
    for (const cluster of clusters) {
      const clusterClaims = this.memory.getClaims(sessionId)
        .filter(c => cluster.paperIds.includes(c.paperId));

      // Extract common terms as themes
      const themes = this.extractThemes(clusterClaims);
      cluster.keyThemes = themes.slice(0, 5);
      cluster.summary = this.generateClusterSummary(cluster, clusterClaims);
    }

    // Store clusters
    this.memory.addClusters(sessionId, clusters);

    return {
      sessionId,
      paperCount: targetPapers.length,
      clusterCount: clusters.length,
      clusters: clusters.map(c => ({
        clusterId: c.clusterId,
        label: c.label,
        paperCount: c.paperIds.length,
        keyThemes: c.keyThemes,
        summary: c.summary,
      })),
    };
  }

  private extractThemes(claims: Claim[]): string[] {
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'are', 'was', 'were', 'have', 'has', 'had', 'our', 'we', 'can', 'may', 'will', 'from', 'they', 'their']);

    for (const claim of claims) {
      const words = claim.text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      for (const word of words) {
        if (!stopWords.has(word)) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      }
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateClusterSummary(cluster: Cluster, claims: Claim[]): string {
    const types = [...new Set(claims.map(c => c.type))];
    const count = claims.length;
    const papers = cluster.paperIds.length;
    return `Cluster "${cluster.label}" contains ${papers} papers with ${count} claims (${types.join(', ')}). Key themes: ${cluster.keyThemes.join(', ')}.`;
  }

  @Tool({
    name: 'find_contradictory_claims',
    description: 'Find contradictory claims across papers using LLM (stub with heuristic)',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
      claimIds: z.array(z.string()).optional().describe('Specific claims to check (default: all)'),
    }),
    invocation: {
      invoking: 'Finding contradictory claims across papers...',
      invoked: 'Contradiction analysis complete'
    },
    examples: {
      request: { sessionId: 'sess_001', claimIds: ['c1', 'c2'] },
      response: { sessionId: 'sess_001', checked: 12, found: 2, contradictions: [{ contradictionId: 'c1', claimA: { claimId: 'c1', text: 'Method improves accuracy', paperId: 'p1' }, claimB: { claimId: 'c2', text: 'Method decreases accuracy', paperId: 'p2' }, explanation: 'Claim A suggests improve while Claim B suggests worsen', severity: 'medium' }] }
    }
  })
  @Widget('research-pilot-shell')
  async findContradictoryClaims(
    input: { sessionId: string; claimIds?: string[] },
    ctx: ExecutionContext
  ) {
    const { sessionId, claimIds } = input;

    ctx.logger.info('Finding contradictory claims', { sessionId, claimCount: claimIds?.length });

    const claims = claimIds
      ? this.memory.getClaims(sessionId).filter(c => claimIds.includes(c.claimId))
      : this.memory.getClaims(sessionId);

    const contradictions: Contradiction[] = [];

    // Pairwise comparison (heuristic - in production use LLM)
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const contradiction = this.checkContradiction(claims[i], claims[j]);
        if (contradiction) {
          contradictions.push(contradiction);
        }
      }
    }

    // Store contradictions
    this.memory.addContradictions(sessionId, contradictions);

    return {
      sessionId,
      checked: claims.length,
      found: contradictions.length,
      contradictions: contradictions.map(c => ({
        contradictionId: c.contradictionId,
        claimA: { claimId: c.claimA.claimId, text: c.claimA.text, paperId: c.claimA.paperId },
        claimB: { claimId: c.claimB.claimId, text: c.claimB.text, paperId: c.claimB.paperId },
        explanation: c.explanation,
        severity: c.severity,
      })),
    };
  }

  private checkContradiction(claimA: Claim, claimB: Claim): Contradiction | null {
    // Simple heuristic: same type, different papers, conflicting keywords
    if (claimA.paperId === claimB.paperId) return null;
    if (claimA.type !== claimB.type) return null;

    const textA = claimA.text.toLowerCase();
    const textB = claimB.text.toLowerCase();

    // Check for opposing terms
    const opposites = [
      ['improve', 'worsen'],
      ['increase', 'decrease'],
      ['outperform', 'underperform'],
      ['better', 'worse'],
      ['superior', 'inferior'],
      ['effective', 'ineffective'],
      ['work', 'fail'],
      ['succeed', 'fail'],
    ];

    for (const [pos, neg] of opposites) {
      const aHasPos = textA.includes(pos);
      const aHasNeg = textA.includes(neg);
      const bHasPos = textB.includes(pos);
      const bHasNeg = textB.includes(neg);

      if ((aHasPos && bHasNeg) || (aHasNeg && bHasPos)) {
        return {
          contradictionId: generateId('contradiction'),
          claimA,
          claimB,
          explanation: `Claim A suggests ${pos} while Claim B suggests ${neg} (or vice versa)`,
          severity: 'medium' as const,
          detectedAt: new Date().toISOString(),
        };
      }
    }

    return null;
  }

  @Tool({
    name: 'synthesize_clusters',
    description: 'Generate narrative synthesis for each cluster',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Generating narrative synthesis for clusters...',
      invoked: 'Cluster synthesis complete'
    },
    examples: {
      request: { sessionId: 'sess_001' },
      response: { sessionId: 'sess_001', clusterCount: 3, syntheses: [{ clusterId: 'cl1', label: 'Cluster 1', paperCount: 4, claimCount: 18, themes: ['attention', 'efficiency'], summary: '...', claimTypes: ['finding', 'method'], keyFindings: ['FlashAttention is 2-4x faster'], limitations: ['Limited to sparse attention'] }], overallNarrative: 'Analysis of 12 papers across 3 clusters yielded 42 claims...' }
    }
  })
  @Widget('research-pilot-shell')
  async synthesizeClusters(
    input: { sessionId: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;

    const clusters = this.memory.getClusters(sessionId);
    const claims = this.memory.getClaims(sessionId);

    const syntheses = clusters.map(cluster => {
      const clusterClaims = claims.filter(c => cluster.paperIds.includes(c.paperId));

      return {
        clusterId: cluster.clusterId,
        label: cluster.label,
        paperCount: cluster.paperIds.length,
        claimCount: clusterClaims.length,
        themes: cluster.keyThemes,
        summary: cluster.summary,
        claimTypes: [...new Set(clusterClaims.map(c => c.type))],
        keyFindings: clusterClaims
          .filter(c => c.type === 'finding' || c.type === 'result')
          .slice(0, 5)
          .map(c => c.text),
        limitations: clusterClaims
          .filter(c => c.type === 'limitation')
          .slice(0, 3)
          .map(c => c.text),
      };
    });

    return {
      sessionId,
      clusterCount: clusters.length,
      syntheses,
      overallNarrative: this.generateOverallNarrative(syntheses),
    };
  }

  private generateOverallNarrative(syntheses: any[]): string {
    const totalPapers = syntheses.reduce((sum, s) => sum + s.paperCount, 0);
    const totalClaims = syntheses.reduce((sum, s) => sum + s.claimCount, 0);

    return `Analysis of ${totalPapers} papers across ${syntheses.length} clusters yielded ${totalClaims} claims. ` +
      `Key research themes include: ${syntheses.flatMap(s => s.themes).slice(0, 5).join(', ')}. ` +
      `Identified ${syntheses.reduce((sum, s) => sum + s.keyFindings.length, 0)} key findings and ${syntheses.reduce((sum, s) => sum + s.limitations.length, 0)} limitations.`;
  }
}