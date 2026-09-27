import { Module } from '@nitrostack/core';
import { MeetingsTools } from './meetings.tools.js';
import { MeetingsService } from './meetings.service.js';

@Module({
  name: 'meetings',
  description: 'Meeting scheduling and lifecycle',
  controllers: [MeetingsTools],
  providers: [MeetingsService],
  exports: [MeetingsService]
})
export class MeetingsModule {}
