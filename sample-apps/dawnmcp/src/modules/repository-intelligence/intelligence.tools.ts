import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { ScannerService } from './scanner.service.js';
import { AnalyzerService } from './analyzer.service.js';
import { IndexerService } from './indexer.service.js';
import { WatcherService } from './watcher.service.js';
import { KnowledgeService, EntityType } from './knowledge.service.js';
import { LlmService } from '../../shared/services/llm.service.js';

/**
 * Repository Intelligence MCP Tools
 *
 * Exposes analysis, file scanning, semantic code search, watcher monitoring,
 * knowledge graph querying, and project summary tools.
 *
 * NOTE: watch_repository / unwatch_repository / list_watched_repositories
 * are temporarily disabled below to trim the total tool count for a
 * hackathon demo (NitroStudio canvas caps at 30 items). Uncomment the
 * block to restore them.
 */
@Controller('repo')
export class IntelligenceTools {
  constructor(
    private readonly scanner: ScannerService,
    private readonly analyzer: AnalyzerService,
    private readonly indexer: IndexerService,
    private readonly watcher: WatcherService,
    private readonly knowledge: KnowledgeService,
    private readonly llm: LlmService,
  ) {}

  // ── analyze_repository ─────────────────────────────────────────────

  @Tool({
    name: 'analyze_repository',
    description:
      'Analyze a local repository to understand its structure, framework, dependencies, and architecture. Scans all files, performs AST parsing on source code, detects patterns, and generates an AI summary.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async analyzeRepository(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing repository', { path: input.path });

    try {
      const validatedPath = this.scanner.validatePath(input.path);
      const analysis = await this.analyzer.analyzeRepository(validatedPath);

      return {
        success: true,
        repository: analysis.scan.repoPath,
        summary: analysis.summary,
        architecture: analysis.architecture,
        stats: {
          totalFiles: analysis.scan.stats.totalFiles,
          totalSizeBytes: analysis.scan.stats.totalSizeBytes,
          totalSizeMB: Math.round((analysis.scan.stats.totalSizeBytes / 1_048_576) * 100) / 100,
          languages: analysis.scan.stats.languages,
          fileTypes: analysis.scan.stats.fileTypes,
          topLevelDirectories: analysis.scan.stats.topLevelDirs,
        },
        dependencies: {
          production: analysis.dependencies
            .filter((d) => d.type === 'production')
            .map((d) => `${d.name}@${d.version}`),
          development: analysis.dependencies
            .filter((d) => d.type === 'development')
            .map((d) => `${d.name}@${d.version}`),
        },
        parsedFiles: {
          count: analysis.parsedFiles.length,
          totalFunctions: analysis.parsedFiles.reduce((sum, f) => sum + f.functions.length, 0),
          totalClasses: analysis.parsedFiles.reduce((sum, f) => sum + f.classes.length, 0),
          topFiles: analysis.parsedFiles.slice(0, 10).map((f) => ({
            path: f.filePath,
            language: f.language,
            functions: f.functions.length,
            classes: f.classes.length,
            lines: f.lineCount,
            confidence: f.parseConfidence,
          })),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Repository analysis failed', { error: message });
      return { success: false, error: message };
    }
  }

  // ── scan_files ─────────────────────────────────────────────────────

  @Tool({
    name: 'scan_files',
    description: 'Scan a local repository and list all files with classified types, languages, and aggregate statistics.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository directory.'),
    }),
  })
  async scanFiles(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Scanning files', { path: input.path });

    try {
      const validatedPath = this.scanner.validatePath(input.path);
      const scan = await this.scanner.scanRepository(validatedPath);

      return {
        success: true,
        repository: scan.repoPath,
        stats: scan.stats,
        sampleFiles: scan.files.slice(0, 50).map((f) => ({
          path: f.relativePath,
          language: f.language,
          type: f.fileType,
          sizeBytes: f.sizeBytes,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  // ── index_repository ───────────────────────────────────────────────

  @Tool({
    name: 'index_repository',
    description:
      'Index a local repository for semantic code search. Scans files, splits them into function/class chunks, generates embeddings using Ollama, and stores them in ChromaDB.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async indexRepository(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Indexing repository', { path: input.path });

    try {
      const validatedPath = this.scanner.validatePath(input.path);
      const metadata = await this.indexer.indexRepository(validatedPath);

      return {
        success: true,
        repository: metadata.repoPath,
        repoId: metadata.repoId,
        commitHash: metadata.commitHash,
        indexedAt: metadata.indexedAt,
        totalChunks: metadata.totalChunks,
        totalFiles: metadata.totalFiles,
        languages: metadata.languages,
        embeddingModel: metadata.embeddingModel,
        message: `Indexed ${metadata.totalChunks} code chunks from ${metadata.totalFiles} files`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Repository indexing failed', { error: message });
      return { success: false, error: message };
    }
  }

  // ── ask_codebase ───────────────────────────────────────────────────

  @Tool({
    name: 'ask_codebase',
    description:
      'Ask a natural language question about an indexed codebase. Uses RAG (retrieval-augmented generation) over ChromaDB vector search and Qwen2.5-Coder LLM.',
    inputSchema: z.object({
      question: z.string().min(1).describe('Natural language question about the codebase.'),
      repo_path: z.string().optional().describe('Optional: path to a specific indexed repository.'),
      maxChunks: z.number().int().min(1).max(20).default(8).describe('Number of relevant code chunks to retrieve.'),
    }),
  })
  async askCodebase(
    input: { question: string; repo_path?: string; maxChunks?: number },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Codebase Q&A', { question: input.question });

    try {
      const repoPath = input.repo_path ? this.scanner.validatePath(input.repo_path) : undefined;
      const chunks = await this.indexer.searchCode(input.question, repoPath, input.maxChunks ?? 8);

      if (chunks.length === 0) {
        return {
          success: false,
          error: 'No indexed code found. Run index_repository first to index the codebase.',
        };
      }

      const context = chunks
        .map(
          (c, i) =>
            `--- Code Chunk ${i + 1} (${c.filePath}:${c.startLine}-${c.endLine}) ---\n${c.content}`,
        )
        .join('\n\n');

      const response = await this.llm.generateResponse([
        {
          role: 'system',
          content:
            'You are an expert AI software engineer answering questions about a codebase. Base your answer strictly on the provided source code context. Reference specific file names and line numbers.',
        },
        {
          role: 'user',
          content: `QUESTION: ${input.question}\n\nCODE CONTEXT:\n${context}`,
        },
      ], { temperature: 0.2 });

      return {
        success: true,
        answer: response.content,
        sourcesUsed: chunks.map((c) => ({
          file: c.filePath,
          lines: `${c.startLine}-${c.endLine}`,
          relevance: `${Math.round(c.similarity * 100)}%`,
        })),
        model: response.model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Codebase Q&A failed', { error: message });
      return { success: false, error: message };
    }
  }

  // ── watch_repository / unwatch / list ─────────────────────────────
  // DISABLED for hackathon demo (tool-count trim). Uncomment to restore.
  /*
  @Tool({
    name: 'watch_repository',
    description: 'Start real-time background file watching on a repository. Automatically updates vector embeddings when files are added or modified.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async watchRepository(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Watching repository', { path: input.path });

    try {
      const info = await this.watcher.startWatching(input.path);
      return { success: true, message: `Started watching ${info.repoPath}`, info };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'unwatch_repository',
    description: 'Stop watching a repository.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async unwatchRepository(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Unwatching repository', { path: input.path });

    try {
      const stopped = await this.watcher.stopWatching(input.path);
      return { success: stopped, message: stopped ? `Stopped watching ${input.path}` : 'Repository was not actively watched' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'list_watched_repositories',
    description: 'List all repositories currently monitored by the background watcher.',
    inputSchema: z.object({}),
  })
  async listWatchedRepositories(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Listing watched repositories');

    const watched = this.watcher.listWatchedRepositories();
    return { success: true, count: watched.length, repositories: watched };
  }
  */

  // ── build_knowledge_graph / query_knowledge_graph ─────────────────

  @Tool({
    name: 'build_knowledge_graph',
    description: 'Construct a structural knowledge graph of files, functions, classes, and dependencies for a repository.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async buildKnowledgeGraph(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Building knowledge graph', { path: input.path });

    try {
      const graph = await this.knowledge.buildGraph(input.path);
      return {
        success: true,
        repoPath: graph.repoPath,
        updatedAt: graph.updatedAt,
        totalEntities: graph.entities.length,
        totalRelationships: graph.relationships.length,
        sampleEntities: graph.entities.slice(0, 30),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'query_knowledge_graph',
    description: 'Query the repository knowledge graph by entity name or type (file, function, class, module, dependency).',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
      query: z.string().optional().describe('Optional search string to filter entity names.'),
      type: z.enum(['file', 'function', 'class', 'module', 'dependency', 'api']).optional().describe('Filter by entity type.'),
    }),
  })
  async queryKnowledgeGraph(
    input: { path: string; query?: string; type?: EntityType },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Querying knowledge graph', { path: input.path, query: input.query });

    try {
      const result = await this.knowledge.queryGraph(input.path, input.query, input.type);
      return {
        success: true,
        entityCount: result.entities.length,
        relationshipCount: result.relationships.length,
        entities: result.entities,
        relationships: result.relationships.slice(0, 50),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  // ── explain_architecture & explain_project ─────────────────────────

  @Tool({
    name: 'explain_architecture',
    description: 'Generate a detailed architectural explanation of a repository.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async explainArchitecture(input: { path: string }, ctx: ExecutionContext) {
    return this.explainProject(input, ctx);
  }

  @Tool({
    name: 'explain_project',
    description: 'Generate a comprehensive project explanation including architecture, technology stack, and module structure.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async explainProject(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Explaining project', { path: input.path });

    try {
      const validatedPath = this.scanner.validatePath(input.path);
      const analysis = await this.analyzer.analyzeRepository(validatedPath);

      const detailedContext = [
        `Framework: ${analysis.architecture.framework}`,
        `Patterns: ${analysis.architecture.patterns.join(', ') || 'none'}`,
        `Entry Points: ${analysis.architecture.entryPoints.join(', ')}`,
        `Top Directories: ${analysis.scan.stats.topLevelDirs.join(', ')}`,
        `Languages: ${JSON.stringify(analysis.scan.stats.languages)}`,
        `Total Files: ${analysis.scan.stats.totalFiles}`,
        `Key Dependencies: ${analysis.dependencies.slice(0, 10).map((d) => d.name).join(', ')}`,
      ].join('\n');

      const response = await this.llm.generateResponse([
        {
          role: 'system',
          content: 'You are a senior software architect creating an onboarding and architecture document for a codebase.',
        },
        {
          role: 'user',
          content: `Generate a clear, structured architecture overview for this project:\n\n${detailedContext}`,
        },
      ], { temperature: 0.3 });

      return {
        success: true,
        explanation: response.content,
        metadata: {
          framework: analysis.architecture.framework,
          totalFiles: analysis.scan.stats.totalFiles,
          languages: analysis.scan.stats.languages,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  // ── find_feature_location ──────────────────────────────────────────

  @Tool({
    name: 'find_feature_location',
    description: 'Locate where a specific feature or capability is implemented in the codebase.',
    inputSchema: z.object({
      feature: z.string().min(1).describe('Feature name or description (e.g. "JWT authentication" or "vector search").'),
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async findFeatureLocation(input: { feature: string; path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Finding feature location', { feature: input.feature });

    try {
      const validatedPath = this.scanner.validatePath(input.path);
      const chunks = await this.indexer.searchCode(input.feature, validatedPath, 5);

      return {
        success: true,
        feature: input.feature,
        locations: chunks.map((c) => ({
          file: c.filePath,
          lines: `${c.startLine}-${c.endLine}`,
          relevance: `${Math.round(c.similarity * 100)}%`,
          snippetPreview: c.content.slice(0, 150),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  // ── impact_analysis ────────────────────────────────────────────────

  @Tool({
    name: 'impact_analysis',
    description: 'Analyze potential impact of modifying a specific file or symbol across the codebase.',
    inputSchema: z.object({
      file: z.string().min(1).describe('Relative or absolute file path to analyze.'),
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async impactAnalysis(input: { file: string; path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Impact analysis', { file: input.file });

    try {
      const validatedPath = this.scanner.validatePath(input.path);
      const analysis = await this.analyzer.analyzeRepository(validatedPath);

      const targetRel = input.file.replace(/\\/g, '/');
      const dependents = analysis.relationships.filter(
        (r) => r.to.endsWith(targetRel) || targetRel.endsWith(r.to),
      );

      return {
        success: true,
        targetFile: input.file,
        directDependents: dependents.map((d) => d.from),
        totalDependents: dependents.length,
        summary: `Modifying ${input.file} impacts ${dependents.length} file(s) in the project.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  // ── summarize_repository ───────────────────────────────────────────

  @Tool({
    name: 'summarize_repository',
    description: 'Get a concise high-level technical summary of the repository.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Absolute path to the repository root directory.'),
    }),
  })
  async summarizeRepository(input: { path: string }, ctx: ExecutionContext) {
    ctx.logger.info('Summarizing repository', { path: input.path });

    try {
      const validatedPath = this.scanner.validatePath(input.path);
      const analysis = await this.analyzer.analyzeRepository(validatedPath);

      return {
        success: true,
        summary: analysis.summary,
        framework: analysis.architecture.framework,
        totalFiles: analysis.scan.stats.totalFiles,
        languages: analysis.scan.stats.languages,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}