import { Module } from '@nitrostack/core';
import { EmailService } from './email.service.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsTools } from './notifications.tools.js';

@Module({
    name: 'notifications',
    description: 'Incident severity classification, stakeholder notification, and email delivery',
    controllers: [NotificationsTools],
    providers: [NotificationsService, EmailService],
})
export class NotificationsModule {}
