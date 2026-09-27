import { Module } from '@nitrostack/core';
import { SharedModule } from '../../shared/shared.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ScannerService } from './scanner.service.js';
import { ParserService } from './parser.service.js';
import { AnalyzerService } from './analyzer.service.js';
import { IndexerService } from './indexer.service.js';
import { WatcherService } from './watcher.service.js';
import { KnowledgeService } from './knowledge.service.js';
import { IntelligenceTools } from './intelligence.tools.js';

/**
 * Repository Intelligence Module
 *
 * Provides codebase scanning, AST parsing, architecture detection,
 * vector indexing, real-time file watching, knowledge graph generation,
 * and RAG Q&A capabilities.
 */
@Module({
  name: 'repository-intelligence',
  description: 'Codebase analysis, indexing, watching, and graph intelligence',
  imports: [SharedModule, DatabaseModule],
  providers: [
    ScannerService,
    ParserService,
    AnalyzerService,
    IndexerService,
    WatcherService,
    KnowledgeService,
  ],
  controllers: [IntelligenceTools],
  exports: [
    ScannerService,
    ParserService,
    AnalyzerService,
    IndexerService,
    WatcherService,
    KnowledgeService,
  ],
})
export class RepositoryIntelligenceModule {}
