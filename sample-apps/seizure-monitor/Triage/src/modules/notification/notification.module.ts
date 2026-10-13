// src/modules/notification/notification.module.ts
import { Module } from '@nitrostack/core';
import { NotificationService } from './notification.service.js';
import { NotificationTools } from './notification.tools.js';

@Module({
  name: 'notification',
  description: 'Sends emergency alert SMS to contacts',
  controllers: [NotificationTools],
  providers: [NotificationService],
})
export class NotificationModule {}