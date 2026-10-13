/**
 * Ranked retrieval over the knowledge base.
 *
 * Extracted so the pipeline's `Explore` stage, the `query_knowledge` tool and
 * the orchestrator's tool loop all rank identically — three callers scoring the
 * same corpus three slightly different ways would make the manifest's
 * provenance impossible to reason about.
 */
import { Injectable } from '@nitrostack/core';
import { StoreService } from './store.service.js';
import { SemanticService } from './semantic.service.js';
import type { KnowledgeFact } from '../schemas/index.js';

export interface SearchHit {
  id: string;
  title: string;
  detail: string;
  score: number;
  evidence: string[];
  agent: string;
  category: string;
  /** True when a model inferred this fact rather than a parser extracting it. */
  reasoned: boolean;
}

/** Below this the match is noise rather than a weak signal. */
const SCORE_FLOOR = 0.02;

@Injectable({ deps: [StoreService, SemanticService] })
export class KnowledgeSearchService {
  constructor(
    private store: StoreService,
    private semantic: SemanticService
  ) {}

  /**
   * Rank facts against a free-text query by cosine similarity, nudged by how
   * load-bearing each fact is. The weight bonus is capped low on purpose: it
   * should break ties between comparable matches, not let a high-weight fact
   * outrank one that actually answers the question.
   */
  search(query: string, limit = 8, category?: string): SearchHit[] {
    const queryVector = this.semantic.embed(query);

    let facts: KnowledgeFact[] = this.store.all('knowledge');
    if (category) facts = facts.filter((fact) => fact.category === category);

    return facts
      .map((fact) => {
        const similarity = this.semantic.cosine(
          queryVector,
          this.semantic.embed(`${fact.title} ${fact.detail}`)
        );
        return { fact, score: similarity * (1 + fact.weight / 20) };
      })
      .filter((entry) => entry.score > SCORE_FLOOR)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ fact, score }) => ({
        id: fact.id,
        title: fact.title,
        detail: fact.detail,
        score,
        evidence: fact.evidence,
        agent: fact.agent,
        category: fact.category,
        reasoned: fact.reasoned === true,
      }));
  }
}
