import { Module } from '@nitrostack/core';
import { BrainTools } from './brain.tools.js';
import { BrainService } from './brain.service.js';

@Module({
  name: 'brain',
  description: 'Vector store of meeting history plus external search',
  controllers: [BrainTools],
  providers: [BrainService],
  exports: [BrainService]
})
export class BrainModule {}
