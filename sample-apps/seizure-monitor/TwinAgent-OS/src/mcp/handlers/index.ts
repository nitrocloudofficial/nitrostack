import { projectService } from '../../core/projects/service.js';
import { taskService } from '../../core/tasks/service.js';
import { userService } from '../../core/users/service.js';
import { digitalTwinService } from '../../core/digitalTwin/service.js';
import { predictionEngineService } from '../../core/prediction/service.js';
import { memoryService } from '../../core/memory/service.js';
import { graphService } from '../../core/graph/service.js';
import { workflowService } from '../../core/workflows/service.js';
import { approvalService } from '../../core/approval/service.js';
import { integrationsService } from '../../core/integrations/service.js';
import { analyticsService } from '../../core/analytics/service.js';
import { searchService } from '../../core/search/service.js';
import { auditService } from '../../core/audit/service.js';
import { formatMCPResponse, formatMCPError } from '../adapters/index.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as schemas from '../schemas/index.js';

export class MCPHandlers {
  async predictProjectRisk(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.predictProjectRiskSchema.parse(args);
      const metrics = await projectService.calculateProjectMetrics(parsed.projectId);
      return formatMCPResponse(metrics);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async predictBurnout(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.predictBurnoutSchema.parse(args);
      const predictions = await predictionEngineService.runOrganizationScan(parsed.organizationId);
      return formatMCPResponse(predictions);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async updateTask(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.updateTaskSchema.parse(args);
      const updated = await taskService.updateTask(parsed.taskId, parsed.userId, {
        status: parsed.status,
        priority: parsed.priority,
        riskScore: parsed.riskScore,
      });
      return formatMCPResponse(updated);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async searchKnowledge(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.searchKnowledgeSchema.parse(args);
      const memories = await memoryService.searchMemory(parsed.organizationId, parsed.query, parsed.category);
      return formatMCPResponse(memories);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async organizationHealth(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.organizationHealthSchema.parse(args);
      const analytics = await analyticsService.getDashboardAnalytics(parsed.organizationId);
      return formatMCPResponse(analytics);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async summarizeProject(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.summarizeProjectSchema.parse(args);
      const project = await projectService.getProjectById(parsed.projectId);
      return formatMCPResponse(project);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async recommendAssignee(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.recommendAssigneeSchema.parse(args);
      const users = await userService.getAllUsers(parsed.organizationId);
      const formatted = users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        currentWorkload: u.currentWorkload,
        capacity: u.weeklyCapacity,
        skills: u.skills.map((s) => s.name),
        availabilityPercentage: Math.max(0, 100 - Math.round((u.currentWorkload / u.weeklyCapacity) * 100)),
      }));
      return formatMCPResponse(formatted);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async findExpert(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.findExpertSchema.parse(args);
      const users = await userService.getAllUsers(parsed.organizationId);
      const experts = users
        .filter((u) => u.skills.some((s) => s.name.toLowerCase().includes(parsed.skillName.toLowerCase())))
        .map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          skill: u.skills.find((s) => s.name.toLowerCase().includes(parsed.skillName.toLowerCase())),
        }));
      return formatMCPResponse(experts);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async runWorkflow(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.runWorkflowSchema.parse(args);
      const result = await workflowService.executeWorkflow(parsed.workflowId, parsed.payload || {}, parsed.requesterId);
      return formatMCPResponse(result);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async approveAction(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.approveActionSchema.parse(args);
      const updated = await approvalService.reviewApproval(parsed.approvalId, parsed.reviewerId, parsed.status, parsed.reason);
      return formatMCPResponse(updated);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async syncConnector(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.syncConnectorSchema.parse(args);
      const res = await integrationsService.triggerSync(parsed.accountId, parsed.mode || 'INCREMENTAL');
      return formatMCPResponse(res);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async calculateDigitalTwin(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.calculateDigitalTwinSchema.parse(args);
      const scores =
        parsed.targetType === 'USER'
          ? await digitalTwinService.calculateUserTwin(parsed.targetId)
          : await digitalTwinService.calculateProjectTwin(parsed.targetId);
      return formatMCPResponse(scores);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async getGraph(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.getGraphSchema.parse(args);
      const graph = await graphService.getGraph(parsed.organizationId);
      return formatMCPResponse(graph);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async globalSearch(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.globalSearchSchema.parse(args);
      const results = await searchService.globalSearch(parsed.organizationId, parsed.query);
      return formatMCPResponse(results);
    } catch (err) {
      return formatMCPError(err);
    }
  }

  async getAuditLogs(args: unknown): Promise<CallToolResult> {
    try {
      const parsed = schemas.getAuditLogsSchema.parse(args);
      const logs = await auditService.getAuditLogs(parsed.organizationId);
      return formatMCPResponse(logs);
    } catch (err) {
      return formatMCPError(err);
    }
  }
}

export const mcpHandlers = new MCPHandlers();
