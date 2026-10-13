import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { EmbeddingsService } from '../../core/services/embeddings.service.js';
import { SemanticScholarService } from '../../core/services/semantic-scholar.service.js';
import {
  Analogy,
  Paper,
} from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 7: Cross-Domain Analogist (Stretch)
 *
 * Finds analogies from other domains that could apply to the research topic.
 */
@Injectable({ deps: [MemoryStore, EmbeddingsService, SemanticScholarService] })
export class AnalogyTools {
  constructor(
    private memory: MemoryStore,
    private embeddings: EmbeddingsService,
    private semanticScholar: SemanticScholarService
  ) {}

  @Tool({
    name: 'find_cross_domain_analogs',
    description: 'Find cross-domain analogies for a technique or concept',
    inputSchema: z.object({
      technique: z.string().describe('Technique or concept to find analogs for'),
      sourceDomain: z.string().describe('Source domain (e.g., "computer vision", "NLP")'),
      targetDomain: z.string().optional().describe('Target domain to search in'),
      excludeDomains: z.array(z.string()).optional().describe('Domains to exclude'),
      limit: z.number().int().default(10).describe('Maximum results'),
      sessionId: z.string().optional().describe('Session ID to store results'),
    }),
    invocation: {
      invoking: 'Finding cross-domain analogies...',
      invoked: 'Cross-domain analogy search complete'
    },
    examples: {
      request: { technique: 'self-attention', sourceDomain: 'NLP', targetDomain: 'computer vision', excludeDomains: ['NLP'], limit: 5 },
      response: { technique: 'self-attention', sourceDomain: 'NLP', targetDomain: 'computer vision', analogiesFound: 2, analogies: [{ analogyId: 'a1', targetDomain: 'Computer Vision', targetApplication: 'Vision Transformer (ViT)', similarityScore: 85, transferability: 'high' }] }
    }
  })
  @Widget('research-pilot-shell')
  async findCrossDomainAnalogs(
    input: {
      technique: string;
      sourceDomain: string;
      targetDomain?: string;
      excludeDomains?: string[];
      limit?: number;
      sessionId?: string;
    },
    ctx: ExecutionContext
  ) {
    const { technique, sourceDomain, targetDomain, excludeDomains = [], limit, sessionId } = input;

    ctx.logger.info('Finding cross-domain analogs', {
      technique,
      sourceDomain,
      targetDomain,
      excludeDomains,
    });

    // Build search queries for analogs
    const queries = this.buildAnalogQueries(technique, targetDomain, excludeDomains);

    const allPapers: Paper[] = [];
    for (const query of queries) {
      try {
        const papers = await this.semanticScholar.searchPapers(query, { limit: 5 });
        allPapers.push(...papers);
      } catch (error) {
        ctx.logger.warn('Analog search failed', { query, error: String(error) });
      }
    }

    // Deduplicate
    const uniquePapers = this.deduplicatePapers(allPapers);

    // Score for analog relevance using embeddings
    const techniqueEmbedding = await this.embeddings.embed(technique);

    const scored = await Promise.all(
      uniquePapers.map(async (paper) => {
        const paperText = `${paper.title} ${paper.abstract || ''}`;
        const paperEmbedding = await this.embeddings.embed(paperText);
        const similarity = this.embeddings.cosineSimilarity(techniqueEmbedding, paperEmbedding);

        return {
          paper,
          similarity,
          domain: this.inferDomain(paper),
        };
      })
    );

    // Filter out same domain and low similarity
    const analogs = scored
      .filter(s => s.similarity > 0.4 && !this.isSameDomain(s.domain, sourceDomain))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Create analogy objects
    const analogies: Analogy[] = analogs.map(a => ({
      analogyId: generateId('analogy'),
      sourceDomain,
      targetDomain: a.domain,
      sourceTechnique: technique,
      targetApplication: `${a.paper.title} (${a.domain})`,
      similarityScore: Math.round(a.similarity * 100),
      transferability: this.assessTransferability(a.similarity),
      verificationNotes: `Found via "${queries[0]}" search. Similarity: ${Math.round(a.similarity * 100)}%`,
      discoveredAt: new Date().toISOString(),
    }));

    if (sessionId) {
      this.memory.addAnalogies(sessionId, analogies);
    }

    return {
      technique,
      sourceDomain,
      targetDomain,
      analogiesFound: analogies.length,
      analogies: analogies.map(a => ({
        analogyId: a.analogyId,
        targetDomain: a.targetDomain,
        targetApplication: a.targetApplication,
        similarityScore: a.similarityScore,
        transferability: a.transferability,
      })),
    };
  }

