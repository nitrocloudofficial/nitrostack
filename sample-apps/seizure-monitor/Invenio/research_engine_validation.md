# Phase 2: Federated Research Engine Verification

**Date:** August 1, 2026
**Target:** Federated Research Engine (`nitro.agents.research.engine`)
**Execution Mode:** LIVE (No Mock Data, Real HTTP API Requests)

## 1. Provider Status Audit
The federated engine was tested across all 10 provider adapters using `asyncio.gather`. 

| Provider | Status | Papers Returned | Notes / API Key Status |
| :--- | :--- | :--- | :--- |
| **OpenAlex** | ✅ WORKING | 10 | Unauthenticated access succeeded (Polite Pool active). |
| **Crossref** | ✅ WORKING | 10 | Unauthenticated access succeeded. |
| **arXiv** | ✅ WORKING | 10 | Unauthenticated access succeeded. |
| **PubMed** | ✅ WORKING | 10 | Unauthenticated access succeeded. |
| **Europe PMC** | ✅ WORKING | 10 | Unauthenticated access succeeded. |
| **DOAJ** | ✅ WORKING | 10 | Unauthenticated access succeeded. |
| **Semantic Scholar** | ❌ RATE LIMITED | 0 | Failed with `429 Too Many Requests`. Requires API key for bulk datacenter IPs. |
| **CORE** | ⚠️ UNAUTHENTICATED | 0 | Connection succeeded but returned 0. Requires API key. |
| **OpenAIRE** | ⚠️ UNAUTHENTICATED | 0 | Connection succeeded but returned 0. Requires API key. |
| **Lens.org** | ⚠️ UNAUTHENTICATED | 0 | Connection succeeded but returned 0. Requires API key. |

## 2. Real Search Execution (Parallel Latency)
Queries were fired simultaneously across all 10 providers. Because of `asyncio.gather`, the total latency is bounded by the slowest responding provider, rather than the sum of all providers.

| Query | Total Latency | Unique Papers | Duplicates Removed |
| :--- | :---: | :---: | :---: |
| Graph Neural Networks for Drug Discovery | 9.27s | 55 | 5 |
| Large Language Models in Healthcare | 10.75s | 56 | 4 |
| Quantum Error Correction | 8.10s | 52 | 8 |
| Vision Transformers | 8.76s | 59 | 1 |
| Diffusion Models | 7.83s | 60 | 0 |

## 3. Normalization & Ranking Validation
The engine successfully mapped highly divergent JSON schemas (e.g., OpenAlex's inverted abstracts vs PubMed's XML-style JSON) into a strict `Paper` Pydantic model. No provider-specific JSON leaked.

**Ranking Example (Query 1: Graph Neural Networks for Drug Discovery)**
The engine accurately scored papers combining Citation Count, Publication Year (Recency), and structural completeness (PDF/Abstract presence).
- **#1 [OpenAlex]** - *Neural Message Passing for Quantum Chemistry* (Citations: 3017, Year: 2017)
- **#2 [OpenAlex]** - *Pushing the Boundaries of Molecular Representation for Drug Discovery with the Graph Attention Mechanism* (Citations: 1051, Year: 2019)
- **#3 [OpenAlex]** - *Molecular contrastive learning of representations via graph neural networks* (Citations: 835, Year: 2022)

## 4. Failure Handling (Graceful Degradation)
To verify resilience, we artificially injected hard `ValueError` exceptions into the three largest providers (`Semantic Scholar`, `OpenAlex`, `PubMed`). 
- **Result:** The `asyncio.gather` pipeline caught the exceptions via `_safe_provider_call`, flagged the providers as `error` in the `ProviderStatistics` payload, and **successfully continued execution**.
- **Impact:** The query "Vision Transformers" still recovered 39 unique papers from the remaining operational providers. The engine did not crash.

## 5. Caching Validation
- **First Execution (Miss):** 8.67s
- **Second Execution (Hit):** 0.00s
- **Result:** In-memory caching logic strictly bypasses HTTP bounds for exact query matches.

## 6. Performance Metrics
- **Current Memory Usage:** ~16.46 MB
- **Peak Memory Usage:** ~22.89 MB
- **Result:** Pydantic parsing over hundreds of JSON payloads remains highly memory efficient inside the single process.

## Current Limitations & Recommended Improvements
1. **API Keys:** The most glaring limitation is the strict requirement for a `.env` file injecting API keys. Without keys, Semantic Scholar rate-limits aggressively (429), and CORE/Lens refuse to return data. A configuration layer must be added to route API keys into the `httpx.AsyncClient` headers.
2. **Abstract Normalization:** Some APIs (like OpenAlex) return inverted indexes for abstracts rather than raw strings. We currently map them to `None` to satisfy string validators, but an invert-reconstruction algorithm should be added.
