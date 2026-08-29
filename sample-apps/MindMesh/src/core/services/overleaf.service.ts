import { Injectable } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';
import * as fs from 'fs';
import * as path from 'path';
import simpleGit from 'simple-git';

/**
 * Overleaf Service
 *
 * Manages Overleaf projects via Git bridge.
 * Clones project repo, allows section-level commits, and pushes changes.
 */
@Injectable()
export class OverleafService {
  private git: ReturnType<typeof simpleGit>;
  private projectsDir: string;
  private gitUrl: string | undefined;
  private gitToken: string | undefined;
  private currentProjectId: string | undefined;
  private currentProjectPath: string | undefined;

  constructor(private config: ConfigService) {
    this.projectsDir = path.join(process.cwd(), '.overleaf-projects');
    this.git = simpleGit();

    const overleafConfig = config.getOverleafConfig();
    this.gitUrl = overleafConfig.gitUrl;
    this.gitToken = overleafConfig.gitToken;
  }

  /**
   * Initialize and create a new Overleaf project from template
   */
  async createProject(
    title: string,
    authors: string[],
    template: 'ieee' | 'acm' | 'elsevier' = 'ieee'
  ): Promise<{ projectId: string; projectPath: string }> {
    if (!this.gitUrl || !this.gitToken) {
      throw new Error('Overleaf Git URL and token not configured');
    }

    // Extract project ID from Git URL
    const projectId = this.extractProjectId(this.gitUrl);
    this.currentProjectId = projectId;
    this.currentProjectPath = path.join(this.projectsDir, projectId);

    // Ensure projects directory exists
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }

    // Clone the project repo - Overleaf requires "git:<token>@" format
    // Handle both URL formats: https://git.overleaf.com/... and https://git@git.overleaf.com/...
    let authUrl: string;
    if (this.gitUrl.includes('git@git.overleaf.com')) {
      // Format: https://git@git.overleaf.com/project-id
      authUrl = this.gitUrl.replace('https://git@', `https://git:${this.gitToken}@`);
    } else {
      // Format: https://git.overleaf.com/project-id
      authUrl = this.gitUrl.replace('https://', `https://git:${this.gitToken}@`);
    }
    await this.git.cwd(this.projectsDir).clone(authUrl, projectId);

    // Initialize with template
    await this.initializeTemplate(title, authors, template);

