import { Injectable } from '@nitrostack/core';
import { EmbeddingService } from '../../shared/services/embedding.service.js';
import { VectorStoreService } from '../../database/vector-store.service.js';
import { FileStoreService } from '../../database/file-store.service.js';
import { ScannerService } from './scanner.service.js';
import type { ScannedFile } from './scanner.service.js';
import { ParserService } from './parser.service.js';
import { AppConfigService } from '../../config/app.config.js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import { execSync } from 'child_process';

// ─── Types ────────────────────────────────────────────────────────────

export interface CodeChunk {
  id: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  repoPath: string;
  parseConfidence: string;
}

export interface IndexMetadata {
  repoPath: string;
  repoId: string;
  commitHash?: string;
  indexedAt: string;
  totalChunks: number;
  totalFiles: number;
  languages: Record<string, number>;
  embeddingModel: string;
}

const VECTOR_COLLECTION = 'repo_chunks';
const INDEX_COLLECTION = 'repo_indexes';
const MAX_CHUNK_CHARS = 6000; // ~1500 tokens
const CHUNK_OVERLAP_CHARS = 400; // ~100 tokens
const MAX_FILE_SIZE = 512_000;
const EMBED_BATCH_SIZE = 10;

@Injectable()
export class IndexerService {
  constructor(
    private readonly config: AppConfigService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly fileStore: FileStoreService,
    private readonly scanner: ScannerService,
    private readonly parser: ParserService,
  ) {}

  /**
   * Index a full repository: scan, chunk, embed, store with metadata.
   */
  async indexRepository(repoPath: string): Promise<IndexMetadata> {
    const resolvedPath = this.scanner.validatePath(repoPath);
    const repoId = this.generateRepoId(resolvedPath);
    const commitHash = this.getGitCommitHash(resolvedPath);

    console.error(`📦 Indexing repository: ${resolvedPath} (repoId: ${repoId})`);

    const scan = await this.scanner.scanRepository(resolvedPath);
    const sourceFiles = scan.files.filter(
      (f) => f.fileType === 'source' || f.fileType === 'config' || f.fileType === 'documentation',
    );

    console.error(`   Found ${sourceFiles.length} indexable files`);

    const allChunks: CodeChunk[] = [];
    for (const file of sourceFiles) {
      if (file.sizeBytes > MAX_FILE_SIZE) continue;

      try {
        const chunks = await this.chunkFile(file, resolvedPath);
        allChunks.push(...chunks);
      } catch {
        // Skip
      }
    }

    console.error(`   Generated ${allChunks.length} code chunks`);

    await this.vectorStore.createCollection(VECTOR_COLLECTION);
    const existingDocs = await this.vectorStore.query(
      VECTOR_COLLECTION,
      new Array(768).fill(0),
      10000,
      { repoId },
    );

    if (existingDocs.length > 0) {
      await this.vectorStore.deleteDocuments(
        VECTOR_COLLECTION,
        existingDocs.map((d) => d.id),
      );
    }

    const indexedAt = new Date().toISOString();

    for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
      const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
      const texts = batch.map((c) => c.content);

      try {
        const embeddings = await this.embeddingService.createBatchEmbedding(texts);

        const vectorDocs = batch.map((chunk, idx) => ({
          id: chunk.id,
          content: chunk.content,
          embedding: embeddings[idx],
          metadata: {
            filePath: chunk.filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            language: chunk.language,
            repoPath: chunk.repoPath,
            repoId,
            commitHash: commitHash ?? '',
            parseConfidence: chunk.parseConfidence,
            embedding_model: this.config.embedModel,
            indexed_at: indexedAt,
          },
        }));

        await this.vectorStore.addDocuments(VECTOR_COLLECTION, vectorDocs);
      } catch (error) {
        console.error(`   ⚠️ Failed to embed batch ${i}-${i + batch.length}:`, error);
      }

      const progress = Math.min(100, Math.round(((i + batch.length) / allChunks.length) * 100));
      if (progress % 20 === 0 || i + batch.length >= allChunks.length) {
        console.error(`   Indexing progress: ${progress}%`);
      }
    }

    const metadata: IndexMetadata = {
      repoPath: resolvedPath,
      repoId,
      commitHash,
      indexedAt,
      totalChunks: allChunks.length,
      totalFiles: sourceFiles.length,
      languages: scan.stats.languages,
      embeddingModel: this.config.embedModel,
    };

    await this.fileStore.set(INDEX_COLLECTION, repoId, metadata as unknown as Record<string, unknown>);

