# Hybrid Search and Vector Retrieval Engine Specification

This document details the search, indexing, and vector embedding pipeline implemented in `mcp/src/services/elastic.client.ts` and `mcp/src/services/embedding.client.ts`.

## Elasticsearch Index Configuration

The search engine stores indexed patches in an Elasticsearch index named `hacksmymachine-fixes`.

### Custom Code Analyzer

To handle source code snippets, stack traces, and variable identifiers, the index defines a custom analyzer named `hm_code_analyzer`:

* Tokenizer: `standard`
* Token Filters: `lowercase`, `hm_code_word_delimiter`
* Word Delimiter Settings: `word_delimiter_graph` configured to split on case changes, generate word and number parts, catenate words and numbers, and preserve original tokens.

### Field Mappings

Index properties are defined as follows:

* `id`: Keyword type representing a unique card slug.
* `problem`: Text type analyzed with `hm_code_analyzer`.
* `errorType`: Keyword type representing the error class.
* `stacktrace`: Text type analyzed with `hm_code_analyzer`.
* `environment.language`: Keyword type (lowercase).
* `environment.version`: Keyword type.
* `environment.framework`: Keyword type (lowercase).
* `environment.packageVersions`: Flattened type for flexible key-value version matching.
* `patch`: Text type analyzed with `hm_code_analyzer`.
* `verification.status`: Keyword type (`PASS` or `FAIL`).
* `verification.score`: Float type representing score metrics.
* `verification.lastVerified`: Date type.
* `verification.sandbox`: Keyword type.
* `verification.exitCode`: Integer type.
* `verification.durationMs`: Integer type.
* `verification.stdout`: Non-indexed text type.
* `verification.stderr`: Non-indexed text type.
* `embedding`: Dense vector type (`dims: 1024`, `similarity: cosine`, `index: true`).

## Search Query Execution

All queries pass through `ElasticService.prototype.searchFix` or `ElasticService.prototype.findSimilar`.

### 1. Hybrid Reciprocal Rank Fusion (RRF) Search

When vector embeddings are active, search queries use an Elasticsearch Reciprocal Rank Fusion retriever combining BM25 lexical search and k-Nearest Neighbors vector search:

* Lexical Branch: `multi_match` query spanning `stacktrace` (boost 2.0), `problem`, and `errorType`.
* Vector Branch: `knn` search matching candidate query vectors against indexed dense vectors.
* Rank Parameters: `rank_window_size` set to four times the request limit (minimum 20), and `rank_constant` set to 60.
* Access Filtering: Every search query includes mandatory filter clauses enforcing `verification.status: PASS` and matching environment metadata (language, framework, package versions). Unverified records are strictly filtered out of search results.

### 2. Lexical Fallback Mode

If vector embedding generation is not configured or fails due to network degradation, the engine falls back to a BM25 lexical search:

* Query: `bool` query with `must` containing `multi_match` across text fields.
* Filter: Enforces `verification.status: PASS` and environment parameters.
* Reporting: The result structure explicitly flags `mode: 'lexical'` and includes warning messages in the response envelope disclosing that vector search was bypassed.

## Embedding Client Implementation

The embedding client (`mcp/src/services/embedding.client.ts`) communicates with OpenRouter embedding models:

* Default Model: `nvidia/nemotron-3-embed-1b:free`
* Dimension Validation: Checks returned vector lengths against configured dimensions (1024) to ensure schema compatibility.
* Retry Handling: Implements exponential backoff with bounded retries for HTTP 429 rate limits and 5xx server errors. Auth and validation errors (4xx) fail immediately.
* Batching: Divides input strings into maximum batch sizes of 64 items per request.
