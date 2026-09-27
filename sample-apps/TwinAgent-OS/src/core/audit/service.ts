import { prisma } from '../../config/database.js';

export class AuditService {
  async logAction(data: {
    organizationId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    aiReasoning?: string;
    toolUsed?: string;
    beforeState?: object;
    afterState?: object;
  }) {
    return prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        aiReasoning: data.aiReasoning,
        toolUsed: data.toolUsed,
        beforeState: (data.beforeState || {}) as any,
        afterState: (data.afterState || {}) as any,
      },
    });
  }

  async getAuditLogs(organizationId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const auditService = new AuditService();
