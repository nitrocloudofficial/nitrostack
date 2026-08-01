import { Module } from '@nitrostack/core';
import { CalendarTools } from './calendar.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'calendar',
  description: 'Calendar Integration Module — Google Calendar sync and secondary university/work calendar mirroring',
  controllers: [CalendarTools],
  providers: [FinanceStore],
})
export class CalendarModule {}
