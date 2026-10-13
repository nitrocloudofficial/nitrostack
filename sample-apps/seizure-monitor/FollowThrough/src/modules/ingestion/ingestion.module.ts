import { Module } from '@nitrostack/core';
import { IngestionService } from './ingestion.service.js';
import { IngestionTools } from './ingestion.tools.js';

@Module({
  name: 'ingestion',
  description: 'Meeting transcript ingestion and commitment extraction',
  controllers: [IngestionTools],
  providers: [IngestionService],
})
export class IngestionModule {}
