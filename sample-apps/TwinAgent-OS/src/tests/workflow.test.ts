import { describe, it, expect } from 'vitest';
import { workflowService } from '../core/workflows/service.js';
import { approvalService } from '../core/approval/service.js';
import { prisma } from '../config/database.js';

describe('Workflow & Approval Engine Test Suite', () => {
  it('should create a workflow and handle approval gate', async () => {
    const org = await prisma.organization.findFirst();
    const user = await prisma.user.findFirst({ where: { organizationId: org?.id } });
    if (!org || !user) return;

    const wf = await workflowService.createWorkflow(org.id, {
      name: 'Test Deployment Workflow',
      triggerConfig: { event: 'PR_MERGED' },
      actionConfig: { action: 'DEPLOY_STAGING' },
      approvalMode: 'MANAGER_APPROVAL',
    });

    expect(wf.id).toBeDefined();

    const result = await workflowService.executeWorkflow(wf.id, { prId: '123' }, user.id);
    expect(result.status).toBe('WAITING_FOR_APPROVAL');
    expect(result.approvalId).toBeDefined();

    const approval = await approvalService.reviewApproval(result.approvalId!, user.id, 'APPROVED');
    expect(approval.status).toBe('APPROVED');
  });
});
