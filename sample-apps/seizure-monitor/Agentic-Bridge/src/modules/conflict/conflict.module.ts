import { Module } from '@nitrostack/core';
import { ConflictTools } from './conflict.tools.js';
import { ConflictService } from './conflict.service.js';
import { AgileModule } from '../agile/agile.module.js';

@Module({
  name: 'conflict',
  description: 'Semantic conflict detection and human-in-the-loop resolution',
  imports: [AgileModule],
  controllers: [ConflictTools],
  providers: [ConflictService],
  exports: [ConflictService],
})
export class ConflictModule {}
