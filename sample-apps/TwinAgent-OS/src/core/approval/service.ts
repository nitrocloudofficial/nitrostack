import { approvalRepository } from './repository.js';
import { ApprovalStatus } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { eventBus } from '../../infrastructure/eventBus/index.js';

export class ApprovalService {
  async getPendingApprovals(organizationId: string) {
    return approvalRepository.findPendingByOrg(organizationId);
  }

  async reviewApproval(approvalId: string, reviewerId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const approval = await approvalRepository.findById(approvalId);
    if (!approval) throw new NotFoundError('Approval request not found');

    const updated = await approvalRepository.updateReview(
      approvalId,
      reviewerId,
      status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      reason
    );

    if (status === 'APPROVED') {
      eventBus.publish('ApprovalGranted', { approvalId, actionType: approval.actionType });
    } else {
      eventBus.publish('ApprovalRejected', { approvalId, actionType: approval.actionType });
    }

    return updated;
  }
}

export const approvalService = new ApprovalService();