    return { projectId, projectPath: this.currentProjectPath };
  }

  /**
   * Initialize project with IEEE template structure
   */
  private async initializeTemplate(
    title: string,
    authors: string[],
    template: string
  ): Promise<void> {
    if (!this.currentProjectPath) throw new Error('No project initialized');

    // Create directory structure
    const sectionsDir = path.join(this.currentProjectPath, 'sections');
    if (!fs.existsSync(sectionsDir)) {
      fs.mkdirSync(sectionsDir, { recursive: true });
    }

    // Create main.tex
    const mainTex = this.generateMainTex(title, authors, template);
    fs.writeFileSync(path.join(this.currentProjectPath, 'main.tex'), mainTex);

    // Create section files
    const sections = [
      'abstract', 'introduction', 'related-work', 'methodology',
      'experiments', 'results', 'discussion', 'limitations', 'conclusion'
    ];

    for (const section of sections) {
      const sectionPath = path.join(sectionsDir, `${section}.tex`);
      if (!fs.existsSync(sectionPath)) {
        fs.writeFileSync(sectionPath, `% ${section}\n\n`);
      }
    }

    // Create references.bib
    fs.writeFileSync(path.join(this.currentProjectPath, 'references.bib'), '% Bibliography\n');

    // Commit initial structure
    await this.commit('Initialize project with template');
  }

  /**
   * Generate main.tex template
   */
  private generateMainTex(title: string, authors: string[], template: string): string {
    const authorLines = authors.map(a => `\\author{${a}}`).join('\n');

    if (template === 'ieee') {
      return `\\documentclass[conference]{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}

\\title{${title}}

${authorLines}

\\begin{document}

\\maketitle

\\input{sections/abstract}
\\input{sections/introduction}
\\input{sections/related-work}
\\input{sections/methodology}
\\input{sections/experiments}
\\input{sections/results}
\\input{sections/discussion}
\\input{sections/limitations}
\\input{sections/conclusion}

\\bibliographystyle{IEEEtran}
\\bibliography{references}

\\end{document}
`;
    }

    // Generic fallback
    return `\\documentclass{article}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}

\\title{${title}}

${authorLines}

\\begin{document}

\\maketitle

\\input{sections/abstract}
\\input{sections/introduction}
\\input{sections/related-work}
\\input{sections/methodology}
\\input{sections/experiments}
\\input{sections/results}
\\input{sections/discussion}
\\input{sections/limitations}
\\input{sections/conclusion}

\\bibliography{references}

\\end{document}
`;
  }

  /**
   * Push content to a specific section
   */
  async pushSection(section: string, content: string): Promise<void> {
    if (!this.currentProjectPath) {
      throw new Error('No project initialized. Call createProject first.');
    }

    const sectionPath = path.join(this.currentProjectPath, 'sections', `${section}.tex`);
    fs.writeFileSync(sectionPath, content);

    await this.commit(`Update ${section} section`);
  }

  /**
   * Pull limitations from reviewer objections
   */
  async pushLimitations(objections: string[]): Promise<void> {
    const content = objections.map(o => `- ${o}`).join('\n');
    await this.pushSection('limitations', `% Limitations (auto-generated from reviewer objections)\n\n${content}`);
  }

  /**
   * Add bibliography entries
   */
  async addBibliography(bibtex: string): Promise<void> {
    if (!this.currentProjectPath) throw new Error('No project initialized');

    const bibPath = path.join(this.currentProjectPath, 'references.bib');
    const existing = fs.existsSync(bibPath) ? fs.readFileSync(bibPath, 'utf-8') : '';
    fs.writeFileSync(bibPath, existing + '\n' + bibtex);

    await this.commit('Add bibliography entries');
  }

  /**
   * Commit and push changes to Overleaf
   */
  async commit(message: string): Promise<void> {
    if (!this.currentProjectPath) throw new Error('No project initialized');

    await this.git.cwd(this.currentProjectPath).add('.');
    await this.git.cwd(this.currentProjectPath).commit(message);

    // Push to Overleaf Git remote
    await this.git.cwd(this.currentProjectPath).push('origin', 'main');
  }

  /**
   * Export project as ZIP (for download)
   */
  async exportZip(): Promise<string> {
    if (!this.currentProjectPath) throw new Error('No project initialized');

    // Dynamic import to avoid ESM/CJS interop issues with archiver
    const { default: archiver } = await import('archiver');

    const output = path.join(this.projectsDir, `${this.currentProjectId}-export.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const outputStream = fs.createWriteStream(output);

    return new Promise((resolve, reject) => {
      outputStream.on('close', () => resolve(output));
      archive.on('error', reject);
      archive.pipe(outputStream);
      archive.directory(this.currentProjectPath!, '');
      archive.finalize();
    });
  }

  /**
   * Get current project info
   */
  getProjectInfo(): { projectId?: string; projectPath?: string } {
    return {
      projectId: this.currentProjectId,
      projectPath: this.currentProjectPath,
    };
  }

  /**
   * Extract project ID from Overleaf Git URL
   */
  private extractProjectId(gitUrl: string): string {
    // Overleaf Git URLs look like: git@git.overleaf.com:project-id.git or https://git.overleaf.com/project-id.git
    // or https://git.overleaf.com/project-id (without .git)
    const match = gitUrl.match(/[:/]([^/]+?)(?:\.git)?$/);
    return match ? match[1] : 'project';
  }
}

// Need to import ConfigService type for reference