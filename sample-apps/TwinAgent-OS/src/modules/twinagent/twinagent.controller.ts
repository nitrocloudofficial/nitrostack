import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  ResourceDecorator as Resource,
  PromptDecorator as Prompt,
  Cache,
  ExecutionContext,
  z,
} from '@nitrostack/core';
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
import { TaskStatus, TaskPriority } from '@prisma/client';

@Controller()
export class TwinAgentController {
  // ==========================================
  // 15 MCP TOOLS
  // ==========================================

  @Tool({
    name: 'predictProjectRisk',
    description: 'Calculate real-time project risk score, health score, and task completion metrics',
    inputSchema: z.object({
      projectId: z.string().describe('Unique Project UUID'),
    }),
  })
  async predictProjectRisk(input: { projectId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Predicting project risk for project: ${input.projectId}`);
    return projectService.calculateProjectMetrics(input.projectId);
  }

  @Tool({
    name: 'predictBurnout',
    description: 'Scan organization for employee burnout risks, workload imbalances, and delayed project dependencies',
    inputSchema: z.object({
      organizationId: z.string().describe('Unique Organization UUID'),
    }),
  })
  async predictBurnout(input: { organizationId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Scanning burnout risks for org: ${input.organizationId}`);
    return predictionEngineService.runOrganizationScan(input.organizationId);
  }

  @Tool({
    name: 'updateTask',
    description: 'Update status, priority, or risk score of an enterprise task',
    inputSchema: z.object({
      taskId: z.string().describe('Task UUID'),
      userId: z.string().describe('User performing update UUID'),
      status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
      riskScore: z.number().min(0).max(100).optional(),
    }),
  })
  async updateTask(
    input: {
      taskId: string;
      userId: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      riskScore?: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Updating task ${input.taskId} by user ${input.userId}`);
    return taskService.updateTask(input.taskId, input.userId, {
      status: input.status,
      priority: input.priority,
      riskScore: input.riskScore,
    });
  }

  @Tool({
    name: 'searchKnowledge',
    description: 'Perform semantic & keyword search across organizational memory entries and decisions',
    inputSchema: z.object({
      organizationId: z.string().describe('Organization UUID'),
      query: z.string().describe('Search term or topic'),
      category: z.string().optional().describe('Optional memory category filter'),
    }),
  })
  async searchKnowledge(
    input: { organizationId: string; query: string; category?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Searching knowledge base for query: ${input.query}`);
    return memoryService.searchMemory(input.organizationId, input.query, input.category);
  }

  @Tool({
    name: 'organizationHealth',
    description: 'Retrieve real-time executive dashboard metrics including overall digital twin health, burnout index, and velocity',
    inputSchema: z.object({
      organizationId: z.string().describe('Organization UUID'),
    }),
  })
  @Cache({ ttl: 30 })
  async organizationHealth(input: { organizationId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching org dashboard analytics for: ${input.organizationId}`);
    return analyticsService.getDashboardAnalytics(input.organizationId);
  }

  @Tool({
    name: 'summarizeProject',
    description: 'Retrieve comprehensive project details including tasks, milestones, sprints, and assigned team members',
    inputSchema: z.object({
      projectId: z.string().describe('Project UUID'),
    }),
  })
  async summarizeProject(input: { projectId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Summarizing project: ${input.projectId}`);
    return projectService.getProjectById(input.projectId);
  }

