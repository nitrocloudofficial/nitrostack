import { prisma } from '../../config/database.js';
import { ApprovalStatus } from '@prisma/client';

export class ApprovalRepository {
  async findPendingByOrg(organizationId: string) {
    return prisma.approvalRequest.findMany({
      where: {
        requester: { organizationId },
        status: ApprovalStatus.PENDING,
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        workflow: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.approvalRequest.findUnique({ where: { id } });
  }

  async updateReview(id: string, reviewerId: string, status: ApprovalStatus, reason?: string) {
    return prisma.approvalRequest.update({
      where: { id },
      data: {
        reviewerId,
        status,
        reason,
        reviewedAt: new Date(),
      },
    });
  }
}

export const approvalRepository = new ApprovalRepository();
