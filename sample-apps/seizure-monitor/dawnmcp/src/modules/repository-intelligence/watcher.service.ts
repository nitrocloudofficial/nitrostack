import { Injectable, OnModuleDestroy } from '@nitrostack/core';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { ScannerService } from './scanner.service.js';
import { IndexerService } from './indexer.service.js';

export interface WatchedRepoInfo {
  repoPath: string;
  startedAt: string;
  filesWatched: number;
}

/**
 * Repository Watcher Service
 *
 * Monitors local repositories for file changes using chokidar.
 * Automatically updates vector embeddings incrementally when files are changed or added.
 */
@Injectable()
export class WatcherService implements OnModuleDestroy {
  private watchers = new Map<string, chokidar.FSWatcher>();
  private activeRepos = new Map<string, WatchedRepoInfo>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly scanner: ScannerService,
    private readonly indexer: IndexerService,
  ) {}

  onModuleDestroy(): void {
    this.stopAllWatchers();
  }

  /**
   * Start watching a repository for file changes.
   */
  async startWatching(repoPath: string): Promise<WatchedRepoInfo> {
    const resolvedPath = this.scanner.validatePath(repoPath);

    if (this.watchers.has(resolvedPath)) {
      return this.activeRepos.get(resolvedPath)!;
    }

    const watcher = chokidar.watch(resolvedPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/__pycache__/**',
        '**/*.log',
        '**/data/**',
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    watcher.on('add', (filePath) => this.handleFileChange(filePath, resolvedPath));
    watcher.on('change', (filePath) => this.handleFileChange(filePath, resolvedPath));
    watcher.on('unlink', (filePath) => this.handleFileDelete(filePath, resolvedPath));

    this.watchers.set(resolvedPath, watcher);

    const info: WatchedRepoInfo = {
      repoPath: resolvedPath,
      startedAt: new Date().toISOString(),
      filesWatched: 0,
    };
    this.activeRepos.set(resolvedPath, info);

    console.error(`👁️ Started watching repository: ${resolvedPath}`);
    return info;
  }

  /**
   * Stop watching a repository.
   */
  async stopWatching(repoPath: string): Promise<boolean> {
    const resolvedPath = path.resolve(repoPath);
    const watcher = this.watchers.get(resolvedPath);

    if (!watcher) return false;

    await watcher.close();
    this.watchers.delete(resolvedPath);
    this.activeRepos.delete(resolvedPath);

    console.error(`⏹️ Stopped watching repository: ${resolvedPath}`);
    return true;
  }

  /**
   * List all currently watched repositories.
   */
  listWatchedRepositories(): WatchedRepoInfo[] {
    return Array.from(this.activeRepos.values());
  }

  /**
   * Stop all active watchers on shutdown.
   */
  stopAllWatchers(): void {
    for (const [repoPath, watcher] of this.watchers.entries()) {
      watcher.close();
      console.error(`⏹️ Stopped watcher for ${repoPath}`);
    }
    this.watchers.clear();
    this.activeRepos.clear();
  }

  // ── Private Event Handlers ─────────────────────────────────────────

  private handleFileChange(filePath: string, repoPath: string): void {
    const debounceKey = `${repoPath}:${filePath}`;

    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(debounceKey);
      try {
        console.error(`🔄 Reindexing modified file: ${path.relative(repoPath, filePath)}`);
        await this.indexer.reindexFile(filePath, repoPath);
      } catch (err) {
        console.error(`⚠️ Failed to reindex ${filePath}:`, err);
      }
    }, 500);

    this.debounceTimers.set(debounceKey, timer);
  }

  private handleFileDelete(filePath: string, repoPath: string): void {
    const debounceKey = `${repoPath}:${filePath}`;
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    setTimeout(async () => {
      try {
        console.error(`🗑️ Removing deleted file from index: ${path.relative(repoPath, filePath)}`);
        await this.indexer.reindexFile(filePath, repoPath); // reindex handles file removal
      } catch (err) {
        console.error(`⚠️ Failed to clean up ${filePath}:`, err);
      }
    }, 500);
  }
}
