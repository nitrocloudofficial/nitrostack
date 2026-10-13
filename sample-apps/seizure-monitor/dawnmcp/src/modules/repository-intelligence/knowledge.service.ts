import { Injectable } from '@nitrostack/core';
import { FileStoreService } from '../../database/file-store.service.js';
import { ScannerService } from './scanner.service.js';
import { AnalyzerService } from './analyzer.service.js';
import type { AnalysisResult } from './analyzer.service.js';
import { createHash } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────

export type EntityType = 'file' | 'function' | 'class' | 'module' | 'dependency' | 'api';
export type RelationType = 'imports' | 'exports' | 'contains' | 'calls' | 'depends_on';

export interface GraphEntity {
  id: string;
  name: string;
  type: EntityType;
  path?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphRelationship {
  sourceId: string;
  targetId: string;
  relation: RelationType;
}

export interface KnowledgeGraphData {
  repoPath: string;
  repoId: string;
  updatedAt: string;
  entities: GraphEntity[];
  relationships: GraphRelationship[];
}

const COLLECTION_NAME = 'knowledge_graphs';

// ─── Service ──────────────────────────────────────────────────────────

/**
 * Knowledge Graph Service
 *
 * Constructs and queries an architectural knowledge graph of files, functions, classes,
 * dependencies, and import relationships.
 */
@Injectable()
export class KnowledgeService {
  constructor(
    private readonly fileStore: FileStoreService,
    private readonly scanner: ScannerService,
    private readonly analyzer: AnalyzerService,
  ) {}

  /**
   * Build a knowledge graph for a repository using AnalyzerService.
   */
  async buildGraph(repoPath: string): Promise<KnowledgeGraphData> {
    const resolvedPath = this.scanner.validatePath(repoPath);
    const repoId = createHash('sha256').update(resolvedPath.toLowerCase()).digest('hex').slice(0, 16);

    const analysis = await this.analyzer.analyzeRepository(resolvedPath);
    const entities = new Map<string, GraphEntity>();
    const relationships: GraphRelationship[] = [];

    // Add files & parsed symbols
    for (const parsed of analysis.parsedFiles) {
      const fileId = `file:${parsed.filePath}`;
      entities.set(fileId, {
        id: fileId,
        name: parsed.filePath,
        type: 'file',
        path: parsed.filePath,
        metadata: { language: parsed.language, lineCount: parsed.lineCount },
      });

      for (const fn of parsed.functions) {
        const fnId = `fn:${parsed.filePath}:${fn.name}`;
        entities.set(fnId, {
          id: fnId,
          name: fn.name,
          type: 'function',
          path: parsed.filePath,
          metadata: { isAsync: fn.isAsync, isExported: fn.isExported, line: fn.line },
        });
        relationships.push({ sourceId: fileId, targetId: fnId, relation: 'contains' });
      }

      for (const cls of parsed.classes) {
        const clsId = `class:${parsed.filePath}:${cls.name}`;
        entities.set(clsId, {
          id: clsId,
          name: cls.name,
          type: 'class',
          path: parsed.filePath,
          metadata: { methods: cls.methods, isExported: cls.isExported, line: cls.line },
        });
        relationships.push({ sourceId: fileId, targetId: clsId, relation: 'contains' });
      }
    }

    // Add dependencies
    for (const dep of analysis.dependencies) {
      const depId = `dep:${dep.name}`;
      entities.set(depId, {
        id: depId,
        name: dep.name,
        type: 'dependency',
        metadata: { version: dep.version, type: dep.type },
      });
    }

    // Add file import relationships
    for (const rel of analysis.relationships) {
      const sourceId = `file:${rel.from}`;
      const targetId = `file:${rel.to}`;
      if (entities.has(sourceId) && entities.has(targetId)) {
        relationships.push({ sourceId, targetId, relation: 'imports' });
      }
    }

    const graphData: KnowledgeGraphData = {
      repoPath: resolvedPath,
      repoId,
      updatedAt: new Date().toISOString(),
      entities: Array.from(entities.values()),
      relationships,
    };

    await this.fileStore.set(COLLECTION_NAME, repoId, graphData as unknown as Record<string, unknown>);
    console.error(`🕸️ Knowledge graph built: ${graphData.entities.length} entities, ${relationships.length} relationships`);

    return graphData;
  }

  /**
   * Query an existing knowledge graph.
   */
  async queryGraph(
    repoPath: string,
    queryName?: string,
    entityType?: EntityType,
  ): Promise<{ entities: GraphEntity[]; relationships: GraphRelationship[] }> {
    const resolvedPath = this.scanner.validatePath(repoPath);
    const repoId = createHash('sha256').update(resolvedPath.toLowerCase()).digest('hex').slice(0, 16);

    let graph = await this.fileStore.get<KnowledgeGraphData>(COLLECTION_NAME, repoId);
    if (!graph) {
      graph = await this.buildGraph(resolvedPath);
    }

    let filteredEntities = graph.entities;

    if (entityType) {
      filteredEntities = filteredEntities.filter((e) => e.type === entityType);
    }

    if (queryName) {
      const lower = queryName.toLowerCase();
      filteredEntities = filteredEntities.filter((e) => e.name.toLowerCase().includes(lower));
    }

    const matchedIds = new Set(filteredEntities.map((e) => e.id));
    const filteredRels = graph.relationships.filter(
      (r) => matchedIds.has(r.sourceId) || matchedIds.has(r.targetId),
    );

    return { entities: filteredEntities, relationships: filteredRels };
  }
}
