import { readFileSync, renameSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { Injectable } from '@nitrostack/core';
import { z } from 'zod';

import type {
  AuthoritativeSource,
  Document,
  Dependency,
  ProposedUpdate,
  AuditEntry,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------
// Works for both ESM (`import.meta.url`) and the compiled output in /dist.
// The data directory lives at <project-root>/src/data relative to the source
// tree. When compiled, the dist/ mirror has no data directory, so we walk
// upward from the running file to find <project-root>/src/data.
// ---------------------------------------------------------------------------

function resolveDataDir(): string {
  // __filename equivalent for ESM
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);

  // Walk up until we find a directory that contains package.json (project root)
  let dir = currentDir;
  for (let i = 0; i < 6; i++) {
    try {
      readFileSync(join(dir, 'package.json'));
      return resolve(dir, 'src', 'data');
    } catch {
      dir = dirname(dir);
    }
  }

  // Fallback: assume we are in src/services or dist/services
  return resolve(currentDir, '..', 'data');
}

const DATA_DIR = resolveDataDir();

const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  department: z.string().min(1),
  version: z.string().min(1),
  effective_date: z.string().min(1),
  facts: z.record(z.string(), z.string()),
  metadata: z.object({
    owner: z.string().min(1),
    last_updated: z.string().min(1),
    classification: z.enum(['public', 'internal', 'confidential']),
  }),
});

const claimSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  depends_on: z.string().nullable(),
  section: z.string().min(1),
});

const documentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  department: z.string().min(1),
  type: z.enum(['playbook', 'guide', 'template', 'training', 'sop', 'policy']),
  last_reviewed: z.string().min(1),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  customer_facing: z.boolean(),
  owner: z.string().optional(),
  claims: z.array(claimSchema),
});

const dependencySchema = z.object({
  source_id: z.string().min(1),
  fact_key: z.string().min(1),
  dependent_document_id: z.string().min(1),
  dependent_claim_id: z.string().min(1),
  dependency_type: z.enum(['direct', 'indirect']),
});

const proposedUpdateSchema = z.object({
  id: z.string().min(1),
  document_id: z.string().min(1),
  document_title: z.string().min(1),
  claim_id: z.string().min(1),
  current_text: z.string(),
  suggested_text: z.string(),
  authoritative_source: z.string().min(1),
  authoritative_fact: z.string().min(1),
  authoritative_value: z.string(),
  risk_level: z.string().min(1),
  status: z.enum(['AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED']),
  proposed_at: z.string().min(1),
});

const auditEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  action: z.enum(['UPDATE_APPROVED', 'UPDATE_REJECTED', 'UPDATE_APPLIED']),
  document_id: z.string().min(1),
  document_title: z.string().min(1),
  claim_id: z.string().min(1),
  old_value: z.string(),
  new_value: z.string(),
  authoritative_source: z.string().min(1),
  reason: z.string(),
  risk_level: z.string().min(1),
});

export class KnowledgeDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnowledgeDataError';
  }
}

