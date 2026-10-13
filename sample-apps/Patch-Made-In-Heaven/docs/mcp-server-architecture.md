# MCP Server Architecture and Controller Specification

This document details the architectural design, implementation structure, and execution lifecycle of the Model Context Protocol (MCP) server within the repository.

## Framework and Initialization

The server is built using the NitroStack TypeScript framework (`@nitrostack/core` and `@nitrostack/cli`). It acts as a standardized tool server communicating over the Model Context Protocol protocol.

### Server Declaration

The primary application module is defined in `mcp/src/app.module.ts`:

* Server Identifier: `patch-made-in-heaven-mcp`
* Version: `1.0.0`
* Application Module: `AppModule`

The `@Module` decorator registers four tool controllers:

1. `SearchTools` (`mcp/src/tools/search.tool.ts`)
2. `RetrieveTools` (`mcp/src/tools/retrieve.tool.ts`)
3. `VerifyTools` (`mcp/src/tools/verify.tool.ts`)
4. `SubmitTools` (`mcp/src/tools/submit.tool.ts`)

The server entry point (`mcp/src/index.ts`) initializes environment configurations and bootstraps the NitroStack application instance.

## Tool Controllers and Specifications

### 1. SearchTools Controller

Class Location: `mcp/src/tools/search.tool.ts`

The `SearchTools` class manages queries across the search store.

* `search_fix`: Accepts a structured input containing an error stack trace, target programming language, optional framework, package version mappings, and result count limit. It calls `ElasticService.searchFix` to perform a hybrid Reciprocal Rank Fusion search.
* `find_similar`: Accepts a natural language problem query and result count limit. It calls `ElasticService.findSimilar` to execute a vector similarity search across indexed records.

### 2. RetrieveTools Controller

Class Location: `mcp/src/tools/retrieve.tool.ts`

The `RetrieveTools` class handles direct record and artifact lookups.

* `get_patch`: Accepts a knowledge card identifier and retrieves the raw unified git diff patch associated with the record.
* `get_execution_log`: Accepts a knowledge card identifier and returns the captured verification logs, including standard output, standard error, process exit code, and execution duration.

### 3. VerifyTools Controller

Class Location: `mcp/src/tools/verify.tool.ts`

The `VerifyTools` class manages candidate patch execution inside isolated containers.

* `verify_fix`: Accepts candidate source code, a test execution command, environment specifications, optional baseline code, and logical file path labels. It executes the candidate code within a Docker sandbox, generates a unified diff against the baseline code, computes SHA-256 patch digests, and persists a server-owned Verification Run record in Elasticsearch.

### 4. SubmitTools Controller

Class Location: `mcp/src/tools/submit.tool.ts`

The `SubmitTools` class validates and indexes candidate patches.

* `submit_fix`: Accepts problem descriptions, error logs, unified diff patches, verification run identifiers, and environment metadata. It verifies that the submission matches an active, unexpired, PASS-status Verification Run record created by `verify_fix`, validates the SHA-256 patch digest, confirms environment equivalence, and indexes the validated record into Elasticsearch.

## Execution Lifecycle

Each tool execution follows a deterministic four-step pipeline:

1. Input Validation: Tool parameters are validated against Zod schemas. Invalid inputs return a formatted error envelope.
2. Service Health Check: The tool verifies underlying client connections (`ElasticService` and `VerificationRunClient`). If services are unreachable, execution returns a `DEPENDENCY_UNAVAILABLE` error status.
3. Domain Logic Execution: The controller executes the underlying business logic, such as container execution, index searching, or digest matching.
4. Response Envelope Generation: Outputs are wrapped in the standardized `hm.v1` response envelope using `buildSuccessEnvelope` or `buildErrorEnvelope`.
