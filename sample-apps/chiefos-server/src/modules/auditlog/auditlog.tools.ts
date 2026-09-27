import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';

/**
 * Audit Log Tools
 * 
 * Tools for tracking all actions, approvals, and system events
 */
@Injectable()
export class AuditLogTools {
  @Tool({
    name: 'log_action',
    description: 'Log an action or event to the audit trail',
    inputSchema: z.object({
      action: z.string().describe('Action type (e.g., email_triaged, task_created, meeting_scheduled)'),
      actor: z.string().describe('User or system that performed the action'),
      resourceId: z.string().describe('ID of the resource affected'),
      resourceType: z.string().describe('Type of resource (email, task, meeting, etc.)'),
      details: z.record(z.any()).optional().describe('Additional details about the action'),
    }),
  })
  async logAction(
    input: {
      action: string;
      actor: string;
      resourceId: string;
      resourceType: string;
      details?: Record<string, any>;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Logging action', {
      action: input.action,
      actor: input.actor,
      resourceId: input.resourceId,
    });

    const logId = `log_${Date.now()}`;

    return {
      logId,
      action: input.action,
      actor: input.actor,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      details: input.details || {},
      timestamp: new Date().toISOString(),
      status: 'logged',
    };
  }

  @Tool({
    name: 'log_approval',
    description: 'Log an approval decision with reason and approver information',
    inputSchema: z.object({
      resourceId: z.string().describe('ID of the resource being approved'),
      resourceType: z.string().describe('Type of resource'),
      approver: z.string().describe('Email of the approver'),
      decision: z.enum(['approved', 'rejected', 'pending']).describe('Approval decision'),
      reason: z.string().optional().describe('Reason for the decision'),
    }),
  })
  async logApproval(
    input: {
      resourceId: string;
      resourceType: string;
      approver: string;
      decision: 'approved' | 'rejected' | 'pending';
      reason?: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Logging approval', {
      resourceId: input.resourceId,
      decision: input.decision,
      approver: input.approver,
    });

    const approvalId = `appr_${Date.now()}`;

    return {
      approvalId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      approver: input.approver,
      decision: input.decision,
      reason: input.reason || '',
      timestamp: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'get_audit_trail',
    description: 'Retrieve audit trail for a specific resource or time period',
    inputSchema: z.object({
      resourceId: z.string().optional().describe('Filter by resource ID'),
      resourceType: z.string().optional().describe('Filter by resource type'),
      actor: z.string().optional().describe('Filter by actor/user'),
      startDate: z.string().optional().describe('Start date (ISO 8601)'),
      endDate: z.string().optional().describe('End date (ISO 8601)'),
      limit: z.number().optional().describe('Maximum number of records to return (default: 100)'),
    }),
  })
  @Widget({ route: 'audit-trail' })
  async getAuditTrail(
    input: {
      resourceId?: string;
      resourceType?: string;
      actor?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
    context: ExecutionContext
  ) {
    context.logger.info('Retrieving audit trail', {
      resourceId: input.resourceId,
      resourceType: input.resourceType,
    });

    const records = this.generateAuditRecords(input.limit || 100);
    const filtered = records.filter((r) => {
      if (input.resourceId && r.resourceId !== input.resourceId) return false;
      if (input.resourceType && r.resourceType !== input.resourceType) return false;
      if (input.actor && r.actor !== input.actor) return false;
      return true;
    });

    return {
      total: filtered.length,
      records: filtered,
      filters: {
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        actor: input.actor,
      },
    };
  }

  @Tool({
    name: 'get_approval_history',
    description: 'Get approval history for a specific resource',
    inputSchema: z.object({
      resourceId: z.string().describe('Resource ID'),
      resourceType: z.string().optional().describe('Resource type'),
    }),
  })
  async getApprovalHistory(
    input: { resourceId: string; resourceType?: string },
    context: ExecutionContext
  ) {
    context.logger.info('Getting approval history', { resourceId: input.resourceId });

    const approvals = this.generateApprovalRecords(input.resourceId);

    return {
      resourceId: input.resourceId,
      resourceType: input.resourceType || 'unknown',
      totalApprovals: approvals.length,
      approvals,
      currentStatus: approvals.length > 0 ? approvals[approvals.length - 1].decision : 'pending',
      lastUpdated: approvals.length > 0 ? approvals[approvals.length - 1].timestamp : null,
    };
  }

  @Tool({
    name: 'generate_audit_report',
    description: 'Generate a comprehensive audit report for a time period',
    inputSchema: z.object({
      startDate: z.string().describe('Report start date (YYYY-MM-DD)'),
      endDate: z.string().describe('Report end date (YYYY-MM-DD)'),
      groupBy: z.enum(['action', 'actor', 'resourceType']).optional().describe('Group results by field'),
    }),
  })
  async generateAuditReport(
    input: {
      startDate: string;
      endDate: string;
      groupBy?: 'action' | 'actor' | 'resourceType';
    },
    context: ExecutionContext
  ) {
    context.logger.info('Generating audit report', {
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const records = this.generateAuditRecords(500);

    return {
      reportPeriod: {
        start: input.startDate,
        end: input.endDate,
      },
      totalEvents: records.length,
      summary: {
        actionsLogged: records.filter((r) => r.type === 'action').length,
        approvalsLogged: records.filter((r) => r.type === 'approval').length,
        uniqueActors: new Set(records.map((r) => r.actor)).size,
        uniqueResources: new Set(records.map((r) => r.resourceId)).size,
      },
      topActions: this.getTopActions(records),
      topActors: this.getTopActors(records),
    };
  }

  // Helper methods
  private generateAuditRecords(
    count: number
  ): Array<{
    logId: string;
    type: string;
    action: string;
    actor: string;
    resourceId: string;
    resourceType: string;
    timestamp: string;
  }> {
    const actions = [
      'email_triaged',
      'task_created',
      'task_updated',
      'meeting_scheduled',
      'meeting_rescheduled',
      'approval_requested',
      'approval_granted',
    ];
    const actors = ['system@chief-of-staff.ai', 'user@example.com', 'admin@example.com'];
    const resourceTypes = ['email', 'task', 'meeting', 'approval'];

    const records = [];
    for (let i = 0; i < Math.min(count, 50); i++) {
      records.push({
        logId: `log_${i}`,
        type: 'action',
        action: actions[Math.floor(Math.random() * actions.length)],
        actor: actors[Math.floor(Math.random() * actors.length)],
        resourceId: `res_${Math.floor(Math.random() * 100)}`,
        resourceType: resourceTypes[Math.floor(Math.random() * resourceTypes.length)],
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return records;
  }

  private generateApprovalRecords(
    resourceId: string
  ): Array<{ approvalId: string; decision: string; approver: string; timestamp: string; reason: string }> {
    return [
      {
        approvalId: `appr_1`,
        decision: 'pending',
        approver: 'manager@example.com',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        reason: 'Awaiting manager review',
      },
      {
        approvalId: `appr_2`,
        decision: 'approved',
        approver: 'director@example.com',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        reason: 'Approved by director',
      },
    ];
  }

  private getTopActions(
    records: Array<{ action: string }>
  ): Array<{ action: string; count: number }> {
    const actionCounts: Record<string, number> = {};
    for (const record of records) {
      actionCounts[record.action] = (actionCounts[record.action] || 0) + 1;
    }

    return Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getTopActors(
    records: Array<{ actor: string }>
  ): Array<{ actor: string; count: number }> {
    const actorCounts: Record<string, number> = {};
    for (const record of records) {
      actorCounts[record.actor] = (actorCounts[record.actor] || 0) + 1;
    }

    return Object.entries(actorCounts)
      .map(([actor, count]) => ({ actor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}