export class KnowledgeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KnowledgeInputError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson<T>(filename: string, schema: z.ZodType<T>): T {
  const filePath = join(DATA_DIR, filename);
  const raw = readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new KnowledgeDataError(`Invalid JSON in ${filename}: ${String(error)}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new KnowledgeDataError(
      `Invalid knowledge data in ${filename}: ${result.error.message}`,
    );
  }
  return result.data;
}

function writeJson<T>(filename: string, data: T): void {
  const filePath = join(DATA_DIR, filename);
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  renameSync(temporaryPath, filePath);
}

// ---------------------------------------------------------------------------
import { PdfIngestionService } from './pdf-ingestion.service.js';

@Injectable({ deps: [PdfIngestionService] })
export class DataLoaderService {
  constructor(private readonly pdfIngestionService: PdfIngestionService = new PdfIngestionService()) {}

  private authoritativeSources?: AuthoritativeSource[];
  private previousSources?: AuthoritativeSource[];
  private documents?: Document[];
  private dependencies?: Dependency[];
  private pendingUpdates?: ProposedUpdate[];
  private auditLog?: AuditEntry[];
  private sourceIndex?: Map<string, AuthoritativeSource>;
  private previousSourceIndex?: Map<string, AuthoritativeSource>;
  private documentIndex?: Map<string, Document>;

  // ── Read operations ──────────────────────────────────────────────────────

  /** Current (v2) authoritative sources — the ground truth. */
  getAuthoritativeSources(): AuthoritativeSource[] {
    if (!this.authoritativeSources) {
      this.authoritativeSources = readJson('authoritative_sources.json', z.array(sourceSchema));
      this.sourceIndex = buildUniqueIndex(this.authoritativeSources, 'authoritative source');
      this.validateReferences();
    }
    return this.authoritativeSources;
  }

  /**
   * Load PDF-based authoritative sources from the pdfs/ directory.
   * Call this explicitly when you want to merge PDF sources into the data set.
   */
  loadPdfSources(): AuthoritativeSource[] {
    return this.pdfIngestionService.loadPdfSources(join(DATA_DIR, 'pdfs'));
  }

  /** Previous (v1) authoritative sources — used for change detection. */
  getPreviousSources(): AuthoritativeSource[] {
    if (!this.previousSources) {
      this.previousSources = readJson('authoritative_sources_v1.json', z.array(sourceSchema));
      this.previousSourceIndex = buildUniqueIndex(this.previousSources, 'previous authoritative source');
    }
    return this.previousSources;
  }

  /** All enterprise documents with their claims. */
  getDocuments(): Document[] {
    if (!this.documents) {
      this.documents = readJson('documents.json', z.array(documentSchema));
      this.documentIndex = buildUniqueIndex(this.documents, 'document');
      const claimIds = new Set<string>();
      for (const document of this.documents) {
        for (const claim of document.claims) {
          if (claimIds.has(claim.id)) {
            throw new KnowledgeDataError(`Duplicate claim ID: ${claim.id}`);
          }
          claimIds.add(claim.id);
        }
      }
      this.validateReferences();
    }
    return this.documents;
  }

  /** Pre-computed dependency graph (fact → documents). */
  getDependencies(): Dependency[] {
    if (!this.dependencies) {
      this.dependencies = readJson('dependencies.json', z.array(dependencySchema));
      this.validateReferences();
    }
    return this.dependencies;
  }

  /** Pending remediation proposals. */
  getPendingUpdates(): ProposedUpdate[] {
    if (!this.pendingUpdates) {
      this.pendingUpdates = readJson('pending_updates.json', z.array(proposedUpdateSchema));
    }
    return this.pendingUpdates;
  }

  /** Approved-change audit log. */
  getAuditLog(): AuditEntry[] {
    if (!this.auditLog) {
      this.auditLog = readJson('audit_log.json', z.array(auditEntrySchema));
    }
    return this.auditLog;
  }

  // ── Convenience look-ups ─────────────────────────────────────────────────

  /** Find a single authoritative source by ID (current version). */
  getSourceById(sourceId: string): AuthoritativeSource | undefined {
    this.getAuthoritativeSources();
    return this.sourceIndex!.get(sourceId);
  }

  /** Find a single authoritative source in the previous (v1) data. */
  getPreviousSourceById(sourceId: string): AuthoritativeSource | undefined {
    this.getPreviousSources();
    return this.previousSourceIndex!.get(sourceId);
  }

  /** Find a single document by ID. */
  getDocumentById(documentId: string): Document | undefined {
    this.getDocuments();
    return this.documentIndex!.get(documentId);
  }

  /** Find the dependency entry for a specific claim within a document. */
  getDependencyForClaim(
    documentId: string,
    claimId: string,
  ): Dependency | undefined {
    return this.getDependencies().find(
      (d) =>
        d.dependent_document_id === documentId &&
        d.dependent_claim_id === claimId,
    );
  }

  // ── Write operations ─────────────────────────────────────────────────────

  /** Overwrite the pending-updates file. */
  savePendingUpdates(updates: ProposedUpdate[]): void {
    z.array(proposedUpdateSchema).parse(updates);
    writeJson('pending_updates.json', updates);
    this.pendingUpdates = updates;
  }

  /** Overwrite the audit-log file. */
  saveAuditLog(entries: AuditEntry[]): void {
    z.array(auditEntrySchema).parse(entries);
    writeJson('audit_log.json', entries);
    this.auditLog = entries;
  }

  /**
   * Update a single claim's text inside documents.json.
   * Mutates only the matching claim; everything else is preserved.
   */
  updateDocument(docId: string, claimId: string, newText: string): void {
    const docs = this.getDocuments();
    const doc = docs.find((d) => d.id === docId);

    if (!doc) {
      throw new Error(`Document not found: ${docId}`);
    }

    const claim = doc.claims.find((c) => c.id === claimId);
    if (!claim) {
      throw new Error(`Claim not found: ${claimId} in document ${docId}`);
    }

    claim.text = newText;
    writeJson('documents.json', docs);
    this.documents = docs;
    this.documentIndex = buildUniqueIndex(docs, 'document');
  }

  private validateReferences(): void {
    if (!this.authoritativeSources || !this.documents || !this.dependencies) return;
    for (const dependency of this.dependencies) {
      const source = this.sourceIndex!.get(dependency.source_id);
      if (!source || !(dependency.fact_key in source.facts)) {
        throw new KnowledgeDataError(
          `Dependency references missing fact: ${dependency.source_id}.${dependency.fact_key}`,
        );
      }
      const document = this.documentIndex!.get(dependency.dependent_document_id);
      const claim = document?.claims.find((item) => item.id === dependency.dependent_claim_id);
      if (!document || !claim) {
        throw new KnowledgeDataError(
          `Dependency references missing claim: ${dependency.dependent_claim_id}`,
        );
      }
      const expectedFact = `${dependency.source_id}.${dependency.fact_key}`;
      if (dependency.dependency_type === 'direct' && claim.depends_on !== expectedFact) {
        throw new KnowledgeDataError(
          `Claim ${claim.id} dependency mismatch: expected ${expectedFact}, got ${claim.depends_on ?? 'none'}`,
        );
      }
    }
  }
}

function buildUniqueIndex<T extends { id: string }>(items: T[], label: string): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) {
    if (index.has(item.id)) throw new KnowledgeDataError(`Duplicate ${label} ID: ${item.id}`);
    index.set(item.id, item);
  }
  return index;
}
