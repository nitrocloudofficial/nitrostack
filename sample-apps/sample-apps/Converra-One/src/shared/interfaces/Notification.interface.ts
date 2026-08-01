import { NotificationType } from '../enums/notification.enum.js';
import { PriorityLevel } from '../enums/priority.enum.js';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: PriorityLevel;
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}
