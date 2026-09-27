import { Module } from '@nitrostack/core';
import { NotificationService } from './notification.service.js';
import { NotificationTools } from './notification.tools.js';
import { BrokerageModule } from '../brokerage/brokerage.module.js';
import { SharedModule } from '../../shared/shared.module.js';

/**
 * Notification Module
 * Stakeholder Notification & ERP Sync Agent
 *
 * Dynamically updates all affected enterprise systems (ERP inventory modules) and
 * drafts transparent, clear status updates for enterprise clients or internal management.
 */
@Module({
  name: 'notification',
  description: 'Stakeholder Notification & ERP Sync Agent - communications and system updates',
  imports: [SharedModule, BrokerageModule],
  providers: [NotificationService],
  controllers: [NotificationTools],
})
export class NotificationModule {}
