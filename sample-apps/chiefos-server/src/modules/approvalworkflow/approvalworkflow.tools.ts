import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';

/**
 * Approval Workflow Tools
 * 
 * Tools for managing human-in-the-loop approval workflows
 */
@Injectable()
export class ApprovalWorkflowTools {
  @Tool({
    name: 'request_approval',
    description: 'Request approval for a resource (email action, task, meeting, etc.)',
    inputSchema: z.object({
      resourceId: z.string().describe('ID of the resource requiring approval'),
      resourceType: z.string().describe('Type of resource (email, task, meeting, etc.)'),
      title: z.string().describe('Brief title of the approval request'),
      description: z.string().describe('Detailed description of what needs approval'),
      approvers: z.array(z.string()).describe('List of approver email addresses'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Priority of the approval request'),
    }),
  })
  async requestApproval(
    input: {
      resourceId: string;
      resourceType: string;
      title: string;
      description: string;
      approvers: string[];
      priority?: 'low' | 'medium' | 'high' | 'critical';
    },
    context: ExecutionContext
  ) {
    context.logger.info('Requesting approval', {
      resourceId: input.resourceId,
      approvers: input.approvers.length,
    });

    const approvalId = `appr_req_${Date.now()}`;

    return {
      approvalId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      title: input.title,
      description: input.description,
      approvers: input.approvers,
      priority: input.priority || 'medium',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  @Tool({
    name: 'get_pending_approvals',
    description: 'Get list of pending approvals for a specific approver or all approvers',
    inputSchema: z.object({
      approver: z.string().optional().describe('Filter by approver email'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by priority'),
      resourceType: z.string().optional().describe('Filter by resource type'),
    }),
  })
  @Widget({ route: 'approval-pending' })
  async getPendingApprovals(
    input: {
      approver?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      resourceType?: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Getting pending approvals', { approver: input.approver });

    const approvals = this.generatePendingApprovals();
    const filtered = approvals.filter((a) => {
      if (input.approver && !a.approvers.includes(input.approver)) return false;
      if (input.priority && a.priority !== input.priority) return false;
      if (input.resourceType && a.resourceType !== input.resourceType) return false;
      return true;
    });

    return {
      total: filtered.length,
      approvals: filtered,
      byPriority: {
        critical: filtered.filter((a) => a.priority === 'critical').length,
        high: filtered.filter((a) => a.priority === 'high').length,
        medium: filtered.filter((a) => a.priority === 'medium').length,
        low: filtered.filter((a) => a.priority === 'low').length,
      },
      oldestPending: filtered.length > 0 ? filtered[0] : null,
    };
  }

  @Tool({
    name: 'approve_request',
    description: 'Approve a pending approval request',
    inputSchema: z.object({
      approvalId: z.string().describe('ID of the approval request'),
      approver: z.string().describe('Email of the approver'),
      decision: z.enum(['approved', 'rejected']).describe('Approval decision'),
      comments: z.string().optional().describe('Comments from the approver'),
    }),
  })
  async approveRequest(
    input: {
      approvalId: string;
      approver: string;
      decision: 'approved' | 'rejected';
      comments?: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Processing approval', {
      approvalId: input.approvalId,
      decision: input.decision,
      approver: input.approver,
    });

    return {
      approvalId: input.approvalId,
      approver: input.approver,
      decision: input.decision,
      comments: input.comments || '',
      processedAt: new Date().toISOString(),
      status: 'processed',
    };
  }

  @Tool({
    name: 'get_approval_status',
    description: 'Get the current status of an approval request',
    inputSchema: z.object({
      approvalId: z.string().describe('ID of the approval request'),
    }),
  })
  async getApprovalStatus(
    input: { approvalId: string },
    context: ExecutionContext
  ) {
    context.logger.info('Getting approval status', { approvalId: input.approvalId });

    const approval = this.generateApprovalDetail(input.approvalId);

    return {
      approvalId: input.approvalId,
      status: approval.status,
      resourceId: approval.resourceId,
      resourceType: approval.resourceType,
      title: approval.title,
      approvers: approval.approvers,
      responses: approval.responses,
      createdAt: approval.createdAt,
      expiresAt: approval.expiresAt,
      isExpired: new Date(approval.expiresAt) < new Date(),
    };
  }

  @Tool({
    name: 'escalate_approval',
    description: 'Escalate an approval request to higher-level approvers',
    inputSchema: z.object({
      approvalId: z.string().describe('ID of the approval request'),
      reason: z.string().describe('Reason for escalation'),
      escalateTo: z.array(z.string()).describe('Email addresses of escalation approvers'),
    }),
  })
  async escalateApproval(
    input: {
      approvalId: string;
      reason: string;
      escalateTo: string[];
    },
    context: ExecutionContext
  ) {
    context.logger.info('Escalating approval', {
      approvalId: input.approvalId,
      escalateTo: input.escalateTo.length,
    });

    return {
      approvalId: input.approvalId,
      reason: input.reason,
      escalatedTo: input.escalateTo,
      escalatedAt: new Date().toISOString(),
      status: 'escalated',
    };
  }

  @Tool({
    name: 'get_approval_metrics',
    description: 'Get metrics on approval workflow performance',
    inputSchema: z.object({
      timeframe: z.enum(['day', 'week', 'month']).optional().describe('Timeframe for metrics'),
    }),
  })
  async getApprovalMetrics(
    input: { timeframe?: 'day' | 'week' | 'month' },
    context: ExecutionContext
  ) {
    context.logger.info('Getting approval metrics', { timeframe: input.timeframe });

    const timeframe = input.timeframe || 'week';

    return {
      timeframe,
      totalRequests: 42,
      approved: 35,
      rejected: 5,
      pending: 2,
      averageTimeToApprove: '2.5 hours',
      approvalRate: '87.5%',
      topApprovers: [
        { name: 'manager@example.com', count: 15 },
        { name: 'director@example.com', count: 12 },
        { name: 'admin@example.com', count: 8 },
      ],
      byResourceType: {
        email: 20,
        task: 15,
        meeting: 5,
        other: 2,
      },
    };
  }

  // Helper methods
  private generatePendingApprovals(): Array<{
    approvalId: string;
    resourceId: string;
    resourceType: string;
    title: string;
    priority: string;
    approvers: string[];
    createdAt: string;
  }> {
    return [
      {
        approvalId: 'appr_1',
        resourceId: 'email_123',
        resourceType: 'email',
        title: 'Urgent email action required',
        priority: 'high',
        approvers: ['manager@example.com'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        approvalId: 'appr_2',
        resourceId: 'task_456',
        resourceType: 'task',
        title: 'Critical task creation',
        priority: 'critical',
        approvers: ['director@example.com', 'admin@example.com'],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        approvalId: 'appr_3',
        resourceId: 'meeting_789',
        resourceType: 'meeting',
        title: 'Large meeting scheduling',
        priority: 'medium',
        approvers: ['manager@example.com'],
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ];
  }

  private generateApprovalDetail(approvalId: string): {
    approvalId: string;
    status: string;
    resourceId: string;
    resourceType: string;
    title: string;
    approvers: string[];
    responses: Array<{ approver: string; decision: string; timestamp: string }>;
    createdAt: string;
    expiresAt: string;
  } {
    return {
      approvalId,
      status: 'pending',
      resourceId: 'res_123',
      resourceType: 'task',
      title: 'Critical task approval',
      approvers: ['manager@example.com', 'director@example.com'],
      responses: [
        {
          approver: 'manager@example.com',
          decision: 'approved',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}