  @Tool({
    name: 'recommendAssignee',
    description: 'Recommend optimal task assignee based on current workload capacity and skill availability',
    inputSchema: z.object({
      organizationId: z.string().describe('Organization UUID'),
      requiredSkills: z.array(z.string()).optional(),
    }),
  })
  async recommendAssignee(
    input: { organizationId: string; requiredSkills?: string[] },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Recommending assignee for org: ${input.organizationId}`);
    const users = await userService.getAllUsers(input.organizationId);
    return users.map((u: any) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      currentWorkload: u.currentWorkload,
      capacity: u.weeklyCapacity,
      skills: u.skills.map((s: any) => s.name),
      availabilityPercentage: Math.max(0, 100 - Math.round((u.currentWorkload / u.weeklyCapacity) * 100)),
    }));
  }

  @Tool({
    name: 'findExpert',
    description: 'Find organizational experts by specific skill name and proficiency level',
    inputSchema: z.object({
      organizationId: z.string().describe('Organization UUID'),
      skillName: z.string().describe('Target skill keyword'),
    }),
  })
  async findExpert(input: { organizationId: string; skillName: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Finding experts for skill: ${input.skillName}`);
    const users = await userService.getAllUsers(input.organizationId);
    return users
      .filter((u: any) => u.skills.some((s: any) => s.name.toLowerCase().includes(input.skillName.toLowerCase())))
      .map((u: any) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        skill: u.skills.find((s: any) => s.name.toLowerCase().includes(input.skillName.toLowerCase())),
      }));
  }

  @Tool({
    name: 'runWorkflow',
    description: 'Trigger an automated TwinAgent workflow or approval gate',
    inputSchema: z.object({
      workflowId: z.string().describe('Workflow UUID'),
      requesterId: z.string().describe('User UUID triggering execution'),
      payload: z.record(z.unknown()).optional().describe('Trigger payload context'),
    }),
  })
  async runWorkflow(
    input: { workflowId: string; requesterId: string; payload?: Record<string, unknown> },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Triggering workflow: ${input.workflowId}`);
    return workflowService.executeWorkflow(input.workflowId, input.payload || {}, input.requesterId);
  }

  @Tool({
    name: 'approveAction',
    description: 'Review and approve or reject a pending workflow action gate',
    inputSchema: z.object({
      approvalId: z.string().describe('Approval request UUID'),
      reviewerId: z.string().describe('Reviewer user UUID'),
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().optional().describe('Optional feedback reason'),
    }),
  })
  async approveAction(
    input: { approvalId: string; reviewerId: string; status: 'APPROVED' | 'REJECTED'; reason?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Reviewing approval: ${input.approvalId}`);
    return approvalService.reviewApproval(input.approvalId, input.reviewerId, input.status, input.reason);
  }

  @Tool({
    name: 'syncConnector',
    description: 'Trigger synchronization job for connected enterprise accounts (GitHub, Slack, Jira, Google Workspace)',
    inputSchema: z.object({
      accountId: z.string().describe('Connector account UUID'),
      mode: z.enum(['FULL', 'INCREMENTAL']).optional(),
    }),
  })
  async syncConnector(input: { accountId: string; mode?: 'FULL' | 'INCREMENTAL' }, ctx: ExecutionContext) {
    ctx.logger.info(`Triggering connector sync for account: ${input.accountId}`);
    return integrationsService.triggerSync(input.accountId, input.mode || 'INCREMENTAL');
  }

  @Tool({
    name: 'calculateDigitalTwin',
    description: 'Recalculate multi-dimensional digital twin scores for a target user or project',
    inputSchema: z.object({
      targetType: z.enum(['USER', 'PROJECT']),
      targetId: z.string().describe('User or Project UUID'),
    }),
  })
  async calculateDigitalTwin(input: { targetType: 'USER' | 'PROJECT'; targetId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Calculating digital twin for ${input.targetType}: ${input.targetId}`);
    return input.targetType === 'USER'
      ? digitalTwinService.calculateUserTwin(input.targetId)
      : digitalTwinService.calculateProjectTwin(input.targetId);
  }

  @Tool({
    name: 'getGraph',
    description: 'Retrieve Enterprise Knowledge Graph nodes and relationship edges for an organization',
    inputSchema: z.object({
      organizationId: z.string().describe('Organization UUID'),
    }),
  })
  async getGraph(input: { organizationId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching enterprise graph for org: ${input.organizationId}`);
    return graphService.getGraph(input.organizationId);
  }

  @Tool({
    name: 'globalSearch',
    description: 'Execute global search across tasks, projects, users, and organizational memory',
    inputSchema: z.object({
      organizationId: z.string().describe('Organization UUID'),
      query: z.string().describe('Search term'),
    }),
  })
  async globalSearch(input: { organizationId: string; query: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing global search for: ${input.query}`);
    return searchService.globalSearch(input.organizationId, input.query);
  }

  @Tool({
    name: 'getAuditLogs',
    description: 'Retrieve organization security audit logs for compliance review',
    inputSchema: z.object({
      organizationId: z.string().describe('Organization UUID'),
    }),
  })
  async getAuditLogs(input: { organizationId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching audit logs for org: ${input.organizationId}`);
    return auditService.getAuditLogs(input.organizationId);
  }

  // ==========================================
  // 4 MCP RESOURCES
  // ==========================================

  @Resource({
    uri: 'twinagent://memory/timeline',
    name: 'Organizational Timeline Memory',
    description: 'Historical timeline of enterprise decisions, meetings, and project milestones',
    mimeType: 'application/json',
  })
  async getTimelineMemory(ctx: ExecutionContext) {
    return memoryService.getTimeline('default-org-id');
  }

  @Resource({
    uri: 'twinagent://graph/enterprise',
    name: 'Enterprise Knowledge Graph',
    description: 'Graph structure mapping employees, projects, dependencies, and ownerships',
    mimeType: 'application/json',
  })
  async getEnterpriseGraph(ctx: ExecutionContext) {
    return graphService.getGraph('default-org-id');
  }

  @Resource({
    uri: 'twinagent://analytics/dashboard',
    name: 'Organizational Telemetry Dashboard',
    description: 'Real-time telemetry indicators covering health, burnout index, and project risks',
    mimeType: 'application/json',
  })
  async getAnalyticsDashboard(ctx: ExecutionContext) {
    return analyticsService.getDashboardAnalytics('default-org-id');
  }

  @Resource({
    uri: 'twinagent://system/health',
    name: 'TwinAgent Engine System Health',
    description: 'Runtime health metrics for REST, WebSocket, Redis, and Database services',
    mimeType: 'application/json',
  })
  async getSystemHealth(ctx: ExecutionContext) {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      framework: 'NitroStack v1.0',
      engine: 'TwinAgent OS Backend v1.0.0',
    };
  }

  // ==========================================
  // 3 MCP PROMPTS
  // ==========================================

  @Prompt({
    name: 'summarize_project_risk',
    description: 'Generates an executive risk mitigation briefing for a project based on telemetry scores and dependency bottlenecks',
    arguments: [
      { name: 'projectId', description: 'Unique Project UUID', required: true },
    ],
  })
  async getProjectRiskPrompt(args: { projectId: string }, ctx: ExecutionContext) {
    const pId = args.projectId || 'proj-alpha';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze project risk metrics for Project ID: ${pId}. Use the 'predictProjectRisk' and 'summarizeProject' MCP tools to evaluate delivery confidence, identify blocked dependencies, and provide a 3-step mitigation strategy.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'recommend_workload_rebalance',
    description: 'Generates actionable task rebalancing recommendations for employees experiencing burnout risk',
    arguments: [
      { name: 'organizationId', description: 'Unique Organization UUID', required: true },
    ],
  })
  async getWorkloadRebalancePrompt(args: { organizationId: string }, ctx: ExecutionContext) {
    const orgId = args.organizationId || 'org-101';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Scan organization ID: ${orgId} using 'predictBurnout' and 'recommendAssignee' MCP tools. Identify employees operating at over 120% capacity and suggest optimal task reallocations to prevent burnout.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'query_organizational_memory',
    description: 'Synthesizes past decisions, meeting outcomes, and historical patterns for a specific topic',
    arguments: [
      { name: 'topic', description: 'Topic or decision query keyword', required: true },
    ],
  })
  async getOrgMemoryPrompt(args: { topic: string }, ctx: ExecutionContext) {
    const t = args.topic || 'architecture';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Query enterprise memory for '${t}' using 'searchKnowledge' and 'twinagent://memory/timeline' resource. Synthesize key architectural/strategic decisions and lessons learned.`,
          },
        },
      ],
    };
  }
}
