import { Module } from '@nitrostack/core';
import { ParserService } from './parser.service.js';
import { IngestTools } from './ingest.tools.js';

@Module({
  name: 'ingestion',
  providers: [ParserService, IngestTools],
  exports: [ParserService]
})
export class IngestionModule {}
