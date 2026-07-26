import { Module } from '@nitrostack/core';
import { CommonModule } from '../../common/common.module.js';
import { DecisionJournalHandler } from './decision-journal.handler.js';
import { ReviewTools } from './review.tools.js';

@Module({
  name: 'review',
  description: 'Officer review queue, document requests, decision overrides and audit trail',
  imports: [CommonModule],
  providers: [DecisionJournalHandler],
  controllers: [ReviewTools],
})
export class ReviewModule {}
