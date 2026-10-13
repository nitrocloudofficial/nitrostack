import { workflowRepository } from './repository.js';
import { ApprovalMode, WorkflowStatus } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { eventBus } from '../../infrastructure/eventBus/index.js';

export class WorkflowService {
  async createWorkflow(organizationId: string, data: {
    name: string;
    description?: string;
    triggerConfig: object;
    conditionConfig?: object;
    actionConfig: object;
    approvalMode?: ApprovalMode;
  }) {
    return workflowRepository.create(organizationId, data);
  }

  async getWorkflows(organizationId: string) {
    return workflowRepository.findAllByOrg(organizationId);
  }

  async executeWorkflow(workflowId: string, payload: Record<string, unknown>, requesterId: string) {
    const workflow = await workflowRepository.findById(workflowId);
    if (!workflow) throw new NotFoundError('Workflow not found');

    const initialLogs = [
      { timestamp: new Date(), step: 'TRIGGER_EVALUATED', message: 'Trigger matched event payload' },
    ];
    const execution = await workflowRepository.createExecution(workflowId, WorkflowStatus.ACTIVE, initialLogs);

    if (workflow.approvalMode !== ApprovalMode.AUTOMATIC) {
      const approval = await workflowRepository.createApprovalRequest(workflowId, requesterId, workflow.name, payload);
      const updatedLogs = [
        ...initialLogs,
        { timestamp: new Date(), step: 'APPROVAL_GATE', message: `Approval required (${workflow.approvalMode})` },
      ];
      await workflowRepository.updateExecution(execution.id, WorkflowStatus.ACTIVE, updatedLogs);

      return { executionId: execution.id, status: 'WAITING_FOR_APPROVAL', approvalId: approval.id };
    }

    const completedLogs = [
      ...initialLogs,
      { timestamp: new Date(), step: 'ACTION_EXECUTED', message: 'Workflow actions completed automatically' },
    ];
    await workflowRepository.updateExecution(execution.id, WorkflowStatus.COMPLETED, completedLogs, new Date());

    eventBus.publish('WorkflowExecuted', { workflowId, executionId: execution.id });
    return { executionId: execution.id, status: 'COMPLETED' };
  }
}

export const workflowService = new WorkflowService();
