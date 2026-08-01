import { Module } from '@nitrostack/core';
import { TimetableTools } from './timetable.tools.js';
import { TimetableResources } from './timetable.resources.js';
import { TimetablePrompts } from './timetable.prompts.js';

@Module({
  name: 'timetable',
  description: 'Academic timetable and schedule management agent',
  controllers: [TimetableTools, TimetableResources, TimetablePrompts],
})
export class TimetableModule {}