  private buildAnalogQueries(technique: string, targetDomain?: string, excludeDomains: string[] = []): string[] {
    const baseQueries = [
      `${technique} applied to ${targetDomain || 'other fields'}`,
      `${technique} technique in *`,
      `inspired by ${technique}`,
      `${technique} adapted for`,
      `cross-domain ${technique}`,
    ];

    const excludeTerms = excludeDomains.join(' OR ');
    if (excludeTerms) {
      return baseQueries.map(q => `${q} -(${excludeTerms})`);
    }

    return baseQueries;
  }

  private deduplicatePapers(papers: Paper[]): Paper[] {
    const seen = new Set<string>();
    return papers.filter(p => {
      if (seen.has(p.paperId)) return false;
      seen.add(p.paperId);
      return true;
    });
  }

  private inferDomain(paper: Paper): string {
    const venue = (paper.venue || '').toLowerCase();
    const fields = paper.fieldsOfStudy || [];

    if (venue.includes('cvpr') || venue.includes('iccv') || fields.includes('Computer Vision')) return 'Computer Vision';
    if (venue.includes('nips') || venue.includes('icml') || venue.includes('iclr') || fields.includes('Machine Learning')) return 'Machine Learning';
    if (venue.includes('acl') || venue.includes('emnlp') || fields.includes('NLP')) return 'NLP';
    if (venue.includes('siggraph') || fields.includes('Graphics')) return 'Graphics';
    if (venue.includes('robotics') || fields.includes('Robotics')) return 'Robotics';
    if (venue.includes('bio') || fields.includes('Biology')) return 'Biology';
    if (venue.includes('physics') || fields.includes('Physics')) return 'Physics';

    return fields[0] || 'Unknown';
  }

  private isSameDomain(domain1: string, domain2: string): boolean {
    const norm1 = domain1.toLowerCase().replace(/\s+/g, '');
    const norm2 = domain2.toLowerCase().replace(/\s+/g, '');
    return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
  }

  private assessTransferability(similarity: number): Analogy['transferability'] {
    if (similarity > 0.7) return 'high';
    if (similarity > 0.5) return 'medium';
    return 'low';
  }

  @Tool({
    name: 'verify_technique_match',
    description: 'Verify if a technique from one domain transfers to another (LLM stub)',
    inputSchema: z.object({
      analogyId: z.string().describe('Analogy ID to verify'),
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Verifying technique transferability...',
      invoked: 'Technique match verification complete'
    },
    examples: {
      request: { analogyId: 'a1', sessionId: 'sess_001' },
      response: { analogyId: 'a1', verified: true, transferability: 'high', confidence: 80, notes: 'Verification requires LLM analysis of technique applicability.' }
    }
  })
  @Widget('research-pilot-shell')
  async verifyTechniqueMatch(
    input: { analogyId: string; sessionId: string },
    ctx: ExecutionContext
  ) {
    const { analogyId, sessionId } = input;

    const analogies = this.memory.getAnalogies(sessionId);
    const analogy = analogies.find(a => a.analogyId === analogyId);

    if (!analogy) {
      throw new Error(`Analogy ${analogyId} not found`);
    }

    // In production, this would use an LLM to verify the match
    return {
      analogyId,
      verified: analogy.transferability === 'high',
      transferability: analogy.transferability,
      confidence: analogy.transferability === 'high' ? 80 : 60,
      notes: 'Verification requires LLM analysis of technique applicability.',
    };
  }
}