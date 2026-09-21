import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { OverleafService } from '../../core/services/overleaf.service.js';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { Session } from '../../core/memory/session.schema.js';
import { statSync } from 'fs';

/**
 * Phase 13: Overleaf Integration Tools (Mode 2)
 *
 * Manages Overleaf projects via Git bridge:
 * - Create project from IEEE template
 * - Push section content
 * - Pull limitations from reviewer objections
 * - Export project as ZIP
 */
@Injectable({ deps: [OverleafService, MemoryStore] })
export class OverleafTools {
  constructor(
    private overleaf: OverleafService,
    private memory: MemoryStore
  ) {}

  @Tool({
    name: 'create_overleaf_project',
    description: 'Create a new Overleaf project from IEEE template',
    inputSchema: z.object({
      title: z.string().describe('Paper title'),
      authors: z.array(z.string()).describe('Author names'),
      template: z.enum(['ieee', 'acm', 'elsevier']).default('ieee'),
      sessionId: z.string().optional().describe('Session ID to load paper metadata from'),
    }),
    invocation: {
      invoking: 'Creating Overleaf project from IEEE template...',
      invoked: 'Overleaf project created successfully'
    },
    examples: {
      request: { title: 'Adaptive Differential Privacy in Federated Learning', authors: ['Jane Smith', 'John Doe'], template: 'ieee', sessionId: 'sess_123' },
      response: { projectId: 'proj_abc123', projectPath: '/workspace/proj_abc123', title: 'Adaptive Differential Privacy in Federated Learning', authors: ['Jane Smith', 'John Doe'], template: 'ieee', sectionsInitialized: 9 }
    }
  })
  @Widget('overleaf-flow-button')
  async createProject(
    input: { title: string; authors: string[]; template?: 'ieee' | 'acm' | 'elsevier'; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { title, authors, template, sessionId } = input;

    ctx.logger.info('Creating Overleaf project', { title, authors, template, sessionId });

    // If sessionId provided, load paper metadata
    let paperTitle = title;
    let paperAuthors = authors;
    let sections: Record<string, string> = {};

    if (sessionId) {
      const session = this.memory.getSession(sessionId);
      if (session) {
        paperTitle = session.topic || title;
        // Use first paper's title if available, otherwise topic
        paperTitle = session.papers[0]?.title || session.topic || title;
        // Use a default or extract authors from the first paper
        paperAuthors = session.papers[0]?.authors?.length > 0 ? session.papers[0].authors : authors;
        sections = this.extractSectionsFromSession(session);
      }
    }

    try {
      const result = await this.overleaf.createProject(paperTitle, paperAuthors, template);

      // Push sections if we have them
      if (Object.keys(sections).length > 0) {
        for (const [section, content] of Object.entries(sections)) {
          await this.overleaf.pushSection(section, content);
        }
        await this.overleaf.commit(`Push initial sections from session ${sessionId}`);
      }

      // Store project info in memory if session provided
      if (sessionId) {
        this.memory.updateSession(sessionId, {
          overleafProjectId: result.projectId,
          overleafProjectPath: result.projectPath,
        } as Partial<Session>);
      }

      return {
        projectId: result.projectId,
        projectPath: result.projectPath,
        title: paperTitle,
        authors: paperAuthors,
        template,
        sectionsInitialized: Object.keys(sections).length,
      };
    } catch (error) {
      ctx.logger.error('Failed to create Overleaf project', { error: String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'push_section_to_overleaf',
    description: 'Push content to a specific section in Overleaf project',
    inputSchema: z.object({
      section: z.enum([
        'abstract',
        'introduction',
        'related-work',
        'methodology',
        'experiments',
        'results',
        'discussion',
        'limitations',
        'conclusion',
      ]).describe('Section name (matches template file names)'),
      content: z.string().describe('LaTeX content for the section'),
      sessionId: z.string().optional().describe('Session ID for tracking'),
    }),
    invocation: {
      invoking: 'Pushing section to Overleaf...',
      invoked: 'Section synced to Overleaf'
    },
    examples: {
      request: { section: 'methodology', content: '% Methodology\n\nOur approach uses...', sessionId: 'sess_123' },
      response: { section: 'methodology', pushed: true, contentLength: 1250 }
    }
  })
  @Widget('overleaf-flow-button')
  async pushSection(
    input: { section: string; content: string; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { section, content, sessionId } = input;

    ctx.logger.info('Pushing section to Overleaf', { section, sessionId });

    await this.overleaf.pushSection(section, content);
    await this.overleaf.commit(`Update ${section} section`);

    if (sessionId) {
      // Just update timestamp to reflect activity
      this.memory.updateSession(sessionId, { updatedAt: new Date().toISOString() } as Partial<Session>);
    }

    return { section, pushed: true, contentLength: content.length };
  }

  @Tool({
    name: 'push_limitations_from_reviewer',
    description: 'Auto-generate and push Limitations section from reviewer objections',
    inputSchema: z.object({
      objections: z.array(z.string()).describe('Reviewer objections from adversarial review'),
      sessionId: z.string().optional().describe('Session ID for tracking'),
    }),
    invocation: {
      invoking: 'Generating Limitations section from reviewer objections...',
      invoked: 'Limitations section pushed to Overleaf'
    },
    examples: {
      request: { objections: ['Dynamic sensitivity estimation may leak privacy budget', 'Assumption of honest majority not always valid'], sessionId: 'sess_123' },
      response: { objectionsCount: 2, pushed: true }
    }
  })
  @Widget('overleaf-flow-button')
  async pushLimitations(
    input: { objections: string[]; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { objections, sessionId } = input;

    ctx.logger.info('Pushing limitations from reviewer objections', { count: objections.length, sessionId });

    await this.overleaf.pushLimitations(objections);
    await this.overleaf.commit('Add limitations from reviewer objections');

    if (sessionId) {
      // Just update timestamp to reflect activity
      this.memory.updateSession(sessionId, { updatedAt: new Date().toISOString() } as Partial<Session>);
    }

    return { objectionsCount: objections.length, pushed: true };
  }

  @Tool({
    name: 'add_bibliography_to_overleaf',
    description: 'Add BibTeX entries to Overleaf project bibliography',
    inputSchema: z.object({
      bibtex: z.string().describe('BibTeX entries to add'),
      sessionId: z.string().optional().describe('Session ID for tracking'),
    }),
    invocation: {
      invoking: 'Adding bibliography entries to Overleaf...',
      invoked: 'Bibliography synced to Overleaf'
    },
    examples: {
      request: { bibtex: '@article{smith2023dp,\n  title={DP-FedAvg},\n  author={Smith, A. and Doe, J.},\n  journal={ICML},\n  year={2023}\n}', sessionId: 'sess_123' },
      response: { entriesAdded: 5, pushed: true }
    }
  })
  @Widget('overleaf-flow-button')
  async addBibliography(
    input: { bibtex: string; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { bibtex, sessionId } = input;

    ctx.logger.info('Adding bibliography to Overleaf', { sessionId });

    await this.overleaf.addBibliography(bibtex);
    await this.overleaf.commit('Add bibliography entries');

    if (sessionId) {
      // Just update timestamp to reflect activity
      this.memory.updateSession(sessionId, { updatedAt: new Date().toISOString() } as Partial<Session>);
    }

    return { entriesAdded: bibtex.split('@').length - 1, pushed: true };
  }

  /*
  // Disabled: archiver uses require() internally which breaks in ESM
  // This is a transitive CJS dependency issue in archiver's dependency tree.
  // For demo purposes, use create_overleaf_project + sync_session_to_overleaf instead.
  @Tool({
    name: 'export_overleaf_zip',
    description: 'Export Overleaf project as ZIP file for download (DISABLED)',
    inputSchema: z.object({
      sessionId: z.string().optional().describe('Session ID to find project'),
    }),
  })
  async exportZip(
    input: { sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;

    ctx.logger.info('Exporting Overleaf project as ZIP', { sessionId });

    try {
      const zipPath = await this.overleaf.exportZip();

      return {
        zipPath,
        fileName: zipPath.split('/').pop() || 'project-export.zip',
        sizeBytes: statSync(zipPath).size,
      };
    } catch (err) {
      ctx.logger.error('[export_overleaf_zip] FULL STACK:', {
        error: err instanceof Error ? err.stack : String(err)
      });
      throw err;
    }
  }
*/

  @Tool({
    name: 'sync_session_to_overleaf',
    description: 'Sync entire session paper to Overleaf (all sections, bibliography, limitations)',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID to sync'),
      createIfMissing: z.boolean().default(true).describe('Create project if not exists'),
    }),
    invocation: {
      invoking: 'Syncing full research session to Overleaf...',
      invoked: 'Session synced to Overleaf successfully'
    },
    examples: {
      request: { sessionId: 'sess_123', createIfMissing: true },
      response: { sessionId: 'sess_123', projectCreated: true, sectionsSynced: 9, hasBibliography: true, hasLimitations: true }
    }
  })
  @Widget('overleaf-flow-button')
  async syncSession(
    input: { sessionId: string; createIfMissing: boolean },
    ctx: ExecutionContext
  ) {
    const { sessionId, createIfMissing } = input;

    ctx.logger.info('Syncing session to Overleaf', { sessionId });

    const session = this.memory.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if project exists
    const projectInfo = this.overleaf.getProjectInfo();
    let projectCreated = false;

    if (!projectInfo.projectId && createIfMissing) {
      // Extract authors from papers
      const authors = session.papers.length > 0
        ? [...new Set(session.papers.flatMap(p => p.authors))]
        : ['Author'];
      const result = await this.overleaf.createProject(
        session.topic || 'Untitled Paper',
        authors,
        'ieee'
      );
      projectCreated = true;
      ctx.logger.info('Created new Overleaf project', { projectId: result.projectId });
    }

    // Generate sections from session data
    const sections = this.extractSectionsFromSession(session);
    const sectionOrder = [
      'abstract', 'introduction', 'related-work', 'methodology',
      'experiments', 'results', 'discussion', 'limitations', 'conclusion'
    ];

    for (const section of sectionOrder) {
      if (sections[section]) {
        await this.overleaf.pushSection(section, sections[section]);
      }
    }

    // Generate bibliography from citations
    if (session.citations.length > 0) {
      const bibtex = session.citations.map(c => c.bibtex).filter(Boolean).join('\n\n');
      if (bibtex) {
        await this.overleaf.addBibliography(bibtex);
      }
    }

    // Sync limitations from review
    const latestReview = session.reviews[session.reviews.length - 1];
    if (latestReview?.objections && latestReview.objections.length > 0) {
      await this.overleaf.pushLimitations(latestReview.objections);
    }

    // Final commit
    await this.overleaf.commit(`Sync session ${sessionId}: ${Object.keys(sections).length} sections, ${session.citations.length > 0 ? 'bibliography' : ''}`);

    return {
      sessionId,
      projectCreated: projectCreated,
      sectionsSynced: Object.keys(sections).length,
      hasBibliography: session.citations.length > 0,
      hasLimitations: !!latestReview?.objections?.length,
    };
  }

  private extractSectionsFromSession(session: Session): Record<string, string> {
    const sections: Record<string, string> = {};

    // Abstract from first paper
    if (session.papers.length > 0 && session.papers[0].abstract) {
      sections.abstract = `% Abstract\n\n${session.papers[0].abstract}\n\n`;
    }

    // Build introduction from first cluster if available
    if (session.clusters.length > 0) {
      const firstCluster = session.clusters[0];
      sections.introduction = `% Introduction\n\nResearch in ${firstCluster.label}: ${firstCluster.summary || 'Introduction to the research area.'}\n\n`;
    }

    // Related work from clusters
    if (session.clusters.length > 0) {
      const relatedWork = session.clusters.map(c => `% ${c.label}\n${c.summary}`).join('\n\n');
      sections['related-work'] = `% Related Work\n\n${relatedWork}\n\n`;
    }

    // Methodology from methodologies
    if (session.methodologies.length > 0) {
      sections.methodology = `% Methodology\n\n${session.methodologies.map(m => `- ${m.name}: ${m.description}`).join('\n')}\n\n`;
    }

    // Limitations from latest review
    const latestReview = session.reviews[session.reviews.length - 1];
    if (latestReview?.objections && latestReview.objections.length > 0) {
      sections.limitations = latestReview.objections.map(o => `- ${o}`).join('\n');
    }

    return sections;
  }
}