import { Module } from '@nitrostack/core';
import { SplitterService } from './splitter.service.js';
import { SplitterTools } from './splitter.tools.js';
import { SplitterResources } from './splitter.resources.js';
import { SplitterPrompts } from './splitter.prompts.js';
import { DebtsModule } from '../debts/debts.module.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  name: 'splitter',
  description: 'Bill splitter, payment links, and split summaries',
  imports: [DebtsModule, DatabaseModule],
  providers: [SplitterService],
  controllers: [SplitterTools, SplitterResources, SplitterPrompts],
  exports: [SplitterService]
})
export class SplitterModule {}
