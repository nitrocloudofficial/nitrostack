# Invenio — AI Agents

## Overview

Invenio uses 9 specialized AI agents orchestrated by the Planner agent via NitroStack MCP.

## Agent Architecture

### 1. Planner Agent

**Role:** Master orchestrator. Receives research goals and decomposes them into tasks for specialist agents.

**Tools (Phase 2):**
- decompose_goal(goal: str) → TaskList
- ssign_task(agent: str, task: Task) → TaskResult
- synthesize_results(results: List[TaskResult]) → Summary

### 2. Research Agent

**Role:** Discovers scientific papers across multiple sources.

**Tools (Phase 2):**
- search_papers(query: str, sources: List[str]) → List[Paper]
- etch_paper_detail(doi: str) → Paper
- ind_related_papers(paper_id: str) → List[Paper]
- import_from_arxiv(arxiv_id: str) → Paper

**Data Sources:** OpenAlex, ArXiv, Semantic Scholar, PubMed

### 3. Datasets Agent

**Role:** Indexes and retrieves research datasets.

**Tools (Phase 2):**
- search_datasets(query: str) → List[Dataset]
- etch_dataset_metadata(id: str) → Dataset
- ind_datasets_for_paper(paper_id: str) → List[Dataset]

**Data Sources:** Kaggle, HuggingFace, Zenodo, UCI ML Repository

### 4. Repositories Agent

**Role:** Discovers code repositories related to research.

**Tools (Phase 2):**
- search_repositories(query: str) → List[Repository]
- ind_implementations(paper_id: str) → List[Repository]
- nalyze_dependencies(repo_url: str) → DependencyGraph

**Data Sources:** GitHub API, GitLab API, Papers with Code

### 5. Knowledge Graph Agent

**Role:** Constructs and maintains the Neo4j knowledge graph.

**Tools (Phase 2):**
- create_entity(entity: Entity) → Node
- create_relationship(from_id: str, to_id: str, type: str) → Edge
- ind_path(from_id: str, to_id: str) → Path
- get_neighbors(entity_id: str, depth: int) → Subgraph

### 6. Evidence Agent

**Role:** Extracts and structures evidence chains from research entities.

**Tools (Phase 2):**
- extract_claims(paper_id: str) → List[Claim]
- score_evidence(claim: Claim, supporting: List[Entity]) → Evidence
- ind_contradictions(claim: Claim) → List[Evidence]

### 7. Correlation Agent

**Role:** Discovers cross-domain correlations between entities.

**Tools (Phase 2):**
- ind_similar_entities(entity_id: str) → List[SimilarEntity]
- compute_similarity(a: str, b: str) → float
- discover_bridges(domain_a: str, domain_b: str) → List[Bridge]

### 8. Hypothesis Agent

**Role:** Generates and validates research hypotheses.

**Tools (Phase 2):**
- generate_hypotheses(entities: List[Entity]) → List[Hypothesis]
- score_hypothesis(hypothesis: Hypothesis) → HypothesisScore
- alidate_hypothesis(hypothesis: Hypothesis) → ValidationResult

### 9. Reports Agent

**Role:** Generates structured research reports.

**Tools (Phase 2):**
- generate_report(entities: List[Entity], hypotheses: List[Hypothesis]) → Report
- ormat_citations(entities: List[Entity]) → Bibliography
- export_report(report: Report, format: str) → bytes
"@ | Out-File -Encoding UTF8 "docs\AGENTS.md"

@"
# Invenio — Prompt Engineering

## Overview

This document defines the prompt engineering standards and templates for all Nitro AI agents.

## Principles

1. **Specificity over generality** — Every prompt is scoped to a single responsibility
2. **Structured outputs** — All agent outputs are JSON/Pydantic schemas, never free text
3. **Chain of thought** — Complex reasoning tasks use explicit reasoning steps
4. **Grounded claims** — All assertions are linked to source entities
5. **Confidence scoring** — All AI-generated claims carry explicit confidence scores

## Prompt Templates

### Research Agent — Paper Search

\\\
You are a scientific literature expert. Your task is to analyze the following research query and produce a structured set of search terms optimized for academic databases.

Query: {query}

Return a JSON object with:
- expanded_queries: List of 5 semantically related search queries
- key_concepts: List of core concepts extracted from the query
- domains: List of relevant scientific domains
- suggested_filters: Suggested year range, citation threshold

Format: {"expanded_queries": [...], "key_concepts": [...], "domains": [...]}
\\\

### Correlation Agent — Cross-Domain Bridge

\\\
You are a cross-domain research analyst. Given two entities from different scientific fields, identify meaningful structural or conceptual analogies.

Entity A: {entity_a}
Entity B: {entity_b}

Return:
- similarity_score: float 0-1
- analogy_type: "structural" | "functional" | "mathematical" | "phenomenological"
- explanation: One-paragraph explanation of the analogy
- evidence: List of specific shared properties or principles
\\\

## Phase 2: All prompt templates will be stored as versioned files in 
itro/prompts/.
