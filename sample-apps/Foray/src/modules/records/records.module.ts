import { Module } from '@nitrostack/core';
import { RecordsTools } from './records.tools.js';

/** Class Records — roster summaries for faculty; the regulation chat log
 *  for Loop 1 agents and the student. Faculty never reads the words. */
@Module({
  name: 'records',
  description: 'Class Records server: roster + append-only chat log (R-11)',
  controllers: [RecordsTools],
})
export class RecordsModule {}
