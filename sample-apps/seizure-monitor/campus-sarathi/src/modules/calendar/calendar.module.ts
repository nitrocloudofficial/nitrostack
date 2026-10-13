import { Module } from '@nitrostack/core';
import { CalendarTools } from './calendar.tools.js';
import { CalendarService } from './calendar.service.js';
import { GoogleAuthService } from '../../services/google-auth.service.js';

@Module({
  name: 'calendar',
  description: 'Google Calendar integration',
  controllers: [CalendarTools],
  providers: [CalendarService, GoogleAuthService],
  imports: [],
  exports: [CalendarService]
})
export class CalendarModule {}
