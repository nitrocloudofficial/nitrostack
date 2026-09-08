import { Injectable } from '@nitrostack/core';
import type {
  Dependency,
  Document,
  AffectedClaim,
  AffectedDocument,
  AffectedKnowledge,
  DocumentDependency,
  DependencyTree,
  DependencyTreeNode,
} from '../types/index.js';
import { DataLoaderService, KnowledgeInputError } from './data-loader.service.js';

// ---------------------------------------------------------------------------
// DependencyService
// ---------------------------------------------------------------------------
// Answers the core graph-traversal questions:
//   1. What documents / claims depend on a given authoritative fact?
//   2. What authoritative facts does a given document depend on?
//   3. What is the full dependency tree for a given source?
// ---------------------------------------------------------------------------

@Injectable({ deps: [DataLoaderService] })
export class DependencyService {
  constructor(private readonly dataLoader: DataLoaderService) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Find all documents and claims that depend on a specific fact
   * within an authoritative source.
   *
   * @param sourceId  e.g. "discount-policy"
   * @param factKey   e.g. "maximum_discount"
   */
  findAffectedKnowledge(sourceId: string, factKey: string): AffectedKnowledge {
    const dependencies = this.dataLoader.getDependencies();
    const documents = this.dataLoader.getDocuments();

    // Current authoritative value (may be undefined if source isn't found)
    const source = this.dataLoader.getSourceById(sourceId);
    if (!source) {
      throw new KnowledgeInputError(`Unknown authoritative source: ${sourceId}`);
    }
    if (!(factKey in source.facts)) {
      throw new KnowledgeInputError(`Unknown fact for ${sourceId}: ${factKey}`);
    }
    const currentValue = source.facts[factKey];

    // Filter matching deps
    const matchingDeps = dependencies.filter(
      (d) => d.source_id === sourceId && d.fact_key === factKey,
    );

    // Build the affected-documents list, grouping claims per document
    const docMap = new Map<string, AffectedDocument>();
    const seenClaims = new Set<string>();

    for (const dep of matchingDeps) {
      const doc = documents.find((d) => d.id === dep.dependent_document_id);
      if (!doc) continue;

      const claim = doc.claims.find((c) => c.id === dep.dependent_claim_id);
      if (!claim) continue;

      const claimKey = `${doc.id}:${claim.id}`;
      if (seenClaims.has(claimKey)) continue;
      seenClaims.add(claimKey);

      const affectedClaim: AffectedClaim = {
        claim_id: claim.id,
        claim_text: claim.text,
        section: claim.section,
        dependency_type: dep.dependency_type,
      };

      if (docMap.has(doc.id)) {
        docMap.get(doc.id)!.affected_claims.push(affectedClaim);
      } else {
        docMap.set(doc.id, {
          document_id: doc.id,
          document_title: doc.title,
          department: doc.department,
          criticality: doc.criticality,
          customer_facing: doc.customer_facing,
          affected_claims: [affectedClaim],
        });
      }
    }

    const affected = Array.from(docMap.values());
    const totalClaims = affected.reduce(
      (acc, d) => acc + d.affected_claims.length,
      0,
    );

    return {
      source_id: sourceId,
      fact_key: factKey,
      current_value: currentValue,
      total_affected_documents: affected.length,
      total_affected_claims: totalClaims,
      affected,
    };
  }

  /**
   * List every authoritative fact that a given document depends on.
   *
   * @param documentId  e.g. "sales-playbook"
   */
  findDocumentDependencies(documentId: string): DocumentDependency[] {
    const dependencies = this.dataLoader.getDependencies();
    const sources = this.dataLoader.getAuthoritativeSources();

    const docDeps = dependencies.filter(
      (d) => d.dependent_document_id === documentId,
    );

    return docDeps.map((dep) => {
      const source = sources.find((s) => s.id === dep.source_id);
      return {
        source_id: dep.source_id,
        source_title: source?.title ?? dep.source_id,
        fact_key: dep.fact_key,
        fact_value: source?.facts[dep.fact_key] ?? 'unknown',
        claim_id: dep.dependent_claim_id,
        dependency_type: dep.dependency_type,
      } satisfies DocumentDependency;
    });
  }

  /**
   * Build the complete dependency tree for an entire authoritative source —
   * every fact with all documents/claims that depend on each fact.
   *
   * @param sourceId  e.g. "discount-policy"
   */
  getFullDependencyTree(sourceId: string): DependencyTree {
    const source = this.dataLoader.getSourceById(sourceId);
    const dependencies = this.dataLoader.getDependencies();
    const documents = this.dataLoader.getDocuments();

    // Group deps by fact_key
    const byFact = new Map<string, Dependency[]>();
    for (const dep of dependencies.filter((d) => d.source_id === sourceId)) {
      const list = byFact.get(dep.fact_key) ?? [];
      list.push(dep);
      byFact.set(dep.fact_key, list);
    }

    const docIndex = new Map<string, Document>(documents.map((d) => [d.id, d]));

    const facts: DependencyTreeNode[] = Array.from(byFact.entries()).map(
      ([factKey, deps]) => {
        const dependentDocuments = deps.map((dep) => {
          const doc = docIndex.get(dep.dependent_document_id);
          return {
            document_id: dep.dependent_document_id,
            document_title: doc?.title ?? dep.dependent_document_id,
            claim_id: dep.dependent_claim_id,
          };
        });

        return {
          fact_key: factKey,
          fact_value: source?.facts[factKey] ?? 'unknown',
          dependent_documents: dependentDocuments,
        } satisfies DependencyTreeNode;
      },
    );

    return {
      source_id: sourceId,
      source_title: source?.title ?? sourceId,
      facts,
    };
  }

  // ── Internal helpers (available to sibling services) ─────────────────────

  /**
   * Look up a specific dependency entry.
   * Returns undefined if no match is found.
   */
  getDependency(
    documentId: string,
    claimId: string,
  ): Dependency | undefined {
    return this.dataLoader.getDependencyForClaim(documentId, claimId);
  }
}
