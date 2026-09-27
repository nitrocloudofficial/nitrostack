import { Module } from '@nitrostack/core';
import { CalendarTools } from './calendar.tools.js';

@Module({
  name: 'calendar',
  description: 'Calendar availability and scheduling tools',
  controllers: [CalendarTools]
})
export class CalendarModule {}