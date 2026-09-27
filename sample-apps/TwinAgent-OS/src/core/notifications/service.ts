import { prisma } from '../../config/database.js';
import { wsManager } from '../../infrastructure/websocket/index.js';

export class NotificationService {
  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createNotification(userId: string, title: string, message: string, type: string, link?: string) {
    const notification = await prisma.notification.create({
      data: { userId, title, message, type, link },
    });

    wsManager.broadcast('NOTIFICATION_CREATED', { userId, notification });
    return notification;
  }

  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }
}

export const notificationService = new NotificationService();
