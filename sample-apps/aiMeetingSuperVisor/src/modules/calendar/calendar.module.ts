import { Module } from '@nitrostack/core';
import { CalendarTools } from './calendar.tools.js';
import { CalendarService } from './calendar.service.js';

@Module({
  name: 'calendar',
  description: 'Google Calendar OAuth2 and sync',
  controllers: [CalendarTools],
  providers: [CalendarService],
  exports: [CalendarService]
})
export class CalendarModule {}
