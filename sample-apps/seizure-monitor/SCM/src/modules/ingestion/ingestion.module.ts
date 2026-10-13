import { Module } from '@nitrostack/core';
import { IngestionTools } from './ingestion.tools.js';
import { IngestionExceptionFilter } from './ingestion.exception.filter.js';
import { ClaudeClient } from '../../shared/claude.client.js';


/**
 * IngestionModule — Document ingestion subsystem.
 *
 * Provides:
 *   • IngestionTools             — MCP controller (tools + resource) for classify / extract / ingest
 *   • IngestionExceptionFilter   — Structured error mapper for ingestion tools
 *
 * Depends on:
 *   • ClaudeClient               — Anthropic API wrapper (singleton)

 *
 * Exports:
 *   • IngestionTools             — so OrchestratorModule can call classify/extract programmatically
 */
@Module({
  name: 'ingestion',
  description: 'Document ingestion — classify, extract, and pipeline tools',
  controllers: [IngestionTools],
  providers: [
    ClaudeClient,

    IngestionExceptionFilter,
  ],
  exports: [IngestionTools],
})
export class IngestionModule {}
