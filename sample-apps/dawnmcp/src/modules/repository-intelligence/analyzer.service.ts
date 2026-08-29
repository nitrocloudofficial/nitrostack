import { Injectable } from '@nitrostack/core';
import { ScannerService } from './scanner.service.js';
import type { ScanResult, ScannedFile } from './scanner.service.js';
import { ParserService } from './parser.service.js';
import type { ParsedFile } from './parser.service.js';
import { LlmService } from '../../shared/services/llm.service.js';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────

/** Detected dependency from a package manifest. */
export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer';
}

/** Relationship between two files. */
export interface FileRelationship {
  from: string;
  to: string;
  type: 'imports' | 'depends_on';
}

/** Complete analysis result for a repository. */
export interface AnalysisResult {
  /** Scan results including file listing and stats. */
  scan: ScanResult;
  /** Detected framework / architecture pattern. */
  architecture: {
    framework: string;
    patterns: string[];
    entryPoints: string[];
  };
  /** Dependencies from package manifests. */
  dependencies: Dependency[];
  /** Parsed structures of important source files. */
  parsedFiles: ParsedFile[];
  /** File-to-file import relationships. */
  relationships: FileRelationship[];
  /** LLM-generated project summary (null if LLM unavailable). */
  summary: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────

/**
 * Analyzer Service
 *
 * Orchestrates the full repository analysis pipeline:
 * scan → parse → detect architecture → extract dependencies → summarize.
 */
@Injectable()
export class AnalyzerService {
  constructor(
    private readonly scanner: ScannerService,
    private readonly parser: ParserService,
    private readonly llm: LlmService,
  ) {}

  /**
   * Run a complete analysis on a local repository.
   */
  async analyzeRepository(repoPath: string): Promise<AnalysisResult> {
    // Step 1: Scan all files
    const scan = await this.scanner.scanRepository(repoPath);

    // Step 2: Detect architecture
    const architecture = this.detectArchitecture(scan);

    // Step 3: Extract dependencies
    const dependencies = this.extractDependencies(repoPath);

    // Step 4: Parse important source files
    const importantFiles = this.scanner.identifyImportantFiles(scan);
    const sourceFiles = scan.files
      .filter((f) => f.fileType === 'source')
      .slice(0, 50); // Cap to avoid slow parsing

    const filesToParse = [...new Set([...importantFiles, ...sourceFiles])].slice(0, 60);
    const parsedFiles: ParsedFile[] = [];

    for (const file of filesToParse) {
      try {
        const parsed = await this.parser.parseFile(file.absolutePath, file.language);
        parsedFiles.push(parsed);
      } catch {
        // Skip files that fail to parse
      }
    }

    // Step 5: Build import relationships
    const relationships = this.buildRelationships(parsedFiles, repoPath);

    // Step 6: Generate LLM summary
    let summary: string | null = null;
    try {
      summary = await this.generateProjectSummary(scan, architecture, dependencies);
    } catch {
      // LLM unavailable — summary remains null
    }

    return { scan, architecture, dependencies, parsedFiles, relationships, summary };
  }

  // ── Architecture Detection ─────────────────────────────────────────

  /**
   * Detect the framework and architectural patterns used in the project.
   */
  detectArchitecture(scan: ScanResult): AnalysisResult['architecture'] {
    const fileNames = new Set(scan.files.map((f) => f.relativePath.toLowerCase()));
    const patterns: string[] = [];
    let framework = 'Unknown';
    const entryPoints: string[] = [];

    // ── Framework detection ──
    if (fileNames.has('package.json')) {
      const pkgPath = scan.files.find((f) => f.relativePath === 'package.json');
      if (pkgPath) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath.absolutePath, 'utf-8'));
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

