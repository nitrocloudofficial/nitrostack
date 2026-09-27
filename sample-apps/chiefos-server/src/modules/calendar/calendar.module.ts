import { Module } from '@nitrostack/core';
import { CalendarService } from './calendar.service.js';
import { CalendarController } from './calendar.controller.js';

/**
 * CalendarModule
 * 
 * Schedule and availability management module for ChiefOS.
 * Handles calendar integration, conflict detection, and availability analysis.
 */
@Module({
  name: 'calendar',
  description: 'ChiefOS schedule and availability management module',
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
