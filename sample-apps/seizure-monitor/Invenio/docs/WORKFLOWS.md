# Invenio — Workflows

## Overview

This document describes the agent orchestration workflows in Invenio.

## Primary Workflows

### 1. Research Discovery Workflow

Triggered by: User entering a research query.

\\\
User → Research Query
  ↓
Planner Agent: decompose_goal(query)
  → Task 1: Research Agent: search_papers(query)
  → Task 2: Datasets Agent: search_datasets(query)
  → Task 3: Repositories Agent: search_repositories(query)
  ↓ (parallel execution)
Knowledge Graph Agent: create_entity() for each result
  ↓
Evidence Agent: extract_claims() for top papers
  ↓
Correlation Agent: find_similar_entities() for all entities
  ↓
Results surfaced in frontend
\\\

### 2. Hypothesis Generation Workflow

Triggered by: User viewing Knowledge Graph / clicking "Find Connections".

\\\
User selects entity or domain pair
  ↓
Correlation Agent: discover_bridges(domain_a, domain_b)
  ↓
Hypothesis Agent: generate_hypotheses(bridges)
  ↓
Evidence Agent: gather_evidence(hypotheses)
  ↓
Reports Agent: summarize(hypotheses + evidence)
  ↓
Hypothesis displayed with confidence score + evidence chain
\\\

### 3. Report Generation Workflow

Triggered by: User creating a new report.

\\\
User selects entities / hypotheses for report
  ↓
Reports Agent: generate_report(entities, hypotheses)
  → fetch full entity data from Supabase + Neo4j
  → generate Markdown sections with AI
  → format citations (BibTeX, APA, MLA)
  ↓
Report saved to Supabase
  ↓
Rendered in frontend Reports page
\\\

## Phase 2: All workflow definitions will be formalized as NitroStack workflow YAML files.