          if (allDeps['@nitrostack/core']) framework = 'NitroStack MCP';
          else if (allDeps['next']) framework = 'Next.js';
          else if (allDeps['nuxt']) framework = 'Nuxt';
          else if (allDeps['@angular/core']) framework = 'Angular';
          else if (allDeps['vue']) framework = 'Vue';
          else if (allDeps['svelte']) framework = 'Svelte';
          else if (allDeps['react']) framework = 'React';
          else if (allDeps['express']) framework = 'Express';
          else if (allDeps['fastify']) framework = 'Fastify';
          else if (allDeps['nestjs'] || allDeps['@nestjs/core']) framework = 'NestJS';
          else if (allDeps['hono']) framework = 'Hono';
        } catch { /* ignore parse errors */ }
      }
    }

    if (fileNames.has('requirements.txt') || fileNames.has('pyproject.toml')) {
      if (framework === 'Unknown') framework = 'Python';
      if (scan.files.some((f) => f.relativePath.includes('django'))) framework = 'Django';
      if (scan.files.some((f) => f.relativePath.includes('flask'))) framework = 'Flask';
      if (scan.files.some((f) => f.relativePath.includes('fastapi'))) framework = 'FastAPI';
    }

    if (fileNames.has('go.mod')) framework = framework === 'Unknown' ? 'Go' : framework;
    if (fileNames.has('cargo.toml')) framework = framework === 'Unknown' ? 'Rust' : framework;

    // ── Pattern detection ──
    if (scan.stats.topLevelDirs.includes('src')) patterns.push('src/ source layout');
    if (scan.stats.topLevelDirs.includes('tests') || scan.stats.topLevelDirs.includes('test'))
      patterns.push('dedicated test directory');
    if (scan.files.some((f) => f.relativePath.includes('modules/'))) patterns.push('modular architecture');
    if (scan.files.some((f) => f.relativePath.includes('controllers/'))) patterns.push('MVC pattern');
    if (scan.files.some((f) => f.relativePath.includes('services/'))) patterns.push('service layer');
    if (fileNames.has('docker-compose.yml') || fileNames.has('docker-compose.yaml'))
      patterns.push('Docker Compose');
    if (scan.files.some((f) => f.relativePath.includes('.github/workflows')))
      patterns.push('GitHub Actions CI/CD');
    if (fileNames.has('dockerfile') || scan.files.some((f) => f.relativePath.toLowerCase().includes('dockerfile')))
      patterns.push('containerized');

    // ── Entry points ──
    const entryPatterns = [
      /^src[/]index\./i, /^src[/]main\./i, /^src[/]app\./i,
      /^index\./i, /^main\./i, /^app\./i, /^server\./i,
    ];
    for (const file of scan.files) {
      if (entryPatterns.some((p) => p.test(file.relativePath))) {
        entryPoints.push(file.relativePath);
      }
    }

    return { framework, patterns, entryPoints };
  }

  // ── Dependency Extraction ──────────────────────────────────────────

  /**
   * Extract dependencies from package manifests.
   */
  extractDependencies(repoPath: string): Dependency[] {
    const deps: Dependency[] = [];

    // Node.js: package.json
    const pkgJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
          deps.push({ name, version: String(version), type: 'production' });
        }
        for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
          deps.push({ name, version: String(version), type: 'development' });
        }
        for (const [name, version] of Object.entries(pkg.peerDependencies ?? {})) {
          deps.push({ name, version: String(version), type: 'peer' });
        }
      } catch { /* ignore */ }
    }

    // Python: requirements.txt
    const reqPath = path.join(repoPath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      try {
        const lines = fs.readFileSync(reqPath, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:[><=!~]+\s*(.+))?/);
          if (match) {
            deps.push({ name: match[1], version: match[2] || '*', type: 'production' });
          }
        }
      } catch { /* ignore */ }
    }

    return deps;
  }

  // ── Relationship Building ──────────────────────────────────────────

  /**
   * Build file-to-file import relationships from parsed source files.
   */
  private buildRelationships(parsedFiles: ParsedFile[], repoPath: string): FileRelationship[] {
    const relationships: FileRelationship[] = [];
    const fileSet = new Set(parsedFiles.map((f) => f.filePath));

    for (const parsed of parsedFiles) {
      for (const imp of parsed.imports) {
        if (!imp.isRelative) continue;

        // Resolve relative import to absolute path
        const fromDir = path.dirname(parsed.filePath);
        let resolvedPath = path.resolve(fromDir, imp.source);

        // Try common extensions if the import has no extension
        if (!path.extname(resolvedPath)) {
          const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
          for (const ext of extensions) {
            if (fileSet.has(resolvedPath + ext)) {
              resolvedPath = resolvedPath + ext;
              break;
            }
            // Check for index files
            const indexPath = path.join(resolvedPath, `index${ext}`);
            if (fileSet.has(indexPath)) {
              resolvedPath = indexPath;
              break;
            }
          }
        }

        const fromRel = path.relative(repoPath, parsed.filePath).replace(/\\/g, '/');
        const toRel = path.relative(repoPath, resolvedPath).replace(/\\/g, '/');

        relationships.push({
          from: fromRel,
          to: toRel,
          type: 'imports',
        });
      }
    }

    return relationships;
  }

  // ── LLM Summary ────────────────────────────────────────────────────

  /**
   * Use Qwen2.5 to generate a human-readable project summary.
   */
  private async generateProjectSummary(
    scan: ScanResult,
    architecture: AnalysisResult['architecture'],
    dependencies: Dependency[],
  ): Promise<string> {
    const topLangs = Object.entries(scan.stats.languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang, count]) => `${lang} (${count} files)`)
      .join(', ');

    const topDeps = dependencies
      .filter((d) => d.type === 'production')
      .slice(0, 10)
      .map((d) => d.name)
      .join(', ');

    const prompt = [
      'Generate a concise technical summary of this software project based on the following analysis data.',
      '',
      `Framework: ${architecture.framework}`,
      `Languages: ${topLangs}`,
      `Total Files: ${scan.stats.totalFiles}`,
      `Directories: ${scan.stats.topLevelDirs.join(', ')}`,
      `Patterns: ${architecture.patterns.join(', ') || 'none detected'}`,
      `Entry Points: ${architecture.entryPoints.join(', ') || 'none detected'}`,
      `Key Dependencies: ${topDeps || 'none'}`,
      '',
      'Write 3-5 sentences explaining what this project is, what technology stack it uses,',
      'and how it is structured. Be specific and technical.',
    ].join('\n');

    const response = await this.llm.generateResponse([
      { role: 'system', content: 'You are a senior software architect analyzing a codebase.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.3 });

    return response.content;
  }
}
