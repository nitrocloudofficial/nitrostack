import { prisma } from '../../config/database.js';
import { ApprovalMode, WorkflowStatus } from '@prisma/client';

export class WorkflowRepository {
  async create(organizationId: string, data: {
    name: string;
    description?: string;
    triggerConfig: object;
    conditionConfig?: object;
    actionConfig: object;
    approvalMode?: ApprovalMode;
  }) {
    return prisma.workflow.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        triggerConfig: data.triggerConfig as any,
        conditionConfig: (data.conditionConfig || {}) as any,
        actionConfig: data.actionConfig as any,
        approvalMode: data.approvalMode || ApprovalMode.MANAGER_APPROVAL,
      },
    });
  }

  async findAllByOrg(organizationId: string) {
    return prisma.workflow.findMany({
      where: { organizationId },
      include: { executions: { orderBy: { startedAt: 'desc' }, take: 5 } },
    });
  }

  async findById(id: string) {
    return prisma.workflow.findUnique({ where: { id } });
  }

  async createExecution(workflowId: string, status: WorkflowStatus, initialLogs: object[]) {
    return prisma.workflowExecution.create({
      data: {
        workflowId,
        status,
        logs: initialLogs as any,
      },
    });
  }

  async updateExecution(id: string, status: WorkflowStatus, logs: object[], completedAt?: Date) {
    return prisma.workflowExecution.update({
      where: { id },
      data: { status, logs: logs as any, completedAt },
    });
  }

  async createApprovalRequest(workflowId: string, requesterId: string, actionType: string, payload: object) {
    return prisma.approvalRequest.create({
      data: {
        workflowId,
        requesterId,
        actionType,
        payload: payload as any,
        status: 'PENDING',
      },
    });
  }
}

export const workflowRepository = new WorkflowRepository();
