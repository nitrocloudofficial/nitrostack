import { ControllerDecorator as Controller, ExecutionContext, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { FactoryConfigService } from './factory-config.service.js';
import { ManagerAgent } from './manager.agent.js';
import { approvalDecisionSchema } from './manager.schemas.js';

@Controller('manager')
export class ManagerTools {
  constructor(
    private readonly agent: ManagerAgent,
    private readonly database: DatabaseService,
    private readonly config: FactoryConfigService,
  ) {}

  @Tool({
    name: 'list_approval_requests',
    description: 'List Manager approval requests, optionally filtered by status.',
    inputSchema: z.object({ status: z.enum(['Pending', 'Approved', 'Rejected', 'Changes Requested']).optional() }),
  })
  @Widget('manager-approval')
  async listApprovalRequests(input: { status?: string }) {
    return this.database.listApprovalRequests(input.status);
  }

  @Tool({
    name: 'get_approval_request',
    description: 'Get a single durable Manager approval request for review in the Approval Panel.',
    inputSchema: z.object({ approvalId: z.string() }),
  })
  @Widget('manager-approval')
  async getApprovalRequest(input: { approvalId: string }) {
    const approval = this.database.findApprovalRequest(input.approvalId);
    if (!approval) throw new Error(`Unknown approval request: ${input.approvalId}`);
    return approval;
  }

  @Tool({
    name: 'decide_manager_approval',
    description: 'Approve, reject, or request changes for a pending Manager approval request.',
    inputSchema: approvalDecisionSchema,
  })
  @Widget('manager-approval')
  async decideApproval(input: z.infer<typeof approvalDecisionSchema>, ctx: ExecutionContext) {
    const result = await this.agent.decideApproval(input);
    ctx.logger.info(`Approval ${input.approvalId}: ${input.action} by ${input.decidedBy}`);
    return result;
  }

  @Tool({
    name: 'list_manager_workflows',
    description: 'List Manager workflows and their current waiting, approval, replanning, or notification state.',
    inputSchema: z.object({}),
  })
  async listWorkflows() {
    return this.agent.listWorkflows();
  }

  @Tool({
    name: 'list_audit_logs',
    description: 'List explainability and decision audit logs, optionally for one workflow.',
    inputSchema: z.object({ workflowId: z.string().optional() }),
  })
  async listAuditLogs(input: { workflowId?: string }) {
    return this.database.listAuditLogs(input.workflowId);
  }

  @Tool({
    name: 'get_factory_configuration',
    description: 'Read the downtime-cost and purchase-approval policy used by the Manager Agent.',
    inputSchema: z.object({}),
  })
  async getFactoryConfiguration() {
    return this.config.get();
  }
}
