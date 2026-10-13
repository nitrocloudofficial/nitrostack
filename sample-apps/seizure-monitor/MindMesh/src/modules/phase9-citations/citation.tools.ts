import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import {
  Paper,
  Citation,
} from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 9: Citation Management Tools
 *
 * Generate citations in IEEE, APA, MLA formats and export BibTeX.
 */
@Injectable({ deps: [MemoryStore] })
export class CitationTools {
  constructor(private memory: MemoryStore) {}

  @Tool({
    name: 'generate_citation',
    description: 'Generate formatted citation for a paper in IEEE, APA, or MLA style',
    inputSchema: z.object({
      paperId: z.string().describe('Paper ID'),
      style: z.enum(['IEEE', 'APA', 'MLA']).describe('Citation style'),
      sessionId: z.string().optional().describe('Session ID to get paper from'),
    }),
    invocation: {
      invoking: 'Generating citation...',
      invoked: 'Citation generated'
    },
    examples: {
      request: { paperId: 'p123', style: 'IEEE', sessionId: 'sess_001' },
      response: { paperId: 'p123', style: 'IEEE', formatted: '[Smith] Smith, J. and Doe, J., "DP-FedAvg: Differentially Private Federated Learning," ICML, 2023.', bibtex: '@article{smith2023dp-fedavg,\n  title = {DP-FedAvg: Differentially Private Federated Learning},\n  author = {Smith, J. and Doe, J.},\n  journal = {ICML},\n  year = {2023}\n}' }
    }
  })
  @Widget('research-pilot-shell')
  async generateCitation(
    input: { paperId: string; style: 'IEEE' | 'APA' | 'MLA'; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { paperId, style, sessionId } = input;

    ctx.logger.info('Generating citation', { paperId, style });

    let paper: Paper | undefined;
    if (sessionId) {
      paper = this.memory.getPaper(sessionId, paperId);
    }

    if (!paper) {
      throw new Error(`Paper ${paperId} not found in session ${sessionId || 'any'}`);
    }

    const formatted = this.formatCitation(paper, style);
    const bibtex = this.generateBibTeX(paper);

    const citation: Citation = {
      citationId: generateId('citation'),
      paperId,
      style,
      formatted,
      bibtex,
      createdAt: new Date().toISOString(),
    };

    if (sessionId) {
      this.memory.addCitations(sessionId, [citation]);
    }

    return {
      paperId,
      style,
      formatted,
      bibtex,
    };
  }

  private formatCitation(paper: Paper, style: 'IEEE' | 'APA' | 'MLA'): string {
    const authors = paper.authors;
    const authorStr = this.formatAuthors(authors, style);
    const title = paper.title;
    const venue = paper.venue || 'Unknown venue';
    const year = paper.year || 'n.d.';

    switch (style) {
      case 'IEEE':
        return `[${this.getShortAuthor(authors)}] ${authorStr}, "${title}," ${venue}, ${year}.`;
      case 'APA':
        return `${authorStr} (${year}). ${title}. ${venue}.`;
      case 'MLA':
        return `${authorStr}. "${title}." ${venue}, ${year}.`;
      default:
        return `${authorStr}. ${title}. ${venue}, ${year}.`;
    }
  }

  private formatAuthors(authors: string[], style: Citation['style']): string {
    if (authors.length === 0) return 'Unknown author';
    if (authors.length === 1) return authors[0];

    if (style === 'IEEE') {
      if (authors.length <= 3) {
        return authors.slice(0, -1).join(', ') + ' and ' + authors[authors.length - 1];
      }
      return authors[0] + ' et al.';
    }

    if (style === 'APA') {
      if (authors.length <= 20) {
        return authors.slice(0, -1).join(', ') + ', & ' + authors[authors.length - 1];
      }
      return authors.slice(0, 19).join(', ') + ', ..., ' + authors[authors.length - 1];
    }

    // MLA
    if (authors.length <= 2) {
      return authors.join(' and ');
    }
    return authors[0] + ' et al.';
  }

  private getShortAuthor(authors: string[]): string {
    if (authors.length === 0) return 'Anonymous';
    if (authors.length === 1) return authors[0].split(' ').pop() || '';
    return authors[0].split(' ').pop() + ' et al.';
  }

  private generateBibTeX(paper: Paper): string {
    const key = `${paper.authors[0]?.split(' ').pop() || 'unknown'}${paper.year || 'nodate'}`
      .replace(/[^a-zA-Z0-9]/g, '');

    const authors = paper.authors.map(a => a.replace(/,/g, '')).join(' and ');

    return `@article{${key},
  title = {${paper.title}},
  author = {${authors}},
  journal = {${paper.venue || 'Unknown'}},
  year = {${paper.year || 'n.d.'}},
  doi = {${paper.doi || ''}},
  url = {${paper.url || ''}},
}`;
  }

  @Tool({
    name: 'export_bibtex',
    description: 'Export all citations in session as BibTeX',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
      style: z.enum(['IEEE', 'APA', 'MLA']).optional().describe('Style to use for tags (default: IEEE)'),
    }),
    invocation: {
      invoking: 'Exporting BibTeX bibliography...',
      invoked: 'BibTeX exported'
    },
    examples: {
      request: { sessionId: 'sess_001', style: 'IEEE' },
      response: { sessionId: 'sess_001', bibtex: '@article{smith2023dp-fedavg,\n  title = {DP-FedAvg: Differentially Private Federated Learning},\n  author = {Smith, J. and Doe, J.},\n  journal = {ICML},\n  year = {2023}\n}\n\n@article{lee2022byzantine-robust,\n  title = {Byzantine-Robust FL with DP},\n  author = {Lee, C.},\n  journal = {IEEE S&P},\n  year = {2022}\n}', count: 2 }
    }
  })
  @Widget('research-pilot-shell')
  async exportBibTeX(
    input: { sessionId: string; style?: 'IEEE' | 'APA' | 'MLA' },
    ctx: ExecutionContext
  ) {
    const { sessionId, style = 'IEEE' } = input;

    const citations = this.memory.getCitations(sessionId);

    if (citations.length === 0) {
      // Generate from papers
      const papers = this.memory.getPapers(sessionId);
      const entries = papers.map(p => this.generateBibTeX(p)).join('\n\n');
      return { sessionId, bibtex: entries, count: papers.length };
    }

    const entries = citations.map(c => c.bibtex).join('\n\n');
    return { sessionId, bibtex: entries, count: citations.length };
  }

  @Tool({
    name: 'manage_bibliography',
    description: 'Add or remove papers from session bibliography',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
      paperIds: z.array(z.string()).optional().describe('Paper IDs to add/remove'),
    }),
    invocation: {
      invoking: 'Managing bibliography...',
      invoked: 'Bibliography updated'
    },
    examples: {
      request: { sessionId: 'sess_001', action: 'add', paperIds: ['p1', 'p2'] },
      response: { sessionId: 'sess_001', action: 'add', affected: 2, citations: [{ paperId: 'p1', formatted: '[Smith] Smith, J. and Doe, J., "DP-FedAvg...", ICML, 2023.' }, { paperId: 'p2', formatted: '[Lee] Lee, C., "Byzantine-Robust FL...", IEEE S&P, 2022.' }] }
    }
  })
  @Widget('research-pilot-shell')
  async manageBibliography(
    input: { sessionId: string; action: 'add' | 'remove' | 'list'; paperIds?: string[] },
    ctx: ExecutionContext
  ) {
    const { sessionId, action, paperIds } = input;

    if (action === 'list') {
      const papers = this.memory.getPapers(sessionId);
      return {
        sessionId,
        papers: papers.map(p => ({ paperId: p.paperId, title: p.title, year: p.year })),
        count: papers.length,
      };
    }

    if (!paperIds || paperIds.length === 0) {
      throw new Error('paperIds required for add/remove');
    }

    const papers = this.memory.getPapers(sessionId);
    const selected = papers.filter(p => paperIds.includes(p.paperId));
    const citations = selected.map(p => ({
      citationId: generateId('citation'),
      paperId: p.paperId,
      style: 'IEEE' as const,
      formatted: this.formatCitation(p, 'IEEE'),
      bibtex: this.generateBibTeX(p),
      createdAt: new Date().toISOString(),
    }));

    if (action === 'add') {
      this.memory.addCitations(sessionId, citations);
    } else {
      // For remove, we'd need to track which citations to remove
      // Simplified: just return current state
    }

    return {
      sessionId,
      action,
      affected: selected.length,
      citations: citations.map(c => ({ paperId: c.paperId, formatted: c.formatted })),
    };
  }
}