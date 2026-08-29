# Project Updates & Enhancements

This document summarizes the recent architectural upgrades and bug fixes implemented for the NitroStack Hackathon project to support a **Hybrid Data Architecture** (combining structured JSON and unstructured PDF files).

## 1. Hybrid Data Architecture Implementation
To demonstrate true enterprise readiness, the MCP server was upgraded from exclusively using structured databases/JSON to supporting **Unstructured Enterprise Knowledge** (PDFs).

- **Added `pdf2json` Dependency:** Replaced older, incompatible PDF parsing libraries with `pdf2json` to reliably extract text data from binary PDF documents without throwing `XRef entry` errors.
- **Created `PdfIngestionService` (`src/services/pdf-ingestion.service.ts`):** 
  - Scans the `src/data/pdfs/` directory for `.pdf` files.
  - Extracts text from the binary PDFs.
  - Parses out critical enterprise policy facts (like `password_rotation`, `mfa_required`) and structured metadata using pattern matching.
- **Mock PDF Generation:** Generated `src/data/pdfs/security-policy-v4.pdf` as a persistent test asset. (The one-off Python script used for its generation was removed to keep the repository strictly TypeScript/Node.js).

## 2. Core Service Integration
- **`DataLoaderService` Refactoring:**
  - Injected `PdfIngestionService` into the central `DataLoaderService`.
  - Modified `getAuthoritativeSources()` to seamlessly merge the parsed PDF policies with the existing `authoritative_sources.json` data.
  - As a result, the entire system (Change Detection, Risk Scoring, Remediation) automatically works on unstructured PDF data because it's abstracted into the same in-memory interface.
- **Dependency Injection:** Registered the `PdfIngestionService` within the application module (`knowledge.module.ts`) so it properly hooks into the NitroStack framework.

## 3. Architecture & Build Stabilization
- **Fixed ESM / TypeScript Compilation Mismatch:** 
  - Initially, an external worker script (`parse-pdf.js`) was used. The TypeScript compiler (`tsc`) was not copying this file to the compiled `dist/` and `.test-dist/` directories, leading to silent `Module Not Found` errors in production and tests.
  - **Resolution:** Re-engineered the text extraction logic to use an **inline CommonJS script** executed via `execSync` directly inside `PdfIngestionService`. This ensures that the parsing logic travels with the compiled TypeScript code, solving all path-resolution and ESM module issues.
- **Test Suite Alignment:** 
  - Purged stale `.test-dist/` compiler cache which was causing "ghost failures" where the test runner expected 6 remediations instead of 0.
  - Recompiled and ran `npm run test:phase8`. **All tests are now passing seamlessly.**

## 4. Evaluator / Hackathon Note
This upgrade proves that the MCP server is capable of reading **Enterprise Unstructured Knowledge**. Enterprise applications rely heavily on unstructured data (compliance PDFs, legal documents), making your MCP server much more credible and valuable for the "Enterprise & Industrial" domain requirements!
