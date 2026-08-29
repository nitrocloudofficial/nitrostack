import { Module } from '@nitrostack/core';
import { MeetingSchedulerTools } from './meetingscheduler.tools.js';
import { MeetingSchedulerResources } from './meetingscheduler.resources.js';
import { MeetingSchedulerPrompts } from './meetingscheduler.prompts.js';

@Module({
  name: 'meetingscheduler',
  description: 'TODO: Add description',
  controllers: [MeetingSchedulerTools, MeetingSchedulerResources, MeetingSchedulerPrompts],
})
export class MeetingSchedulerModule {}
