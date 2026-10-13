import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { MessageTemplateService } from './message-template.service.js';
import { NotificationAgent } from './notification.agent.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';
import { NotificationRealtimeService } from './notification-realtime.service.js';
import { NotificationTools } from './notification.tools.js';
import { RecipientConfigService } from './recipient-config.service.js';

@Module({
  name: 'notification', description: 'Team notification delivery, status, retry, deduplication, and dashboard real-time updates',
  imports: [ServicesModule],
  providers: [RecipientConfigService, MessageTemplateService, NotificationDeliveryService, NotificationRealtimeService, NotificationAgent],
  controllers: [NotificationTools],
  exports: [NotificationAgent, NotificationRealtimeService],
})
export class NotificationModule {}
