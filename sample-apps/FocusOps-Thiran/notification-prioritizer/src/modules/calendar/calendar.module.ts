import { Module } from '@nitrostack/core';
import { CalendarTools } from './calendar.tools.js';

@Module({
  name: 'calendar',
  description: 'Calendar integration module',
  controllers: [CalendarTools]
})
export class CalendarModule {}
