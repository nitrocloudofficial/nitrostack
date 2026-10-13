import { Injectable } from '@nitrostack/core';
import { NotificationRecord } from './notification.types.js';

@Injectable()
export class NotificationDeliveryService {
  async send(notification: NotificationRecord): Promise<void> {
    const forcedFailures = (process.env.FACTORYBRAIN_NOTIFICATION_FAIL_RECIPIENTS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (forcedFailures.includes(notification.recipient.address)) throw new Error(`Simulated delivery failure for ${notification.recipient.address}`);
    // Demo adapter: persistence plus live dashboard delivery represents a successful send.
    // Replace this boundary with email/SMS/Teams providers without changing agent orchestration.
  }
}
