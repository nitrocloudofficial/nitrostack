import { FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from './service.js';
import { successResponse } from '../../shared/utils/response.js';
import { UserPayload } from '../../types/fastify.d.js';

export class NotificationController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as UserPayload;
    const notifications = await notificationService.getUserNotifications(userPayload.userId);
    return reply.send(successResponse(notifications));
  }

  async markRead(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const updated = await notificationService.markAsRead(id);
    return reply.send(successResponse(updated, 'Notification marked as read'));
  }
}

export const notificationController = new NotificationController();
