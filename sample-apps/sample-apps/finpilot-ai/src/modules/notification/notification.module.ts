import { Module } from '@nitrostack/core';
import { NotificationTools } from './notification.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'notification',
  description: 'Notification System Module — Interactive alerts, warnings, and time-based reminders',
  controllers: [NotificationTools],
  providers: [FinanceStore],
})
export class NotificationModule {}