    console.error(`✅ Repository indexed: ${allChunks.length} chunks from ${sourceFiles.length} files`);
    return metadata;
  }

  /**
   * Re-index a single file (for incremental watcher updates).
   */
  async reindexFile(filePath: string, repoPath: string): Promise<number> {
    const resolvedRepo = path.resolve(repoPath);
    const resolvedFile = path.resolve(filePath);
    const relativePath = path.relative(resolvedRepo, resolvedFile).replace(/\\/g, '/');
    const repoId = this.generateRepoId(resolvedRepo);

    // Delete existing chunks for this file
    const existingDocs = await this.vectorStore.query(
      VECTOR_COLLECTION,
      new Array(768).fill(0),
      10000,
      { filePath: relativePath, repoId },
    );

    if (existingDocs.length > 0) {
      await this.vectorStore.deleteDocuments(
        VECTOR_COLLECTION,
        existingDocs.map((d) => d.id),
      );
    }

    // If file was deleted, we're done
    if (!fs.existsSync(resolvedFile)) return 0;

    const stat = fs.statSync(resolvedFile);
    const ext = path.extname(resolvedFile).toLowerCase();
    const scannedFile: ScannedFile = {
      absolutePath: resolvedFile,
      relativePath,
      extension: ext,
      language: 'Unknown',
      fileType: 'source',
      sizeBytes: stat.size,
    };

    const chunks = await this.chunkFile(scannedFile, resolvedRepo);
    if (chunks.length === 0) return 0;

    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.createBatchEmbedding(texts);
    const indexedAt = new Date().toISOString();

    const vectorDocs = chunks.map((chunk, idx) => ({
      id: chunk.id,
      content: chunk.content,
      embedding: embeddings[idx],
      metadata: {
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        language: chunk.language,
        repoPath: chunk.repoPath,
        repoId,
        parseConfidence: chunk.parseConfidence,
        embedding_model: this.config.embedModel,
        indexed_at: indexedAt,
      },
    }));

    await this.vectorStore.addDocuments(VECTOR_COLLECTION, vectorDocs);
    return chunks.length;
  }

  /**
   * Search indexed codebase.
   */
  async searchCode(
    query: string,
    repoPath?: string,
    limit = 10,
  ): Promise<Array<{ content: string; filePath: string; startLine: number; endLine: number; similarity: number; parseConfidence?: string }>> {
    const queryEmbedding = await this.embeddingService.createEmbedding(query);

    let filter: Record<string, unknown> | undefined;
    if (repoPath) {
      const resolved = this.scanner.validatePath(repoPath);
      filter = { repoId: this.generateRepoId(resolved) };
    }

    const results = await this.vectorStore.query(VECTOR_COLLECTION, queryEmbedding, limit, filter);

    return results.map((r) => ({
      content: r.content,
      filePath: r.metadata.filePath as string,
      startLine: r.metadata.startLine as number,
      endLine: r.metadata.endLine as number,
      similarity: r.similarity,
      parseConfidence: r.metadata.parseConfidence as string,
    }));
  }

  // ── Chunking Logic ──────────────────────────────────────────────────

  private async chunkFile(file: ScannedFile, repoPath: string): Promise<CodeChunk[]> {
    let content: string;
    try {
      content = fs.readFileSync(file.absolutePath, 'utf-8');
    } catch {
      return [];
    }

    if (content.trim().length === 0) return [];

    const relativePath = path.relative(repoPath, file.absolutePath).replace(/\\/g, '/');
    const parsed = await this.parser.parseFile(file.absolutePath, file.language);
    const lines = content.split('\n');

    // Small files
    if (content.length <= MAX_CHUNK_CHARS) {
      return [
        {
          id: randomUUID(),
          content: `// File: ${relativePath}\n${content}`,
          filePath: relativePath,
          startLine: 1,
          endLine: lines.length,
          language: file.language,
          repoPath: path.resolve(repoPath),
          parseConfidence: parsed.parseConfidence,
        },
      ];
    }

    const chunks: CodeChunk[] = [];

    // Top-level header chunk (imports + constants)
    const headerLines = lines.slice(0, Math.min(30, lines.length));
    chunks.push({
      id: randomUUID(),
      content: `// File Header: ${relativePath}\n${headerLines.join('\n')}`,
      filePath: relativePath,
      startLine: 1,
      endLine: Math.min(30, lines.length),
      language: file.language,
      repoPath: path.resolve(repoPath),
      parseConfidence: parsed.parseConfidence,
    });

    // Chunk by function/class boundaries
    let currentStart = 0;
    let currentSize = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentSize += line.length + 1;

      if (currentSize >= MAX_CHUNK_CHARS) {
        let splitLine = i;
        for (let j = i; j > Math.max(currentStart + 5, i - 30); j--) {
          const trimmed = lines[j].trim();
          if (trimmed === '' || /^(export|function|class|def|pub|interface)/.test(trimmed)) {
            splitLine = j;
            break;
          }
        }

        if (splitLine <= currentStart) splitLine = i;

        const chunkLines = lines.slice(currentStart, splitLine);
        chunks.push({
          id: randomUUID(),
          content: `// File: ${relativePath} (lines ${currentStart + 1}-${splitLine})\n${chunkLines.join('\n')}`,
          filePath: relativePath,
          startLine: currentStart + 1,
          endLine: splitLine,
          language: file.language,
          repoPath: path.resolve(repoPath),
          parseConfidence: parsed.parseConfidence,
        });

        const overlapLines = Math.ceil(CHUNK_OVERLAP_CHARS / 80);
        currentStart = Math.max(currentStart + 1, splitLine - overlapLines);
        currentSize = lines.slice(currentStart, i + 1).join('\n').length;
      }
    }

    if (currentStart < lines.length) {
      const remainingLines = lines.slice(currentStart);
      if (remainingLines.join('').trim().length > 10) {
        chunks.push({
          id: randomUUID(),
          content: `// File: ${relativePath} (lines ${currentStart + 1}-${lines.length})\n${remainingLines.join('\n')}`,
          filePath: relativePath,
          startLine: currentStart + 1,
          endLine: lines.length,
          language: file.language,
          repoPath: path.resolve(repoPath),
          parseConfidence: parsed.parseConfidence,
        });
      }
    }

    return chunks;
  }

  private generateRepoId(resolvedPath: string): string {
    return createHash('sha256').update(resolvedPath.toLowerCase()).digest('hex').slice(0, 16);
  }

  private getGitCommitHash(repoPath: string): string | undefined {
    try {
      return execSync('git rev-parse HEAD', { cwd: repoPath, stdio: ['pipe', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      return undefined;
    }
  }
}
